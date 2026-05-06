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
                hideSidebar();
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

            // 先更新 currentView，再显示侧边栏
            currentView = viewName;
            showSidebar();
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

    if (togglePanelBtn) {
        togglePanelBtn.addEventListener('click', () => {
            if (panel) {
                if (panel.classList.contains('visible')) {
                    hidePanel();
                } else {
                    showPanel();
                }
            }
        });
    }

    // ============ 底部面板拖动调整 ============
    let isPanelResizing = false;
    let panelStartY = 0;
    let panelStartHeight = 0;
    let panelSavedHeight = 200; // 保存用户调整后的高度
    const panelDefaultHeight = 200; // 默认高度
    const panelMinThreshold = 80; // 触发隐藏的阈值
    let panelWasAutoHidden = false; // 是否因拖动过小而自动隐藏
    let panelShowTimer = null; // 延时显示蓝色条的计时器
    let isLocked = false; // 是否被锁定
    let lockTimer = null; // 锁定计时器
    let lockStartY = 0; // 锁定时的鼠标Y位置

    function hidePanel(isAuto = false) {
        panel.classList.remove('visible');
        panel.classList.remove('resizing');
        panel.style.height = '';
        if (togglePanelBtn) {
            togglePanelBtn.classList.remove('active');
        }
        if (isAuto) {
            panelWasAutoHidden = true;
            panelSavedHeight = panelDefaultHeight;
        } else {
            panelWasAutoHidden = false;
        }
    }

    function showPanel() {
        panel.classList.add('visible');
        panel.style.height = panelSavedHeight + 'px';
        if (togglePanelBtn) {
            togglePanelBtn.classList.add('active');
        }
        // 如果是从拖动过小自动隐藏后打开，立即显示蓝色条
        if (panelWasAutoHidden) {
            panel.classList.add('resizing');
        }
    }

    panel.addEventListener('mousedown', (e) => {
        if (!panel.classList.contains('visible')) return;
        const rect = panel.getBoundingClientRect();
        const edgeThreshold = 8;
        // 底部面板在上边界拖动，所以检测上边缘（鼠标到面板顶部的距离）
        if (e.clientY - rect.top > edgeThreshold) return;
        isPanelResizing = true;
        isAnyPanelResizing = true;
        panel.classList.add('resizing');
        panelStartY = e.clientY;
        panelStartHeight = panel.offsetHeight;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        // 拖动期间隐藏终端滚动条
        if (terminalOutput) {
            terminalOutput.classList.add('no-scrollbar');
            terminalOutput.classList.add('no-pointer');
        }
        // 清除延时计时器
        if (panelShowTimer) {
            clearTimeout(panelShowTimer);
            panelShowTimer = null;
        }
        // 阻止事件冒泡，防止编辑器区域干扰
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPanelResizing) {
            // 未开始拖动时，可以显示光标变化和蓝色条
            if (panel.classList.contains('visible')) {
                const rect = panel.getBoundingClientRect();
                // 检测上边缘（鼠标到面板顶部的距离）
                const distToTop = e.clientY - rect.top;
                if (distToTop <= 8 && distToTop >= 0) {
                    panel.style.cursor = 'row-resize';
                    // 延时700ms后显示蓝色条
                    if (!panelShowTimer) {
                        panelShowTimer = setTimeout(() => {
                            if (panel.classList.contains('visible')) {
                                const rect = panel.getBoundingClientRect();
                                const distToTop = e.clientY - rect.top;
                                if (distToTop <= 8 && distToTop >= 0) {
                                    panel.classList.add('resizing');
                                }
                            }
                            panelShowTimer = null;
                        }, 700);
                    }
                } else {
                    panel.style.cursor = '';
                    panel.classList.remove('resizing');
                    // 清除延时计时器
                    if (panelShowTimer) {
                        clearTimeout(panelShowTimer);
                        panelShowTimer = null;
                    }
                }
            }
            return;
        }

        // 开始拖动后，不再检查边缘，直接计算高度
        // 如果被锁定，只能向上移动解锁
        if (isLocked) {
            if (e.clientY < lockStartY) {
                isLocked = false;
                lockStartY = 0;
                if (lockTimer) {
                    clearTimeout(lockTimer);
                    lockTimer = null;
                }
                panelStartY = e.clientY;
                panelStartHeight = panel.offsetHeight;
            }
            return;
        }

        const deltaY = panelStartY - e.clientY;
        let newHeight = panelStartHeight + deltaY;
        newHeight = Math.max(0, Math.min(newHeight, window.innerHeight - 100));
        panel.style.height = newHeight + 'px';

        // 到达阈值时锁定
        if (newHeight < panelMinThreshold) {
            isLocked = true;
            lockStartY = e.clientY;
            panel.style.height = panelMinThreshold + 'px';

            lockTimer = setTimeout(() => {
                if (isLocked) {
                    hidePanel(true);
                    isPanelResizing = false;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    if (terminalOutput) {
                        terminalOutput.classList.remove('no-scrollbar');
                        terminalOutput.classList.remove('no-pointer');
                    }
                    isLocked = false;
                    lockStartY = 0;
                    lockTimer = null;
                }
            }, 500);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isPanelResizing) {
            isPanelResizing = false;
            isAnyPanelResizing = false;
            panel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            // 恢复终端滚动条
            if (terminalOutput) {
                terminalOutput.classList.remove('no-scrollbar');
                terminalOutput.classList.remove('no-pointer');
            }

            if (isLocked) {
                isLocked = false;
                lockStartY = 0;
                if (lockTimer) {
                    clearTimeout(lockTimer);
                    lockTimer = null;
                }
                // 如果锁定计时器触发前 mouseup，先移除滚动条限制
                if (terminalOutput) {
                    terminalOutput.classList.remove('no-scrollbar');
                    terminalOutput.classList.remove('no-pointer');
                }
            }

            const currentHeight = panel.offsetHeight;
            if (currentHeight >= panelMinThreshold) {
                panelSavedHeight = currentHeight;
                panelWasAutoHidden = false;
            }
        }
        // 清除延时显示计时器
        if (panelShowTimer) {
            clearTimeout(panelShowTimer);
            panelShowTimer = null;
        }
    });

    // ============ 左侧边栏拖动调整 ============
    let isSidebarResizing = false;
    let sidebarStartX = 0;
    let sidebarStartWidth = 0;
    let sidebarSavedWidth = 250; // 保存用户调整后的宽度
    const sidebarDefaultWidth = 250; // 默认宽度
    const sidebarMinThreshold = 80; // 触发隐藏的阈值
    let sidebarWasAutoHidden = false; // 是否因拖动过窄而自动隐藏

    function hideSidebar(isAuto = false) {
        sidebar.classList.remove('visible');
        sidebar.style.width = '';
        if (toggleSidebarBtn) {
            toggleSidebarBtn.classList.remove('active');
        }
        if (isAuto) {
            sidebarWasAutoHidden = true;
            sidebarSavedWidth = sidebarDefaultWidth;
        } else {
            sidebarWasAutoHidden = false;
        }
        // 取消活动栏选中状态
        activityIcons.forEach(i => i.classList.remove('active'));
        isSidebarVisible = false;
    }

    function showSidebar() {
        sidebar.classList.add('visible');
        sidebar.style.width = sidebarSavedWidth + 'px';
        if (toggleSidebarBtn) {
            toggleSidebarBtn.classList.add('active');
        }
        // 激活对应的活动栏图标
        activityIcons.forEach(i => {
            if (i.dataset.view === currentView) {
                i.classList.add('active');
            }
        });
        isSidebarVisible = true;
    }

    if (sidebar) {
        let sidebarIsLocked = false;
        let sidebarLockTimer = null;
        let sidebarLockStartX = 0;
        let sidebarShowTimer = null; // 延时显示蓝色条的计时器

        sidebar.addEventListener('mousedown', (e) => {
            if (!sidebar.classList.contains('visible')) return;
            const rect = sidebar.getBoundingClientRect();
            const edgeThreshold = 8;
            if (rect.right - e.clientX > edgeThreshold) return;
            isSidebarResizing = true;
            isAnyPanelResizing = true;
            sidebar.classList.add('resizing');
            sidebarStartX = e.clientX;
            sidebarStartWidth = sidebar.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            // 拖动期间隐藏终端滚动条
            if (terminalOutput) {
                terminalOutput.classList.add('no-scrollbar');
                terminalOutput.classList.add('no-pointer');
            }
            // 清除延时计时器
            if (sidebarShowTimer) {
                clearTimeout(sidebarShowTimer);
                sidebarShowTimer = null;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isSidebarResizing) {
                if (sidebar.classList.contains('visible')) {
                    const rect = sidebar.getBoundingClientRect();
                    if (rect.right - e.clientX <= 8 && rect.right - e.clientX >= 0) {
                        sidebar.style.cursor = 'col-resize';
                        // 延时700ms后显示蓝色条
                        if (!sidebarShowTimer) {
                            sidebarShowTimer = setTimeout(() => {
                                if (sidebar.classList.contains('visible')) {
                                    const rect = sidebar.getBoundingClientRect();
                                    if (rect.right - e.clientX <= 8 && rect.right - e.clientX >= 0) {
                                        sidebar.classList.add('resizing');
                                    }
                                }
                                sidebarShowTimer = null;
                            }, 700);
                        }
                    } else {
                        sidebar.style.cursor = '';
                        sidebar.classList.remove('resizing');
                        // 清除延时计时器
                        if (sidebarShowTimer) {
                            clearTimeout(sidebarShowTimer);
                            sidebarShowTimer = null;
                        }
                    }
                }
                return;
            }

            if (sidebarIsLocked) {
                if (e.clientX > sidebarLockStartX) {
                    sidebarIsLocked = false;
                    sidebarLockStartX = 0;
                    if (sidebarLockTimer) {
                        clearTimeout(sidebarLockTimer);
                        sidebarLockTimer = null;
                    }
                    sidebarStartX = e.clientX;
                    sidebarStartWidth = sidebar.offsetWidth;
                }
                return;
            }

            const deltaX = e.clientX - sidebarStartX;
            let newWidth = sidebarStartWidth + deltaX;
            newWidth = Math.max(0, Math.min(newWidth, 500));
            sidebar.style.width = newWidth + 'px';

            if (newWidth < sidebarMinThreshold) {
                sidebarIsLocked = true;
                sidebarLockStartX = e.clientX;
                sidebar.style.width = sidebarMinThreshold + 'px';

                sidebarLockTimer = setTimeout(() => {
                    if (sidebarIsLocked) {
                        hideSidebar(true);
                        isSidebarResizing = false;
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        if (terminalOutput) {
                            terminalOutput.classList.remove('no-scrollbar');
                            terminalOutput.classList.remove('no-pointer');
                        }
                        sidebarIsLocked = false;
                        sidebarLockStartX = 0;
                        sidebarLockTimer = null;
                    }
                }, 500);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isSidebarResizing) {
                isSidebarResizing = false;
                isAnyPanelResizing = false;
                sidebar.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // 恢复终端滚动条
                if (terminalOutput) {
                    terminalOutput.classList.remove('no-scrollbar');
                    terminalOutput.classList.remove('no-pointer');
                }

                if (sidebarIsLocked) {
                    sidebarIsLocked = false;
                    sidebarLockStartX = 0;
                    if (sidebarLockTimer) {
                        clearTimeout(sidebarLockTimer);
                        sidebarLockTimer = null;
                    }
                    // 如果锁定计时器触发前 mouseup，先移除滚动条限制
                    if (terminalOutput) {
                        terminalOutput.classList.remove('no-scrollbar');
                        terminalOutput.classList.remove('no-pointer');
                    }
                }

                const currentWidth = sidebar.offsetWidth;
                if (currentWidth >= sidebarMinThreshold) {
                    sidebarSavedWidth = currentWidth;
                    sidebarWasAutoHidden = false;
                }
            }
            // 清除延时显示计时器
            if (sidebarShowTimer) {
                clearTimeout(sidebarShowTimer);
                sidebarShowTimer = null;
            }
        });
    }

    // 同步侧边栏按钮与显示状态
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            if (sidebar) {
                const wasVisible = sidebar.classList.contains('visible');
                if (wasVisible) {
                    hideSidebar();
                } else {
                    showSidebar();
                }
            }
        });
    }

    // ============ 右侧边栏拖动调整 ============
    let isAuxBarResizing = false;
    let auxBarStartX = 0;
    let auxBarStartWidth = 0;
    let auxBarSavedWidth = 250; // 保存用户调整后的宽度
    const auxBarDefaultWidth = 250; // 默认宽度
    const auxBarMinThreshold = 80; // 触发隐藏的阈值
    let auxBarWasAutoHidden = false; // 是否因拖动过窄而自动隐藏

    function hideAuxBar(isAuto = false) {
        auxBar.classList.remove('visible');
        auxBar.style.width = '';
        if (toggleAuxBarBtn) {
            toggleAuxBarBtn.classList.remove('active');
        }
        if (isAuto) {
            auxBarWasAutoHidden = true;
            auxBarSavedWidth = auxBarDefaultWidth;
        } else {
            auxBarWasAutoHidden = false;
        }
        isAuxBarVisible = false;
    }

    function showAuxBar() {
        auxBar.classList.add('visible');
        auxBar.style.width = auxBarSavedWidth + 'px';
        if (toggleAuxBarBtn) {
            toggleAuxBarBtn.classList.add('active');
        }
        isAuxBarVisible = true;
    }

    let isAuxBarVisible = false;

    if (auxBar) {
        let auxBarIsLocked = false;
        let auxBarLockTimer = null;
        let auxBarLockStartX = 0;
        let auxBarShowTimer = null; // 延时显示蓝色条的计时器

        auxBar.addEventListener('mousedown', (e) => {
            if (!auxBar.classList.contains('visible')) return;
            const rect = auxBar.getBoundingClientRect();
            const edgeThreshold = 8;
            // 右侧边栏在左边界拖动，所以检测左侧边缘
            if (e.clientX - rect.left > edgeThreshold) return;
            isAuxBarResizing = true;
            isAnyPanelResizing = true;
            auxBar.classList.add('resizing');
            auxBarStartX = e.clientX;
            auxBarStartWidth = auxBar.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            // 拖动期间隐藏终端滚动条
            if (terminalOutput) {
                terminalOutput.classList.add('no-scrollbar');
                terminalOutput.classList.add('no-pointer');
            }
            // 清除延时计时器
            if (auxBarShowTimer) {
                clearTimeout(auxBarShowTimer);
                auxBarShowTimer = null;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isAuxBarResizing) {
                if (auxBar.classList.contains('visible')) {
                    const rect = auxBar.getBoundingClientRect();
                    // 检测左边缘
                    if (e.clientX - rect.left <= 8 && e.clientX - rect.left >= 0) {
                        auxBar.style.cursor = 'col-resize';
                        // 延时700ms后显示蓝色条
                        if (!auxBarShowTimer) {
                            auxBarShowTimer = setTimeout(() => {
                                if (auxBar.classList.contains('visible')) {
                                    const rect = auxBar.getBoundingClientRect();
                                    if (e.clientX - rect.left <= 8 && e.clientX - rect.left >= 0) {
                                        auxBar.classList.add('resizing');
                                    }
                                }
                                auxBarShowTimer = null;
                            }, 700);
                        }
                    } else {
                        auxBar.style.cursor = '';
                        auxBar.classList.remove('resizing');
                        // 清除延时计时器
                        if (auxBarShowTimer) {
                            clearTimeout(auxBarShowTimer);
                            auxBarShowTimer = null;
                        }
                    }
                }
                return;
            }

            if (auxBarIsLocked) {
                if (e.clientX < auxBarLockStartX) {
                    auxBarIsLocked = false;
                    auxBarLockStartX = 0;
                    if (auxBarLockTimer) {
                        clearTimeout(auxBarLockTimer);
                        auxBarLockTimer = null;
                    }
                    auxBarStartX = e.clientX;
                    auxBarStartWidth = auxBar.offsetWidth;
                }
                return;
            }

            // 右侧边栏宽度随鼠标向右移动而减小，向左移动而增大
            const deltaX = auxBarStartX - e.clientX;
            let newWidth = auxBarStartWidth + deltaX;
            newWidth = Math.max(0, Math.min(newWidth, 500));
            auxBar.style.width = newWidth + 'px';

            if (newWidth < auxBarMinThreshold) {
                auxBarIsLocked = true;
                auxBarLockStartX = e.clientX;
                auxBar.style.width = auxBarMinThreshold + 'px';

                auxBarLockTimer = setTimeout(() => {
                    if (auxBarIsLocked) {
                        hideAuxBar(true);
                        isAuxBarResizing = false;
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        if (terminalOutput) {
                            terminalOutput.classList.remove('no-scrollbar');
                            terminalOutput.classList.remove('no-pointer');
                        }
                        auxBarIsLocked = false;
                        auxBarLockStartX = 0;
                        auxBarLockTimer = null;
                    }
                }, 500);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isAuxBarResizing) {
                isAuxBarResizing = false;
                isAnyPanelResizing = false;
                auxBar.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // 恢复终端滚动条
                if (terminalOutput) {
                    terminalOutput.classList.remove('no-scrollbar');
                    terminalOutput.classList.remove('no-pointer');
                }

                if (auxBarIsLocked) {
                    auxBarIsLocked = false;
                    auxBarLockStartX = 0;
                    if (auxBarLockTimer) {
                        clearTimeout(auxBarLockTimer);
                        auxBarLockTimer = null;
                    }
                    // 如果锁定计时器触发前 mouseup，先移除滚动条限制
                    if (terminalOutput) {
                        terminalOutput.classList.remove('no-scrollbar');
                        terminalOutput.classList.remove('no-pointer');
                    }
                }

                const currentWidth = auxBar.offsetWidth;
                if (currentWidth >= auxBarMinThreshold) {
                    auxBarSavedWidth = currentWidth;
                    auxBarWasAutoHidden = false;
                }
            }
            // 清除延时显示计时器
            if (auxBarShowTimer) {
                clearTimeout(auxBarShowTimer);
                auxBarShowTimer = null;
            }
        });
    }

    if (toggleAuxBarBtn) {
        toggleAuxBarBtn.addEventListener('click', () => {
            if (auxBar) {
                const wasVisible = auxBar.classList.contains('visible');
                if (wasVisible) {
                    hideAuxBar();
                } else {
                    showAuxBar();
                }
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
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');
    const terminalOutput = document.getElementById('terminal-output');
    const xtermContainer = document.getElementById('xterm-container');

    let isConnected = false;

    // ============ xterm.js 终端初始化 ============
    let terminal = null;
    let fitAddon = null;
    let isXtermReady = false;

    function initTerminal() {
        // 检查 xterm.js 是否已加载
        if (typeof Terminal === 'undefined') {
            console.error('xterm.js not loaded');
            xtermContainer.innerHTML = '<div style="color: #f44747; padding: 20px;">Error: xterm.js not loaded. Please run "npm install".</div>';
            return;
        }

        if (!xtermContainer) {
            console.error('xterm container not found');
            return;
        }

        try {
            // 创建终端实例
            terminal = new Terminal({
                cursorBlink: true,
                cursorStyle: 'block',
                fontSize: 14,
                fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
                fontWeight: '400',
                fontWeightBold: '700',
                lineHeight: 1.2,
                letterSpacing: 0,
                scrollback: 10000,
                theme: {
                    background: '#1e1e1e',
                    foreground: '#d4d4d4',
                    cursor: '#ffffff',
                    cursorAccent: '#1e1e1e',
                    selection: {
                        background: '#264f78'
                    },
                    selectionBackground: '#264f78',
                    black: '#1e1e1e',
                    red: '#f44747',
                    green: '#6a9955',
                    yellow: '#dcdcaa',
                    blue: '#569cd6',
                    magenta: '#c586c0',
                    cyan: '#4ec9b0',
                    white: '#d4d4d4',
                    brightBlack: '#808080',
                    brightRed: '#f44747',
                    brightGreen: '#6a9955',
                    brightYellow: '#dcdcaa',
                    brightBlue: '#569cd6',
                    brightMagenta: '#c586c0',
                    brightCyan: '#4ec9b0',
                    brightWhite: '#ffffff'
                },
                allowProposedApi: true
            });

            // 添加 FitAddon - 自动调整终端大小
            if (typeof FitAddon !== 'undefined') {
                fitAddon = new FitAddon.FitAddon();
                terminal.loadAddon(fitAddon);
            }

            // 添加 WebLinksAddon - 支持点击链接
            if (typeof WebLinksAddon !== 'undefined') {
                const webLinksAddon = new WebLinksAddon.WebLinksAddon();
                terminal.loadAddon(webLinksAddon);
            }

            // 尝试加载 WebGL 加速（可选）
            if (typeof WebglAddon !== 'undefined') {
                try {
                    const webglAddon = new WebglAddon.WebglAddon();
                    webglAddon.onContextLoss(() => {
                        webglAddon.dispose();
                    });
                    terminal.loadAddon(webglAddon);
                } catch (e) {
                    console.log('WebGL addon not available, using canvas renderer');
                }
            }

            // 打开终端
            terminal.open(xtermContainer);

            // 适应容器大小
            if (fitAddon) {
                fitAddon.fit();
            }

            isXtermReady = true;
            console.log('Terminal initialized successfully');

            // 终端准备好后显示欢迎信息
            terminal.writeln('\x1b[1;36m╔══════════════════════════════════════════════════════════╗\x1b[0m');
            terminal.writeln('\x1b[1;36m║           GA17 Serial Monitor - Terminal Ready          ║\x1b[0m');
            terminal.writeln('\x1b[1;36m╚══════════════════════════════════════════════════════════╝\x1b[0m');
            terminal.writeln('');
            terminal.writeln('\x1b[33mSelect a serial port and click Connect to begin.\x1b[0m');
            terminal.writeln('');

            // 注册数据发送处理器 - 用户在终端输入时发送到串口
            terminal.onData((data) => {
                if (isConnected) {
                    window.electronAPI.serial.write(data);
                }
            });

        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            xtermContainer.innerHTML = '<div style="color: #f44747; padding: 20px;">Failed to initialize terminal: ' + error.message + '</div>';
        }
    }

    // 备用终端 - 当 xterm.js 未加载时使用
    function createFallbackTerminal() {
        xtermContainer.innerHTML = `
            <div id="fallback-terminal" style="
                width: 100%;
                height: 100%;
                background: #1e1e1e;
                color: #d4d4d4;
                font-family: 'Cascadia Code', 'Consolas', monospace;
                font-size: 14px;
                padding: 8px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-all;
            ">
                <div style="color: #569cd6; margin-bottom: 8px;">
╔══════════════════════════════════════════════════════════╗
║           GA17 Serial Monitor - Terminal Ready          ║
╚══════════════════════════════════════════════════════════╝
                </div>
                <div style="color: #dcdcaa;">Select a serial port and click Connect to begin.</div>
                <div style="margin-top: 8px;">
                    <span style="color: #6a9955;">$</span> <span id="fallback-input" style="outline: none;" contenteditable="true"></span>
                </div>
            </div>
        `;
        isXtermReady = true;

        // 监听输入
        const fallbackInput = document.getElementById('fallback-input');
        if (fallbackInput) {
            fallbackInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && isConnected) {
                    const text = fallbackInput.textContent + '\n';
                    window.electronAPI.serial.write(text);
                    fallbackInput.textContent = '';
                }
            });
            fallbackInput.focus();
        }
    }

    // 窗口大小变化时重新适应终端
    function resizeTerminal() {
        if (fitAddon && isXtermReady) {
            fitAddon.fit();
        }
    }

    // 页面加载后初始化终端
    initTerminal();

    // 监听窗口大小变化
    window.addEventListener('resize', resizeTerminal);

    // 面板大小变化时也要重新适应
    const resizeObserver = new ResizeObserver(() => {
        resizeTerminal();
    });
    if (terminalOutput) {
        resizeObserver.observe(terminalOutput);
    }

    // ============ 终端写入函数 ============
    function writeToTerminal(data) {
        if (terminal && isXtermReady && typeof terminal.write === 'function') {
            terminal.write(data);
        }
    }

    // ============ 终端清空函数 ============
    function clearTerminal() {
        if (terminal && isXtermReady && typeof terminal.clear === 'function') {
            terminal.clear();
        }
    }

    // 重置光标位置
    function resetCursor() {
        if (terminal && isXtermReady) {
            terminal.write('\x1b[H');
        }
    }

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
            writeToTerminal(`\x1b[31m[Error] Failed to refresh ports: ${error.message}\x1b[0m\r\n`);
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
                // 启用配置选项
                setConfigDisabled(false);
                writeToTerminal('\r\n\x1b[33m[Disconnected] Port closed\x1b[0m\r\n');
            } catch (error) {
                console.error('Failed to close port:', error);
                writeToTerminal(`\r\n\x1b[31m[Error] Failed to close port: ${error.message}\x1b[0m\r\n`);
            }
        } else {
            // 建立连接
            const port = portSelect.value;
            if (!port) return;

            try {
                writeToTerminal(`\x1b[36m[Connecting] Opening ${port}...\x1b[0m\r\n`);
                const result = await window.electronAPI.serial.open({
                    path: port,
                    baudRate: getBaudRate(),
                    dataBits: dataBitsSelect.value,
                    stopBits: stopBitsSelect.value,
                    parity: paritySelect.value,
                    flowControl: flowControlSelect.value,
                    encoding: getEncoding()
                });

                if (result.success) {
                    isConnected = true;
                    updateConnectButton();
                    // 禁用配置选项
                    setConfigDisabled(true);
                    // 显示连接成功消息（带颜色）
                    const port = portSelect.value;
                    const baud = getBaudRate();
                    writeToTerminal(`\r\n\x1b[32m[Connected] ${port} @ ${baud} baud\x1b[0m\r\n`);
                } else {
                    writeToTerminal(`\x1b[31m[Error] ${result.error || 'Failed to open port'}\x1b[0m\r\n`);
                }
            } catch (error) {
                console.error('Failed to open port:', error);
                writeToTerminal(`\x1b[31m[Error] ${error.message}\x1b[0m\r\n`);
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

    // 获取当前编码设置
    function getEncoding() {
        const encodingSelect = document.getElementById('encoding-select');
        return encodingSelect ? encodingSelect.value : 'gbk';
    }

    // 监听串口数据 - 使用 xterm.js 显示
    window.electronAPI.serial.onData((data) => {
        writeToTerminal(data);
    });

    // 监听串口状态
    window.electronAPI.serial.onStatus((status) => {
        console.log('Serial status:', status);
        if (status.type === 'disconnected') {
            isConnected = false;
            updateConnectButton();
            setConfigDisabled(false);
            writeToTerminal('\r\n\x1b[33m[Warning] Port disconnected\x1b[0m\r\n');
        } else if (status.type === 'error') {
            writeToTerminal(`\r\n\x1b[31m[Error] ${status.message}\x1b[0m\r\n`);
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

    if (clearTerminalBtn) {
        clearTerminalBtn.addEventListener('click', clearTerminal);
    }

    // 初始加载串口列表
    refreshPorts();
});
