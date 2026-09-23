# Cursor Share Image Mirror

[English](README.en.md)

这个扩展跑在 Windows 本机（`extensionKind: ui`），用来绕开 Cursor 分享远端会话时的三个问题。活动栏的 **分享镜像** 面板可以分别关掉对应的处理：长度裁剪、图片上传、重新生成链接。改完后，下一次分享就按新开关执行。

## Cursor 的三个问题

### 1. 带图会话分享失败，成功时页面里也没有图

在 Windows 上分享远端 Linux 会话时，客户端会把 `/root/.cursor/projects/.../assets/图片.jpg` 改成 `\root\.cursor\...\图片.jpg`，再按这个路径去读文件。它没有盘符。文件就算已经在 `C:\root\.cursor\...`，内置的 `vscode-file` 仍把它当成相对路径，返回找不到文件。只要有一张图读不到，整次分享都会失败。

分享请求在上传前还会丢掉消息上的图片。所以即便请求成功，打开的分享页也只有文字。

插件会把远端 `assets` 镜像到本机固定盘的 `\root\.cursor\...`。大小相同的文件会跳过；窗口开着时大约每 5 秒检查一次，会话里新发的图会补进来。分享读图时，给没有盘符的 `\root\...` 补上 `C:`，并在上传前把截图放回分享内容。关掉面板里的 **图片上传** 后，分享只有文字。

### 2. 会话一长，分享就失败

服务器对分享体积有上限。超限时的真实原因是 `Share exceeds content limits`。界面只提示会话太长，不会自己缩短后再试。

插件会先发送整段。放不下就去掉计划，再从末尾对半缩小、然后逐段加长，留下服务器还能接受的最近一段，并删掉更短的中间链接。关掉 **长度裁剪** 后，超限就直接失败，不再裁剪。

### 3. 再次分享还是上次的链接，新对话不会出现

这是 Cursor 自己的逻辑。分享是一次快照：会话上已经有链接时，再点 **Share Transcript** 不会重新上传，只会弹出上次的链接。服务端不能用新内容覆盖旧快照，只能改可见性或删除。后加的对话因此不会出现在旧链接里。

打开 **重新生成链接** 后，每次分享都按当前会话新建链接，并删掉这个会话的旧链接。关掉后恢复 Cursor 原来的行为。

## 使用

1. 用 Remote SSH 打开远端项目。
2. 命令面板执行 **Share Image Mirror: Sync remote chat images for share**，或点状态栏的「镜像聊天图片」。启动后也会自动镜像；已有且大小相同的文件不会重拷。
3. 命令面板执行 **Share Image Mirror: Trim conversation to the share limit and share**，把长度裁剪和盘符修正写进 Cursor 程序。这一步按 Cursor 3.21.16 编写。
4. 完全退出所有 Cursor 进程后再打开。只重载窗口不会换上已经载入的程序脚本。
5. 在 **分享镜像** 面板里确认三个开关，再点 **Share Transcript**。

Cursor 升级会覆盖安装目录里的修改。升级后需要再执行一次上面的命令，并重新打开 Cursor。图片放回分享内容、以及「重新生成链接」，也写在这个安装目录里；升级后如果分享又变回旧行为，需要重新装上这些修改。

## 设置

- `shareImageMirror.trimEnabled`：超限时保留服务器还能接受的最近一段。默认开。
- `shareImageMirror.uploadImages`：把会话截图放进分享链接。默认开。
- `shareImageMirror.regenerateLink`：已有分享时重新生成链接并删除旧链接。默认开。
- `shareImageMirror.remoteAssetsDir`：远端目录，使用正斜杠。留空则按当前工作区查找，默认是 `/root/.cursor/projects/<项目>/assets`。
- `shareImageMirror.remoteHome`：远端主目录，默认 `/root`。
- `shareImageMirror.localDrive`：本机盘符，例如 `C:`。留空时写入 Cursor 安装盘、系统盘和当前进程盘。

## 开发

```powershell
npm install
npm test
npm run compile
```
