# Cursor Optimization

这个扩展跑在 Windows 本机（`extensionKind: ui`）。活动栏图标是 **Cursor Optimization**。面板上的开关在下一次分享时生效。

## 它处理的三件事

### 1. 会话一长，分享就失败

服务器对分享体积有上限。超限时的真实原因是 `Share exceeds content limits`。界面只提示会话太长，不会自己缩短后再试。

打开 **长度裁剪** 后，按面板上的 **带上计划** 决定每一轮带不带计划，然后用二分寻找服务器还能接受的最近一段：先发整段，放不下就对半缩短，再在「能发出去」和「发不出去」之间取更长的一段。更短的中间链接会被删掉。关掉长度裁剪后，超限就直接失败。

**带上计划** 打开时，每一轮都带计划。关闭时，每一轮都不带。

**最小尝试轮数** 默认 3。到这个轮数以后，只要成功过一次，就留下其中最长的一段并停止。设成 1 时，第一次成功就停。

**最大尝试轮数** 默认 16。到这个轮数就停，一次都没成功也停。

### 2. 再次分享还是上次的链接

分享是一次快照。会话上已经有链接时，再点 **Share Transcript** 不会重新上传，只会弹出上次的链接。后加的对话因此不会出现。

打开 **重新生成链接** 后，每次分享都按当前会话新建链接，并删掉这个会话的旧链接。关掉后恢复 Cursor 原来的行为。

### 3. 需要一份可 Fork 的本地缓存

Cursor 自带的 **Share Transcript** 是只读快照。**Cache Transcript (Cursor Optimization)** 把当前会话整段写进当前工作区的 `.cursor/share-trim-cache`。远程工作区时，这个目录在服务器上，不是 Cursor 云分享。

**Cursor Optimization** 面板里的 **本地会话** 列出这些缓存。可以刷新、删除、导出 JSON，以及 **Fork**。Fork 的流程和 **Fork Shared Chat** 一样，会在本机新建一份会话；来源是这份工作区缓存，而不是云上的分享链接。

## 使用

1. 命令面板执行 **Cursor Optimization: Trim conversation to the share limit and share**。它把长度裁剪和会话缓存写进 Cursor 程序，按 Cursor 3.21.16 编写。
2. 完全退出所有 Cursor 进程后再打开。只重载窗口不会换上已经载入的程序脚本。
3. 在 **Cursor Optimization** 面板里确认开关，再点 **Share Transcript**。
4. 要留下一份可 Fork 的缓存时，打开聊天右上角菜单，点 **Cache Transcript (Cursor Optimization)**。然后在面板的 **本地会话** 里刷新、删除、导出或 Fork。

Cursor 升级会覆盖安装目录里的修改。升级后再执行一次上面的命令，并重新打开 Cursor。

## 设置

- `shareImageMirror.trimEnabled`：超限时保留服务器还能接受的最近一段。默认开。
- `shareImageMirror.includePlan`：每一轮都带上计划。默认关。
- `shareImageMirror.regenerateLink`：已有分享时重新生成链接并删除旧链接。默认开。
- `shareImageMirror.minAttempts`：到这个轮数以后，有过一次成功就留下最长的一段。默认 3。
- `shareImageMirror.maxAttempts`：到这个轮数就停，没成功也停。默认 16。

## 开发

```powershell
npm install
npm test
npm run compile
```

---

# Cursor Optimization

This extension runs on the Windows machine (`extensionKind: ui`). Its activity-bar icon is **Cursor Optimization**. Panel switches apply on the next share.

## What it handles

### 1. A long chat fails instead of being shortened

The server rejects an oversized share. The real reason is `Share exceeds content limits`. The UI only says the chat is too large.

With **长度裁剪** on, **带上计划** decides whether every round includes the plan. The search then binary-searches for the longest recent portion the server accepts: send the full chat, halve it when that is rejected, then try a longer length between the last success and the last failure. Shorter links created along the way are deleted. Turn length trimming off to let an oversized share fail unchanged.

**带上计划** on means every round includes the plan. Off means no round includes it.

**最小尝试轮数** defaults to 3. Once that many rounds have run, one success is enough: keep the longest successful portion and stop. Set it to 1 to stop at the first success.

**最大尝试轮数** defaults to 16. Reaching it stops the search even when nothing has succeeded.

### 2. Sharing again shows the previous link

A share is a snapshot. Once the chat has a link, **Share Transcript** does not upload again. It opens the previous link. Messages added later never appear there.

With **重新生成链接** on, each share creates a link from the current chat and deletes the older links for that chat. Turn it off to keep Cursor's original behavior.

### 3. A cache you can fork locally

Cursor's **Share Transcript** is a read-only snapshot. **Cache Transcript (Cursor Optimization)** writes the current chat into `.cursor/share-trim-cache` in the open workspace. On a remote workspace, that folder lives on the server. It is not a Cursor cloud share.

The **Local chats** section of the **Cursor Optimization** panel lists those caches. You can refresh, delete, export the JSON, or **Fork**. Fork follows **Fork Shared Chat** and creates a new local chat. The source is this workspace cache, not a cloud share link.

## Usage

1. Run **Cursor Optimization: Trim conversation to the share limit and share** from the Command Palette. This writes the length trim and the transcript cache into the Cursor installation. The patch matches Cursor 3.21.16.
2. Quit every Cursor process, then open Cursor again. Reloading the window does not replace the program script already loaded.
3. Check the switches in the **Cursor Optimization** panel, then use **Share Transcript**.
4. To keep a cache you can fork, open the chat's top-right menu and choose **Cache Transcript (Cursor Optimization)**. Then refresh, delete, export, or fork it from **Local chats** in the panel.

A Cursor update overwrites the installation change. Run the command again after an update, then reopen Cursor.

## Settings

- `shareImageMirror.trimEnabled`: when a share is over the limit, keep the longest recent portion the server accepts. Default on.
- `shareImageMirror.includePlan`: include the plan on every round. Default off.
- `shareImageMirror.regenerateLink`: when a link already exists, share the current chat again and delete the old link. Default on.
- `shareImageMirror.minAttempts`: after this many rounds, keep the longest success and stop. Default 3.
- `shareImageMirror.maxAttempts`: stop at this round even with no success. Default 16.

## Development

```powershell
npm install
npm test
npm run compile
```
