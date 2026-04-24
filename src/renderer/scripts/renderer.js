// 渲染进程脚本
document.addEventListener('DOMContentLoaded', () => {
    // ============ 布局控制按钮 ============
    const layoutButtons = document.querySelectorAll('.layoutBtn');

    layoutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 单例切换：点击当前已激活的按钮则取消激活
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
            } else {
                // 取消其他按钮的激活状态
                layoutButtons.forEach(b => b.classList.remove('active'));
                // 激活当前按钮
                btn.classList.add('active');
            }
            // 发送按钮点击事件到主进程
            window.electronAPI.sendLayoutToggle(btn.id);
        });
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
