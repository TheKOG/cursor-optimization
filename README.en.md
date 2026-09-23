# Cursor Share Trim

[中文说明](README.md)

This extension runs on the Windows machine (`extensionKind: ui`). Its activity-bar icon is **分享裁剪**. Shared transcripts cannot carry screenshots, so it no longer mirrors chat images. The panel has two switches: length trimming and link regeneration. The next share uses the new values.

## What it handles

### 1. A long chat fails instead of being shortened

The server rejects an oversized share. The real reason is `Share exceeds content limits`. The UI only says the chat is too large.

With **长度裁剪** on, it sends the full conversation first. If that is rejected, it drops the plan, then halves from the end and lengthens again until it keeps the longest recent portion the server accepts. Shorter links created along the way are deleted. Turn it off to let an oversized share fail unchanged.

### 2. Sharing again shows the previous link

A share is a snapshot. Once the chat has a link, **Share Transcript** does not upload again. It opens the previous link. Messages added later never appear there.

With **重新生成链接** on, each share creates a link from the current chat and deletes the older links for that chat. Turn it off to keep Cursor's original behavior.

Cursor clears images before the share request is sent. The message format has an image field, but the share page and Fork do not use it, so this extension does not upload screenshots.

## Usage

1. Run **Share Trim: Trim conversation to the share limit and share** from the Command Palette. This writes the length trim into the Cursor installation. The patch matches Cursor 3.21.16.
2. Quit every Cursor process, then open Cursor again. Reloading the window does not replace the program script already loaded.
3. Check the two switches in the **分享裁剪** panel, then use **Share Transcript**.

A Cursor update overwrites the installation change. Run the command again after an update, then reopen Cursor.

## Settings

- `shareImageMirror.trimEnabled`: when a share is over the limit, keep the longest recent portion the server accepts. Default on.
- `shareImageMirror.regenerateLink`: when a link already exists, share the current chat again and delete the old link. Default on.

## Development

```powershell
npm install
npm test
npm run compile
```
