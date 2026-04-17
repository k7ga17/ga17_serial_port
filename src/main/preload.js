const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // 监听窗口最大化状态变化
  onMaximizeChange: (callback) => {
    ipcRenderer.on('maximize-change', (event, isMaximized) => callback(isMaximized));
  },

  // 监听全局快捷键事件
  onToggleLeftSidebar: (callback) => {
    ipcRenderer.on('toggle-left-sidebar', () => callback());
  },
  onToggleRightSidebar: (callback) => {
    ipcRenderer.on('toggle-right-sidebar', () => callback());
  },

  // 串口操作
  serial: {
    list: () => ipcRenderer.invoke('serial-list'),
    connect: (options) => ipcRenderer.invoke('serial-connect', options),
    disconnect: () => ipcRenderer.invoke('serial-disconnect'),
    send: (data) => ipcRenderer.invoke('serial-send', data),
    isConnected: () => ipcRenderer.invoke('serial-is-connected'),
    onData: (callback) => {
      ipcRenderer.on('serial-data', (event, data) => callback(data));
    },
    onError: (callback) => {
      ipcRenderer.on('serial-error', (event, error) => callback(error));
    }
  }
});