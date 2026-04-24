const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

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
    // mainWindow.webContents.openDevTools();

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
