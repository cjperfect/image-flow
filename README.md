# Image-flow — 图片压缩上传工作台

将「选择图片 → TinyPNG 压缩 → 上传云存储 → 复制地址」合并成一个页面操作。

## 功能

- 支持 **华为云 OBS** 和 **阿里云 OSS** 两种云存储，一键切换
- 输入目标目录与连接凭据，连接成功后浏览器自动加密保存
- 拖拽或批量选择图片，按队列调用 TinyPNG 压缩后自动上传
- 实时显示压缩前后体积、处理状态、成功动效和图片链接
- 压缩后自动生成公开链接，支持复制 URL 或 CSS background-image 格式

## 本地运行

```bash
pnpm install
pnpm dev
```

## 桌面应用打包

使用 Tauri 将 Web 应用打包为桌面应用，支持 Windows (exe/msi) 和 macOS (dmg)。

```bash
# 打包当前平台
pnpm tauri build

# 仅打包指定格式
pnpm tauri build --bundles msi    # Windows MSI
pnpm tauri build --bundles dmg    # macOS DMG
```

**macOS 打包**需在 macOS 系统上运行，否则可通过 GitHub Actions 自动构建（推送代码后在 Actions 页面下载 DMG）。

## 技术栈

React、Tailwind CSS、Vite、Tauri、华为云 OBS BrowserJS SDK、阿里云 OSS SDK（ali-oss）。
