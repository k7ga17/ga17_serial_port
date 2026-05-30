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

安装依赖不成功的话，使用以下命令
```bash
npm install xterm-addon-web-links@0.6.0 --legacy-peer-deps
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


## 【Note】【Note】【Note】
不再维护。
想要实现文本显示与16进制显示，以及多标签显示失败。即使用Xterm模拟终端的调式串口与模拟电源板收发、显示的串口，以及两标签页左右对半显示：左调式串口，可以直接输入linux命令；右电源板串口，模拟收发，（发送通过右侧边栏点击指令列表（指令列表内容应可存储））。
想毕其功于一役，不可。
还是使用已经有的、成熟的软件MobaXterm、SecureCRT、sscom等等，专开专用，多开多用。