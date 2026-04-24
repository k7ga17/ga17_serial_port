// 渲染进程脚本
document.addEventListener('DOMContentLoaded', () => {
    // ============ 面板元素 ============
    const sidebar = document.getElementById('sidebar');
    const auxBar = document.getElementById('auxBar');
    const panel = document.getElementById('panel');
    const contentArea = document.getElementById('contentArea');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const togglePanelBtn = document.getElementById('togglePanelBtn');
    const toggleAuxBarBtn = document.getElementById('toggleAuxBarBtn');

    // 侧边栏默认宽度
    const DEFAULT_SIDEBAR_WIDTH = 250;
    const DEFAULT_AUXBAR_WIDTH = 250;

    // ============ 布局控制 ============
    function togglePanel(panelElement, btnElement, contentAreaClass, defaultSize) {
        if (panelElement.classList.contains('hidden')) {
            panelElement.classList.remove('hidden');
            btnElement.classList.add('active');
            contentArea.classList.remove(contentAreaClass);
            // 恢复宽度
            if (panelElement === sidebar || panelElement === auxBar) {
                panelElement.style.width = defaultSize + 'px';
            }
        } else {
            // 保存当前宽度
            if (panelElement === sidebar || panelElement === auxBar) {
                panelElement.dataset.prevWidth = panelElement.offsetWidth || defaultSize;
            }
            panelElement.classList.add('hidden');
            btnElement.classList.remove('active');
            contentArea.classList.add(contentAreaClass);
        }
    }

    toggleSidebarBtn.addEventListener('click', () => {
        togglePanel(sidebar, toggleSidebarBtn, 'sidebar-hidden', DEFAULT_SIDEBAR_WIDTH);
    });

    togglePanelBtn.addEventListener('click', () => {
        togglePanel(panel, togglePanelBtn, 'panel-hidden', null);
    });

    toggleAuxBarBtn.addEventListener('click', () => {
        togglePanel(auxBar, toggleAuxBarBtn, 'auxbar-hidden', DEFAULT_AUXBAR_WIDTH);
    });

    // ============ 键盘快捷键 ============
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleSidebarBtn.click();
        }
        if (e.ctrlKey && e.key === 'j') {
            e.preventDefault();
            togglePanelBtn.click();
        }
        if (e.ctrlKey && e.altKey && e.key === 'b') {
            e.preventDefault();
            toggleAuxBarBtn.click();
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
            // 等待一小段时间后更新图标状态
            setTimeout(updateMaximizeIcon, 100);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.close();
        });
    }

    // 更新最大化按钮图标
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

    // 初始化图标状态
    updateMaximizeIcon();

    // 监听窗口状态变化（窗口大小改变时）
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
