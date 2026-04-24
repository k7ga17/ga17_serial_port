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
    activityIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // 切换活动图标激活状态
            activityIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
        });
    });

    // ============ 布局控制按钮 ============
    // 确保元素存在后再绑定事件
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('visible');
                toggleSidebarBtn.classList.toggle('active');
            }
        });
    }

    if (togglePanelBtn) {
        togglePanelBtn.addEventListener('click', () => {
            if (panel) {
                panel.classList.toggle('visible');
                togglePanelBtn.classList.toggle('active');
            }
        });
    }

    if (toggleAuxBarBtn) {
        toggleAuxBarBtn.addEventListener('click', () => {
            if (auxBar) {
                auxBar.classList.toggle('visible');
                toggleAuxBarBtn.classList.toggle('active');
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
});
