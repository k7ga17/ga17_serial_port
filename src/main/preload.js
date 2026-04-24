const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    // 布局控制按钮点击事件
    sendLayoutToggle: (buttonId) => ipcRenderer.send('layout-toggle', buttonId),
    // 串口相关 API
    serial: {
        list: () => ipcRenderer.invoke('serial-list'),
        open: (options) => ipcRenderer.invoke('serial-open', options),
        close: () => ipcRenderer.invoke('serial-close'),
        write: (data) => ipcRenderer.invoke('serial-write', data),
        onData: (callback) => {
            ipcRenderer.on('serial-data', (event, data) => callback(data));
        },
        onStatus: (callback) => {
            ipcRenderer.on('serial-status', (event, status) => callback(status));
        },
        removeListeners: () => {
            ipcRenderer.removeAllListeners('serial-data');
            ipcRenderer.removeAllListeners('serial-status');
        }
    }
});
