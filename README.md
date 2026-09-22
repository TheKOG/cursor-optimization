# Cursor Share Image Mirror

Windows 客户端分享远端 Linux 上的带图会话时，会把 `/root/.cursor/.../图片.jpg` 改成 `\root\.cursor\...\图片.jpg`，然后在本机磁盘上找这个文件。文件只在远端，所以整次分享被拒绝。

这个扩展跑在 Windows 本机（`extensionKind: ui`）。分享前执行一次命令，用 Remote SSH 把远端 `assets` 目录读下来，写到本机 `{盘符}:\root\.cursor\...`。

## 使用

1. 用 Remote SSH 打开出错的那个远端项目。
2. 命令面板执行 **Share Image Mirror: Sync remote chat images for share**，或点状态栏的「镜像聊天图片」。
3. 看到「已镜像 N 个文件」之后，再点分享。

要镜像整个 `assets` 目录。分享时只要有一张图读不到，整次请求都会失败。

## 设置

- `shareImageMirror.remoteAssetsDir`：远端目录。留空则按工作区自动找，默认会查 `/root/.cursor/projects/<项目>/assets`。
- `shareImageMirror.remoteHome`：远端主目录，默认 `/root`。
- `shareImageMirror.localDrive`：本机盘符。留空时写入 Cursor 安装盘、系统盘和当前进程盘。如果分享日志里的路径不在这些盘上，把盘符填进来再同步一次。

## 开发

```powershell
npm install
npm test
npm run compile
```
