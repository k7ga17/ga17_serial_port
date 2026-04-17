# GA17 Serial Port Tool

一个使用 Electron 构建的跨平台串口调试工具，拥有类似 VS Code 的 UI 风格。

## 功能特性

- 📡 串口连接与管理
- 📊 数据发送与接收
- 📝 HEX 格式显示
- 📜 时间戳记录
- 💾 数据日志保存

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行开发模式

```bash
npm run dev
```

### 构建 Windows 可执行文件

```bash
npm run build:win
```

## 项目结构

```
ga17_serial_port/
├── package.json          # 项目配置
├── electron-builder.json # 构建配置
├── src/
│   ├── main/            # 主进程
│   │   ├── main.js      # 入口文件
│   │   └── preload.js   # 预加载脚本
│   └── renderer/        # 渲染进程
│       ├── index.html   # 主页面
│       ├── styles/      # 样式文件
│       └── scripts/      # 脚本文件
└── assets/              # 静态资源
```

## 技术栈

- Electron 28.x
- Node.js
- HTML/CSS/JavaScript