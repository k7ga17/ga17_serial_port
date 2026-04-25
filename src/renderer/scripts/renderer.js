// 渲染进程脚本
document.addEventListener('DOMContentLoaded', () => {
    // ============ 面板元素 ============
    const sidebar = document.getElementById('sidebar');
    const auxBar = document.getElementById('auxBar');
    const panel = document.getElementById('panel');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const togglePanelBtn = document.getElementById('togglePanelBtn');
    const toggleAuxBarBtn = document.getElementById('toggleAuxBarBtn');
    const activityIcons = document.querySelectorAll('.activity-icon');

    // ============ 活动栏交互 ============
    let currentView = 'explorer';
    let isSidebarVisible = false;

    activityIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const viewName = icon.dataset.view;

            // 如果点击的是当前激活的视图，则切换侧边栏显示/隐藏
            if (currentView === viewName && isSidebarVisible) {
                sidebar.classList.remove('visible');
                isSidebarVisible = false;
                // 收起时移除选中效果
                activityIcons.forEach(i => i.classList.remove('active'));
                // 同步按钮状态
                syncButtonState(toggleSidebarBtn, sidebar, false);
                return;
            }

            // 更新激活状态
            activityIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            // 切换视图内容
            document.querySelectorAll('.sidebar-view').forEach(view => {
                view.classList.remove('active');
            });
            const targetView = document.getElementById('view-' + viewName);
            if (targetView) {
                targetView.classList.add('active');
            }

            // 显示侧边栏
            sidebar.classList.add('visible');
            isSidebarVisible = true;
            currentView = viewName;
            // 同步按钮状态
            syncButtonState(toggleSidebarBtn, sidebar, true);
        });
    });

    // ============ 布局控制按钮 ============
    // 同步按钮状态与面板显示状态
    function syncButtonState(btn, panel, isVisible) {
        if (isVisible) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    // 确保元素存在后再绑定事件
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('visible');
                syncButtonState(toggleSidebarBtn, sidebar, sidebar.classList.contains('visible'));
            }
        });
    }

    if (togglePanelBtn) {
        togglePanelBtn.addEventListener('click', () => {
            if (panel) {
                panel.classList.toggle('visible');
                syncButtonState(togglePanelBtn, panel, panel.classList.contains('visible'));
            }
        });
    }

    if (toggleAuxBarBtn) {
        toggleAuxBarBtn.addEventListener('click', () => {
            if (auxBar) {
                auxBar.classList.toggle('visible');
                syncButtonState(toggleAuxBarBtn, auxBar, auxBar.classList.contains('visible'));
            }
        });
    }

    // ============ 键盘快捷键（支持 Ctrl 和 Cmd） ============
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + B - 切换左侧边栏
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.altKey) {
            e.preventDefault();
            if (toggleSidebarBtn) toggleSidebarBtn.click();
        }
        // Ctrl/Cmd + J - 切换底部面板
        if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
            e.preventDefault();
            if (togglePanelBtn) togglePanelBtn.click();
        }
        // Ctrl/Cmd + Alt + B - 切换右侧边栏
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'b') {
            e.preventDefault();
            if (toggleAuxBarBtn) toggleAuxBarBtn.click();
        }
    });

    // ============ 窗口控制 ============
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    const maximizeIcon = document.getElementById('maximizeIcon');
    const restoreIcon = document.getElementById('restoreIcon');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimize();
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', async () => {
            window.electronAPI.maximize();
            setTimeout(updateMaximizeIcon, 100);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.close();
        });
    }

    function updateMaximizeIcon() {
        window.electronAPI.isMaximized().then((isMax) => {
            if (isMax) {
                maximizeIcon.classList.add('hidden');
                restoreIcon.classList.remove('hidden');
                maximizeBtn.title = '还原';
            } else {
                maximizeIcon.classList.remove('hidden');
                restoreIcon.classList.add('hidden');
                maximizeBtn.title = '最大化';
            }
        });
    }

    updateMaximizeIcon();
    window.addEventListener('resize', updateMaximizeIcon);

    // ============ 标题栏拖动 ============
    const titleBar = document.getElementById('titleBar');

    if (titleBar) {
        titleBar.addEventListener('dblclick', (e) => {
            if (e.target === titleBar || e.target.classList.contains('titleText')) {
                window.electronAPI.maximize();
                setTimeout(updateMaximizeIcon, 100);
            }
        });
    }

    // ============ 串口配置功能 ============
    const portSelect = document.getElementById('serial-port');
    const baudRateSelect = document.getElementById('baud-rate-select');
    const dataBitsSelect = document.getElementById('data-bits');
    const stopBitsSelect = document.getElementById('stop-bits');
    const paritySelect = document.getElementById('parity');
    const flowControlSelect = document.getElementById('flow-control');
    const refreshPortsBtn = document.getElementById('refresh-ports-btn');
    const connectBtn = document.getElementById('connect-btn');

    // 终端相关元素
    const terminalOutput = document.getElementById('terminal-output');
    const serialInput = document.getElementById('serial-input');
    const sendBtn = document.getElementById('send-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');

    let isConnected = false;

    // 获取当前波特率值
    function getBaudRate() {
        return baudRateSelect.value;
    }

    // 刷新串口列表
    async function refreshPorts() {
        try {
            const ports = await window.electronAPI.serial.list();
            portSelect.innerHTML = '<option value="">Select Port...</option>';
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = port.path;
                portSelect.appendChild(option);
            });
            updateConnectButton();
        } catch (error) {
            console.error('Failed to refresh ports:', error);
        }
    }

    // 更新连接按钮状态
    function updateConnectButton() {
        const connectIcon = document.getElementById('connect-icon');
        const connectText = document.getElementById('connect-text');

        if (isConnected) {
            connectIcon.src = './assets/func_serial_port/icon_port_connect.svg';
            connectText.textContent = 'Disconnect';
            connectBtn.classList.add('connected');
            connectBtn.disabled = false;
        } else {
            connectIcon.src = './assets/func_serial_port/icon_port_disconnect.svg';
            connectText.textContent = 'Connect';
            connectBtn.classList.remove('connected');
            connectBtn.disabled = !portSelect.value;
        }
    }

    // 连接/断开串口
    async function toggleConnection() {
        if (isConnected) {
            // 断开连接
            try {
                await window.electronAPI.serial.close();
                isConnected = false;
                updateConnectButton();
                // 禁用配置选项
                setConfigDisabled(false);
            } catch (error) {
                console.error('Failed to close port:', error);
            }
        } else {
            // 建立连接
            const port = portSelect.value;
            if (!port) return;

            try {
                const result = await window.electronAPI.serial.open({
                    path: port,
                    baudRate: getBaudRate(),
                    dataBits: dataBitsSelect.value,
                    stopBits: stopBitsSelect.value,
                    parity: paritySelect.value,
                    flowControl: flowControlSelect.value
                });

                if (result.success) {
                    isConnected = true;
                    updateConnectButton();
                    // 禁用配置选项
                    setConfigDisabled(true);
                    // 显示连接成功消息
                    const port = portSelect.value;
                    const baud = getBaudRate();
                    appendToTerminal(`Connected to ${port} @ ${baud} baud`, 'system');
                }
            } catch (error) {
                console.error('Failed to open port:', error);
            }
        }
    }

    // 设置配置选项禁用状态
    function setConfigDisabled(disabled) {
        baudRateSelect.disabled = disabled;
        dataBitsSelect.disabled = disabled;
        stopBitsSelect.disabled = disabled;
        paritySelect.disabled = disabled;
        flowControlSelect.disabled = disabled;
    }

    // ANSI 颜色代码映射
    const ansiColors = {
        '30': '#858585', // 黑色
        '31': '#f14c4c', // 红色
        '32': '#4ec94e', // 绿色
        '33': '#cca700', // 黄色
        '34': '#569cd6', // 蓝色
        '35': '#c586c0', // 紫红色
        '36': '#4ec9b0', // 青色
        '37': '#cccccc', // 白色
        '90': '#6a9955', // 亮黑色
        '91': '#f14c4c', // 亮红色
        '92': '#4ec94e', // 亮绿色
        '93': '#cca700', // 亮黄色
        '94': '#569cd6', // 亮蓝色
        '95': '#c586c0', // 亮紫红色
        '96': '#4ec9b0', // 亮青色
        '97': '#ffffff', // 亮白色
    };

    // 解析 ANSI 转义码并返回 HTML
    function parseAnsi(text) {
        let result = '';
        let currentColor = '#cccccc';
        let i = 0;
        let buffer = '';

        while (i < text.length) {
            // 检查是否是 ANSI 转义序列
            if (text[i] === '\x1b' || text[i] === '\033') {
                // 先把缓冲区内容输出
                if (buffer) {
                    result += `<span style="color:${currentColor}">${buffer}</span>`;
                    buffer = '';
                }

                // 检查是否是 [ 开头
                if (text[i + 1] === '[') {
                    i += 2;
                    // 收集数字
                    let codes = '';
                    while (i < text.length && (text[i] >= '0' && text[i] <= '9' || text[i] === ';')) {
                        codes += text[i];
                        i++;
                    }

                    // 处理代码
                    const codeList = codes.split(';').filter(c => c !== '');
                    for (const code of codeList) {
                        if (code === '0' || code === '') {
                            currentColor = '#cccccc';
                        } else if (ansiColors[code]) {
                            currentColor = ansiColors[code];
                        } else if (code === '1') {
                            // 粗体，继续保持颜色
                        }
                    }

                    // 跳过最后一个字符（通常是 m）
                    if (text[i] === 'm') i++;
                } else {
                    i++;
                }
            } else {
                buffer += text[i];
                i++;
            }
        }

        // 输出剩余缓冲区
        if (buffer) {
            result += `<span style="color:${currentColor}">${buffer}</span>`;
        }

        return result;
    }

    // 添加数据到终端
    function appendToTerminal(data, type = 'received') {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const div = document.createElement('div');
        div.className = `data-${type}`;

        // 解析 ANSI 颜色
        let content = parseAnsi(data);

        div.innerHTML = `<span class="timestamp">[${timestamp}]</span>${content}`;
        terminalOutput.appendChild(div);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    // HTML 转义
    function escapeHtml(text) {
        if (typeof text !== 'string') text = String(text);
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/ /g, '&nbsp;');
    }

    // 清空终端
    function clearTerminal() {
        terminalOutput.innerHTML = '';
    }

    // 发送数据
    async function sendData() {
        const data = serialInput.value;
        if (!data || !isConnected) return;

        try {
            await window.electronAPI.serial.write(data);
            appendToTerminal(data, 'sent');
            serialInput.value = '';
        } catch (error) {
            console.error('Failed to send data:', error);
        }
    }

    // 监听串口数据
    window.electronAPI.serial.onData((data) => {
        // 获取 HEX 显示模式
        const hexToggle = document.getElementById('hex-display-toggle');
        const isHexMode = hexToggle && hexToggle.checked;

        if (isHexMode) {
            // 16进制模式：将字符串转换为 16 进制显示
            const bytes = [];
            for (let i = 0; i < data.length; i++) {
                bytes.push(data.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0'));
            }
            appendToTerminal(bytes.join(' '), 'received');
        } else {
            // 文本模式：直接显示
            appendToTerminal(data, 'received');
        }
    });

    // 监听串口状态
    window.electronAPI.serial.onStatus((status) => {
        console.log('Serial status:', status);
        if (status.type === 'disconnected') {
            isConnected = false;
            updateConnectButton();
            setConfigDisabled(false);
            appendToTerminal('Port disconnected', 'system');
        } else if (status.type === 'error') {
            appendToTerminal(`Error: ${status.message}`, 'system');
        }
    });

    // 绑定事件
    if (refreshPortsBtn) {
        refreshPortsBtn.addEventListener('click', refreshPorts);
    }

    if (portSelect) {
        portSelect.addEventListener('change', updateConnectButton);
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', toggleConnection);
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendData);
    }

    if (serialInput) {
        serialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendData();
            }
        });
    }

    if (clearTerminalBtn) {
        clearTerminalBtn.addEventListener('click', clearTerminal);
    }

    // 初始加载串口列表
    refreshPorts();
});
