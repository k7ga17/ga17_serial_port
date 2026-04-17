const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser, DelimiterParser } = require('@serialport/parser-readline');

let mainWindow;
let serialPort = null;
let parser = null;
let isOpening = false;
let dataBuffer = Buffer.alloc(0);
let flushTimer = null;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载 HTML 文件
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 开发者工具
  // mainWindow.webContents.openDevTools();

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+B', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-left-sidebar');
    }
  });

  globalShortcut.register('CommandOrControl+Alt+B', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-right-sidebar');
    }
  });

  mainWindow.on('closed', () => {
    globalShortcut.unregisterAll();
    mainWindow = null;
  });
}

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

// 获取串口列表
ipcMain.handle('serial-list', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || '未知',
      serialNumber: port.serialNumber || '',
      vendorId: port.vendorId || '',
      productId: port.productId || ''
    }));
  } catch (err) {
    console.error('获取串口列表失败:', err);
    return [];
  }
});

// 连接串口
ipcMain.handle('serial-connect', async (event, options) => {
  if (isOpening) {
    throw new Error('串口正在连接中，请稍候...');
  }

  // 先关闭已有的串口连接
  if (serialPort) {
    try {
      if (serialPort.isOpen) {
        await new Promise((resolve, reject) => {
          serialPort.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } catch (err) {
      console.error('关闭旧串口失败:', err);
    }
    serialPort = null;
    parser = null;
  }

  isOpening = true;
  try {
    serialPort = new SerialPort({
      path: options.path,
      baudRate: parseInt(options.baudRate) || 9600,
      dataBits: parseInt(options.dataBits) || 8,
      stopBits: parseInt(options.stopBits) || 1,
      parity: options.parity || 'none',
      autoOpen: false
    });

    // 移除 ReadlineParser，使用原始流直接读取所有数据
    // parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    return new Promise((resolve, reject) => {
      serialPort.open((err) => {
        isOpening = false;
        if (err) {
          reject(err.message);
          return;
        }

        // 直接监听串口数据，累加到 buffer 并延迟发送
        serialPort.on('data', (chunk) => {
          dataBuffer = Buffer.concat([dataBuffer, chunk]);
          
          // 清除之前的定时器
          if (flushTimer) {
            clearTimeout(flushTimer);
          }
          
          // 设置新的定时器，50ms 后再发送（等待数据完整）
          flushTimer = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed() && dataBuffer.length > 0) {
              const hex = dataBuffer.toString('hex').toUpperCase();
              const hexArray = hex.match(/.{2}/g).join(' ');
              mainWindow.webContents.send('serial-data', hexArray);
            }
            dataBuffer = Buffer.alloc(0);
            flushTimer = null;
          }, 50);
        });

        serialPort.on('error', (err) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-error', err.message);
          }
        });

        serialPort.on('close', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-error', '串口已断开');
          }
        });

        resolve({ success: true, path: options.path });
      });
    });
  } catch (err) {
    isOpening = false;
    console.error('连接串口失败:', err);
    throw err.message;
  }
});

// 断开串口
ipcMain.handle('serial-disconnect', async () => {
  // 清除待发送的定时器和缓冲区
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  dataBuffer = Buffer.alloc(0);

  try {
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve, reject) => {
        serialPort.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    serialPort = null;
    parser = null;
    return { success: true };
  } catch (err) {
    console.error('断开串口失败:', err);
    throw err.message;
  }
});

// 发送数据
ipcMain.handle('serial-send', async (event, data) => {
  try {
    if (!serialPort || !serialPort.isOpen) {
      throw new Error('串口未连接');
    }
    await new Promise((resolve, reject) => {
      serialPort.write(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return { success: true };
  } catch (err) {
    console.error('发送数据失败:', err);
    throw err.message;
  }
});

// 检查串口连接状态
ipcMain.handle('serial-is-connected', () => {
  return serialPort && serialPort.isOpen;
});