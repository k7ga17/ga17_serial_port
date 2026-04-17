// 渲染进程脚本 - 三栏布局
document.addEventListener('DOMContentLoaded', () => {
  // ============ 本地存储键 ============
  const STORAGE_KEY = 'serial-monitor-settings';

  // ============ 状态管理 ============
  let isConnected = false;
  let isLeftSidebarVisible = true;
  let isRightSidebarVisible = true;
  let currentLeftPanel = 'serial';
  let autoScroll = true;

  // 默认宽度
  const DEFAULT_LEFT_WIDTH = 240;
  const DEFAULT_RIGHT_WIDTH = 260;
  const MIN_WIDTH = DEFAULT_LEFT_WIDTH / 3; // 80px，自动隐藏阈值

  // 从本地存储加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
    return {};
  }

  // 保存设置到本地存储
  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('保存设置失败:', e);
    }
  }

  const settings = loadSettings();
  // 如果是被自动隐藏的，恢复默认宽度；否则使用保存的宽度
  let leftWidth = settings.leftWidthAutoHidden ? DEFAULT_LEFT_WIDTH : (settings.leftWidth || DEFAULT_LEFT_WIDTH);
  let rightWidth = settings.rightWidth || DEFAULT_RIGHT_WIDTH;

  // 拖动状态
  let isResizingLeft = false;
  let isResizingRight = false;

  // ============ DOM 元素 ============
  const minimizeBtn = document.getElementById('minimizeBtn');
  const maximizeBtn = document.getElementById('maximizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  const connectBtn = document.getElementById('connectBtn');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const saveBtn = document.getElementById('saveBtn');
  const refreshSerialBtn = document.getElementById('refreshSerialBtn');
  const closeRightSidebarBtn = document.getElementById('closeRightSidebarBtn');

  const portSelect = document.getElementById('portSelect');
  const dataArea = document.getElementById('dataArea');
  const sendInput = document.getElementById('sendInput');

  const sidebarLeft = document.getElementById('sidebarLeft');
  const sidebarRight = document.getElementById('sidebarRight');

  // ============ 窗口控制 ============
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      window.electronAPI.minimize();
    });
  }

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      window.electronAPI.maximize();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.electronAPI.close();
    });
  }

  // 更新最大化按钮图标
  async function updateMaximizeButton() {
    if (window.electronAPI) {
      const isMax = await window.electronAPI.isMaximized();
      if (isMax) {
        maximizeBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="3" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        `;
      } else {
        maximizeBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        `;
      }
    }
  }

  updateMaximizeButton();

  // ============ 活动栏切换 ============
  const activityIcons = document.querySelectorAll('.activity-icon');
  const sidebarPanels = document.querySelectorAll('.sidebar-panel');

  activityIcons.forEach(icon => {
    icon.addEventListener('click', () => {
      const panelId = icon.dataset.panel + 'Panel';
      
      // 如果点击当前面板，切换侧边栏显示/隐藏
      if (icon.classList.contains('active') && icon.dataset.panel === currentLeftPanel) {
        toggleLeftSidebar();
        return;
      }
      
      // 确保侧边栏显示
      if (!isLeftSidebarVisible) {
        sidebarLeft.classList.remove('collapsed');
        isLeftSidebarVisible = true;
      }
      
      // 切换活动图标
      activityIcons.forEach(i => i.classList.remove('active'));
      icon.classList.add('active');

      // 切换侧边栏面板
      sidebarPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === panelId) {
          panel.classList.add('active');
        }
      });

      currentLeftPanel = icon.dataset.panel;
    });
  });

  // ============ 侧边栏控制 ============
  const editorArea = document.getElementById('editorArea');
  
  function toggleLeftSidebar() {
    if (isLeftSidebarVisible) {
      sidebarLeft.classList.add('collapsed');
      sidebarLeft.style.width = activityBarWidth + 'px';
      isLeftSidebarVisible = false;
      editorArea.style.left = activityBarWidth + 'px';
      // 保存当前展开的宽度，收起后保持该宽度
      saveSettings({ leftWidth: leftWidth, rightWidth: rightWidth, leftWidthAutoHidden: false });
    } else {
      sidebarLeft.classList.remove('collapsed');
      // 使用之前保存的宽度
      sidebarLeft.style.width = leftWidth + 'px';
      isLeftSidebarVisible = true;
      editorArea.style.left = (activityBarWidth + leftWidth) + 'px';
      updateHandlePositions();
    }
  }

  function toggleRightSidebar() {
    if (isRightSidebarVisible) {
      sidebarRight.classList.add('collapsed');
      sidebarRight.style.width = '0px';
      isRightSidebarVisible = false;
      editorArea.style.right = '0px';
      rightWidth = 0;
      saveSettings({ leftWidth: leftWidth, rightWidth: rightWidth });
    } else {
      sidebarRight.classList.remove('collapsed');
      rightWidth = DEFAULT_RIGHT_WIDTH;
      sidebarRight.style.width = rightWidth + 'px';
      isRightSidebarVisible = true;
      editorArea.style.right = rightWidth + 'px';
      updateHandlePositions();
      saveSettings({ leftWidth: leftWidth, rightWidth: rightWidth });
    }
  }

  // 关闭右侧边栏按钮
  if (closeRightSidebarBtn) {
    closeRightSidebarBtn.addEventListener('click', () => {
      toggleRightSidebar();
    });
  }

  // ============ 拖动调整大小 ============
  const mainContainer = document.getElementById('mainContainer');
  const activityBarWidth = 48;

  // 左侧边栏拖动条
  const leftResizeHandle = document.createElement('div');
  leftResizeHandle.className = 'resize-handle resize-handle-left';
  mainContainer.appendChild(leftResizeHandle);

  // 右侧边栏拖动条
  const rightResizeHandle = document.createElement('div');
  rightResizeHandle.className = 'resize-handle resize-handle-right';
  mainContainer.appendChild(rightResizeHandle);

  function updateHandlePositions() {
    const containerWidth = mainContainer.offsetWidth;
    leftResizeHandle.style.left = (leftWidth - 2) + 'px';
    leftResizeHandle.style.height = '100%';
    leftResizeHandle.style.width = '4px';
    // 右侧拖动条在中间区域的右边缘
    rightResizeHandle.style.left = (containerWidth - rightWidth - 2) + 'px';
    rightResizeHandle.style.height = '100%';
    rightResizeHandle.style.width = '4px';
  }

  function initHandlePositions() {
    leftResizeHandle.style.top = '0';
    leftResizeHandle.style.position = 'absolute';
    leftResizeHandle.style.zIndex = '100';
    leftResizeHandle.style.background = 'transparent';
    leftResizeHandle.style.cursor = 'ew-resize';
    
    rightResizeHandle.style.top = '0';
    rightResizeHandle.style.position = 'absolute';
    rightResizeHandle.style.zIndex = '100';
    rightResizeHandle.style.background = 'transparent';
    rightResizeHandle.style.cursor = 'ew-resize';
    
    updateHandlePositions();
  }

  initHandlePositions();

  document.addEventListener('mousemove', (e) => {
    const containerRect = mainContainer.getBoundingClientRect();
    const containerWidth = mainContainer.offsetWidth;
    const mouseX = e.clientX;
    
    // 检测左侧拖动区域（扩大范围）
    if (!sidebarLeft.classList.contains('collapsed')) {
      if (mouseX >= leftWidth - 8 && mouseX <= leftWidth + 8) {
        leftResizeHandle.style.background = 'rgba(0, 122, 204, 0.5)';
        mainContainer.style.cursor = 'ew-resize';
      } else if (!isResizingLeft) {
        leftResizeHandle.style.background = 'transparent';
      }
    }
    
    // 检测右侧拖动区域（扩大范围，并考虑右侧边栏可能被隐藏的情况）
    const canResizeRight = !sidebarRight.classList.contains('collapsed');
    const rightEdge = containerWidth - rightWidth;
    
    if (canResizeRight) {
      if (mouseX >= rightEdge - 8 && mouseX <= rightEdge + 8) {
        rightResizeHandle.style.background = 'rgba(0, 122, 204, 0.5)';
        mainContainer.style.cursor = 'ew-resize';
      } else if (!isResizingRight) {
        rightResizeHandle.style.background = 'transparent';
      }
    }
    
    // 执行拖动
    if (isResizingLeft) {
      const newWidth = e.clientX - containerRect.left;
      if (newWidth < MIN_WIDTH) {
        // 拖动到阈值以下，自动隐藏
        // 保存MIN_WIDTH作为展开时的宽度，下次打开默认展开
        leftWidth = MIN_WIDTH;
        sidebarLeft.classList.add('collapsed');
        isLeftSidebarVisible = false;
        editorArea.style.left = activityBarWidth + 'px';
        saveSettings({ leftWidth: MIN_WIDTH, rightWidth: rightWidth, leftWidthAutoHidden: true });
        isResizingLeft = false;
        leftResizeHandle.style.background = 'transparent';
        mainContainer.style.cursor = '';
        document.body.style.userSelect = '';
      } else {
        leftWidth = newWidth;
        sidebarLeft.style.width = newWidth + 'px';
        editorArea.style.left = (activityBarWidth + newWidth) + 'px';
        leftResizeHandle.style.left = (newWidth - 2) + 'px';
      }
    }
    
    if (isResizingRight) {
      const newWidth = containerWidth - e.clientX + containerRect.left;
      if (newWidth < minWidth) {
        // 自动收起
        rightWidth = 0;
        sidebarRight.classList.add('collapsed');
        isRightSidebarVisible = false;
        editorArea.style.right = '0px';
        saveSettings({ leftWidth: leftWidth, rightWidth: 0 });
        isResizingRight = false;
        rightResizeHandle.style.background = 'transparent';
        mainContainer.style.cursor = '';
        document.body.style.userSelect = '';
      } else {
        rightWidth = newWidth;
        sidebarRight.style.width = newWidth + 'px';
        editorArea.style.right = newWidth + 'px';
        rightResizeHandle.style.left = (containerWidth - newWidth - 2) + 'px';
      }
    }
  });

  // 拖动开始
  leftResizeHandle.addEventListener('mousedown', (e) => {
    isResizingLeft = true;
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  rightResizeHandle.addEventListener('mousedown', (e) => {
    isResizingRight = true;
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  // 拖动结束 - 保存宽度
  document.addEventListener('mouseup', () => {
    if (isResizingLeft) {
      isResizingLeft = false;
      leftResizeHandle.style.background = 'transparent';
      mainContainer.style.cursor = '';
      saveSettings({ leftWidth: leftWidth, rightWidth: rightWidth });
    }
    if (isResizingRight) {
      isResizingRight = false;
      rightResizeHandle.style.background = 'transparent';
      mainContainer.style.cursor = '';
      saveSettings({ leftWidth: leftWidth, rightWidth: rightWidth });
    }
    document.body.style.userSelect = '';
  });

  window.addEventListener('resize', updateHandlePositions);

  // ============ 监听主进程全局快捷键 ============
  if (window.electronAPI) {
    window.electronAPI.onToggleLeftSidebar(() => {
      toggleLeftSidebar();
    });
    
    window.electronAPI.onToggleRightSidebar(() => {
      toggleRightSidebar();
    });
  }

  // ============ 串口功能 ============
  
  // 刷新串口列表
  async function refreshSerialPorts() {
    addConsoleLog('正在刷新串口列表...');
    try {
      const ports = await window.electronAPI.serial.list();
      portSelect.innerHTML = '<option value="">选择串口...</option>';
      if (ports.length === 0) {
        addConsoleLog('未检测到串口设备');
      } else {
        ports.forEach(port => {
          const option = document.createElement('option');
          option.value = port.path;
          option.textContent = `${port.path} ${port.manufacturer ? '(' + port.manufacturer + ')' : ''}`;
          portSelect.appendChild(option);
        });
        addConsoleLog(`已发现 ${ports.length} 个串口设备`);
      }
    } catch (err) {
      addConsoleLog('刷新串口列表失败: ' + err);
    }
  }

  // 页面加载时自动刷新串口列表
  (async () => {
    try {
      const ports = await window.electronAPI.serial.list();
      portSelect.innerHTML = '<option value="">选择串口...</option>';
      ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent = `${port.path} ${port.manufacturer ? '(' + port.manufacturer + ')' : ''}`;
        portSelect.appendChild(option);
      });
      if (ports.length > 0) {
        addConsoleLog(`已加载 ${ports.length} 个串口设备`);
      }
    } catch (err) {
      addConsoleLog('加载串口列表失败');
    }
  })();

  // 监听串口数据
  if (window.electronAPI && window.electronAPI.serial) {
    window.electronAPI.serial.onData((data) => {
      addDataLine(data, 'receive');
    });
    window.electronAPI.serial.onError((error) => {
      addDataLine('错误: ' + error, 'error');
      addConsoleLog('串口错误: ' + error);
    });
  }

  // 刷新按钮
  if (refreshSerialBtn) {
    refreshSerialBtn.addEventListener('click', refreshSerialPorts);
  }

  // 连接/断开串口
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      if (!isConnected) {
        const port = portSelect.value;
        if (!port) {
          addDataLine('请选择串口', 'error');
          return;
        }
        await connectSerial();
      } else {
        await disconnectSerial();
      }
    });
  }

  // 发送数据
  if (sendBtn) {
    sendBtn.addEventListener('click', sendData);
    sendInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        sendData();
      }
    });
  }

  // 清空数据
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      dataArea.innerHTML = '';
      const placeholder = document.createElement('div');
      placeholder.className = 'data-placeholder';
      placeholder.innerHTML = '<span>等待接收数据...</span>';
      dataArea.appendChild(placeholder);
    });
  }

  // 保存数据
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const content = dataArea.innerText;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serial_log_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      addConsoleLog('数据已保存');
    });
  }

  // 自动滚动复选框
  const autoScrollCheckbox = document.getElementById('autoScrollMain') || document.getElementById('autoScroll');
  if (autoScrollCheckbox) {
    autoScrollCheckbox.addEventListener('change', () => {
      autoScroll = autoScrollCheckbox.checked;
    });
  }

  // 常用命令按钮
  document.querySelectorAll('.quick-command-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (sendInput) {
        sendInput.value = cmd;
        sendInput.focus();
      }
    });
  });

  // ============ 串口操作函数 ============
  async function connectSerial() {
    const port = portSelect.value;
    const baudRate = document.getElementById('baudSelect').value;
    const dataBits = document.getElementById('dataBitsSelect').value;
    const stopBits = document.getElementById('stopBitsSelect').value;
    const parity = document.getElementById('paritySelect').value;

    addConsoleLog(`正在连接 ${port} @ ${baudRate}...`);
    
    try {
      await window.electronAPI.serial.connect({
        path: port,
        baudRate: baudRate,
        dataBits: dataBits,
        stopBits: stopBits,
        parity: parity
      });

      isConnected = true;
      updateConnectButton();
      updateStatusBar();
      addConsoleLog(`已连接到 ${port}`);
    } catch (err) {
      addDataLine('连接失败: ' + err, 'error');
      addConsoleLog('连接失败: ' + err);
    }
  }

  async function disconnectSerial() {
    try {
      await window.electronAPI.serial.disconnect();
      isConnected = false;
      updateConnectButton();
      updateStatusBar();
      addConsoleLog('已断开串口连接');
    } catch (err) {
      addConsoleLog('断开连接失败: ' + err);
    }
  }

  async function sendData() {
    if (!isConnected) {
      addDataLine('请先连接串口', 'error');
      return;
    }
    let text = sendInput.value.trim();
    if (!text) return;

    const newlineSelect = document.getElementById('newlineSelect');
    const newlineType = document.getElementById('newlineType');
    if (newlineSelect && newlineSelect.checked) {
      if (newlineType.value === 'rn') text += '\r\n';
      else if (newlineType.value === 'n') text += '\n';
      else if (newlineType.value === 'r') text += '\r';
    }

    try {
      await window.electronAPI.serial.send(text);
      addDataLine(text, 'send');
      sendInput.value = '';
      addConsoleLog(`已发送: ${text}`);
    } catch (err) {
      addDataLine('发送失败: ' + err, 'error');
      addConsoleLog('发送失败: ' + err);
    }
  }

  function updateConnectButton() {
    if (connectBtn) {
      connectBtn.textContent = isConnected ? '断开连接' : '连接串口';
      if (isConnected) {
        connectBtn.classList.add('connected');
      } else {
        connectBtn.classList.remove('connected');
      }
    }
    
    // 更新右侧边栏的连接状态
    const statusDot = document.querySelector('.status-dot');
    const connStatusText = document.getElementById('connStatusText');
    
    if (statusDot) {
      statusDot.className = 'status-dot ' + (isConnected ? 'connected' : 'disconnected');
    }
    if (connStatusText) {
      connStatusText.textContent = isConnected ? '已连接' : '未连接';
    }
  }

  function updateStatusBar() {
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
      statusMessage.textContent = isConnected ? `已连接 ${portSelect.value}` : '就绪';
    }
  }

  // ============ 数据展示函数 ============
  function addDataLine(text, type = 'receive') {
    // 移除占位符
    const placeholder = dataArea.querySelector('.data-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    const line = document.createElement('div');
    line.className = 'data-line';
    
    const timestampMain = document.getElementById('timestampMain') || document.getElementById('timestamp');
    if (timestampMain && timestampMain.checked) {
      const time = document.createElement('span');
      time.className = 'data-time';
      time.textContent = getTimestamp();
      line.appendChild(time);
    }

    const content = document.createElement('span');
    content.className = 'data-' + type;
    content.textContent = text;
    line.appendChild(content);

    dataArea.appendChild(line);
    
    if (autoScroll) {
      dataArea.scrollTop = dataArea.scrollHeight;
    }
  }

  function addConsoleLog(text) {
    console.log(text);
  }

  function getTimestamp() {
    const now = new Date();
    return `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
  }

  // ============ 初始化 ============
  // 判断是否收起（当leftWidthAutoHidden为true时，使用默认宽度，侧边栏展开）
  const leftCollapsed = leftWidth <= activityBarWidth;
  const rightCollapsed = rightWidth <= 0;
  
  if (leftCollapsed) {
    sidebarLeft.classList.add('collapsed');
    isLeftSidebarVisible = false;
  } else {
    isLeftSidebarVisible = true;
  }
  
  if (rightCollapsed) {
    sidebarRight.classList.add('collapsed');
    isRightSidebarVisible = false;
  } else {
    isRightSidebarVisible = true;
  }
  
  // 应用保存的宽度
  sidebarLeft.style.width = (leftCollapsed ? activityBarWidth : leftWidth) + 'px';
  sidebarRight.style.width = (rightCollapsed ? 0 : rightWidth) + 'px';
  
  // 设置中间编辑区的初始位置
  editorArea.style.left = (activityBarWidth + (leftCollapsed ? 0 : leftWidth)) + 'px';
  editorArea.style.right = (rightCollapsed ? 0 : rightWidth) + 'px';
  
  updateHandlePositions();
  
  updateConnectButton();
});
