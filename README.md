# Cursor Share Trim

[English](README.en.md)

这个扩展跑在 Windows 本机（`extensionKind: ui`）。活动栏图标是 **分享裁剪**。分享页带不上截图，所以不再镜像聊天图片。面板只留两件事：长度裁剪、重新生成链接。改完后，下一次分享就按新开关执行。

## 它处理的两件事

### 1. 会话一长，分享就失败

服务器对分享体积有上限。超限时的真实原因是 `Share exceeds content limits`。界面只提示会话太长，不会自己缩短后再试。

打开 **长度裁剪** 后，先发送整段。放不下就去掉计划，再从末尾对半缩小、然后逐段加长，留下服务器还能接受的最近一段，并删掉更短的中间链接。关掉后，超限就直接失败。

### 2. 再次分享还是上次的链接

分享是一次快照。会话上已经有链接时，再点 **Share Transcript** 不会重新上传，只会弹出上次的链接。后加的对话因此不会出现。

打开 **重新生成链接** 后，每次分享都按当前会话新建链接，并删掉这个会话的旧链接。关掉后恢复 Cursor 原来的行为。

Cursor 的分享请求在上传前会清空图片。协议里虽然有图片字段，分享页和 Fork 都不使用它，所以这个插件不再上传截图。

## 使用

1. 命令面板执行 **Share Trim: Trim conversation to the share limit and share**。它把长度裁剪写进 Cursor 程序，按 Cursor 3.21.16 编写。
2. 完全退出所有 Cursor 进程后再打开。只重载窗口不会换上已经载入的程序脚本。
3. 在 **分享裁剪** 面板里确认两个开关，再点 **Share Transcript**。

Cursor 升级会覆盖安装目录里的修改。升级后再执行一次上面的命令，并重新打开 Cursor。

## 设置

- `shareImageMirror.trimEnabled`：超限时保留服务器还能接受的最近一段。默认开。
- `shareImageMirror.regenerateLink`：已有分享时重新生成链接并删除旧链接。默认开。

## 开发

```powershell
npm install
npm test
npm run compile
```
