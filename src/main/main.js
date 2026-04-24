const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const iconv = require('iconv-lite');

let mainWindow;
let serialPort = null;
let isSerialConnected = false;

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,        // 窗口默认尺寸
        height: 900,
        minWidth: 800,      // 窗口最小尺寸
        minHeight: 600,
        frame: false,       // 无系统原生窗口边框
        backgroundColor: '#1e1e1e', // 窗口背景色
        webPreferences: {
            nodeIntegration: false, // 渲染进程禁用 Node.js 访问
            contextIsolation: true, // 启用上下文隔离，保护应用安全
            preload: path.join(__dirname, 'preload.js') // 	 加载 preload.js，安全暴露 API
        }
    });

    // 加载 HTML 文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 开发者工具
    mainWindow.webContents.openDevTools();

    // 窗口关闭时，将 mainWindow 置为 null，释放内存
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/*---------------------------------------------------*/
// 应用准备就绪
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 窗口关闭
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { // 非 macOS 系统关闭所有窗口后退出应用；macOS 通常保留应用在后台运行
        app.quit();
    }
});

/*---------------------------------------------------*/
// 最小化窗口
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

// 最大化/还原窗口
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// 关闭窗口
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// 获取窗口状态
ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

// 布局控制按钮点击事件
ipcMain.on('layout-toggle', (event, buttonId) => {
    console.log(`Layout toggle: ${buttonId}`);
    // 这里可以添加布局切换的逻辑
});

/*---------------------------------------------------*/
// 串口相关 IPC 处理

// 获取可用串口列表
ipcMain.handle('serial-list', async () => {
    try {
        const ports = await SerialPort.list();
        return ports.map(port => ({
            path: port.path,
            manufacturer: port.manufacturer || 'Unknown',
            serialNumber: port.serialNumber || '',
            vendorId: port.vendorId || '',
            productId: port.productId || ''
        }));
    } catch (error) {
        console.error('Error listing serial ports:', error);
        return [];
    }
});

// 打开串口
ipcMain.handle('serial-open', async (event, options) => {
    try {
        // 如果已打开，先关闭
        if (serialPort && isSerialConnected) {
            await new Promise((resolve) => {
                serialPort.close(resolve);
            });
        }

        const { path: portPath, baudRate, dataBits, stopBits, parity, flowControl } = options;

        serialPort = new SerialPort({
            path: portPath,
            baudRate: parseInt(baudRate),
            dataBits: parseInt(dataBits),
            stopBits: parseFloat(stopBits),
            parity: parity,
            rtscts: flowControl === 'hardware'
        });

        return new Promise((resolve, reject) => {
            serialPort.on('open', () => {
                isSerialConnected = true;
                console.log(`Serial port ${portPath} opened successfully`);

                // 监听数据接收
                serialPort.on('data', (data) => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        // 将 GBK 编码转换为 UTF-8
                        const decoded = iconv.decode(data, 'gbk');
                        mainWindow.webContents.send('serial-data', decoded);
                    }
                });

                // 监听错误
                serialPort.on('error', (err) => {
                    console.error('Serial port error:', err);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('serial-status', {
                            type: 'error',
                            message: err.message
                        });
                    }
                });

                // 监听关闭
                serialPort.on('close', () => {
                    isSerialConnected = false;
                    console.log('Serial port closed');
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('serial-status', {
                            type: 'disconnected',
                            message: 'Port closed'
                        });
                    }
                });

                resolve({ success: true });
            });

            serialPort.on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        console.error('Error opening serial port:', error);
        return { success: false, error: error.message };
    }
});

// 关闭串口
ipcMain.handle('serial-close', async () => {
    try {
        if (serialPort) {
            await new Promise((resolve, reject) => {
                serialPort.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            serialPort = null;
            isSerialConnected = false;
        }
        return { success: true };
    } catch (error) {
        console.error('Error closing serial port:', error);
        return { success: false, error: error.message };
    }
});

// 发送数据
ipcMain.handle('serial-write', async (event, data) => {
    try {
        if (serialPort && isSerialConnected) {
            return new Promise((resolve, reject) => {
                // 如果是字符串，转换为 GBK 编码的 Buffer
                const buffer = typeof data === 'string' ? iconv.encode(data, 'gbk') : data;
                serialPort.write(buffer, (err) => {
                    if (err) reject(err);
                    else resolve({ success: true });
                });
            });
        }
        return { success: false, error: 'Port not connected' };
    } catch (error) {
        console.error('Error writing to serial port:', error);
        return { success: false, error: error.message };
    }
});

// 获取连接状态
ipcMain.handle('serial-status', () => {
    return { connected: isSerialConnected };
});
