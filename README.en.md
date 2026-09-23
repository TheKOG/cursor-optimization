# Cursor Share Image Mirror

[中文说明](README.md)

This extension runs on the Windows machine (`extensionKind: ui`). It works around three Cursor problems when a remote chat is shared. The **分享镜像** activity-bar panel can turn each workaround off: length trimming, image upload, and link regeneration. The next share uses the new values.

## Three Cursor problems

### 1. A chat with images fails to share, and a successful page still has no images

When Windows shares a remote Linux chat, the client rewrites `/root/.cursor/projects/.../assets/image.jpg` to `\root\.cursor\...\image.jpg` and reads that path. The path has no drive letter. Even after the file is at `C:\root\.cursor\...`, the built-in `vscode-file` protocol treats it as relative and returns file-not-found. One missing image rejects the whole share.

The share request also drops images attached to messages before upload. A share that succeeds still opens as a text-only page.

The extension mirrors the remote `assets` directory to `\root\.cursor\...` on the local fixed drives. Files that already exist with the same size are skipped. While the window stays open, it checks about every 5 seconds and copies images added to the chat. While sharing, it prefixes `C:` on a drive-less `\root\...` path and puts the screenshots back into the share payload. Turn off **图片上传** to share text only.

### 2. A long chat fails instead of being shortened

The server rejects an oversized share. The real reason is `Share exceeds content limits`. The UI only says the chat is too large. It does not shorten the chat and try again.

The extension sends the full conversation first. If that is rejected, it drops the plan, then halves from the end and lengthens again until it keeps the longest recent portion the server accepts. Shorter links created along the way are deleted. Turn off **长度裁剪** to let an oversized share fail unchanged.

### 3. Sharing again shows the previous link, without the new messages

This is Cursor's own behavior. A share is a snapshot. Once the chat has a link, **Share Transcript** does not upload again. It opens the previous link. The server cannot replace that snapshot with new messages. It can only change visibility or delete the share. Messages added later never appear on the old link.

With **重新生成链接** on, each share creates a link from the current chat and deletes the older links for that chat. Turn it off to keep Cursor's original behavior.

## Usage

1. Open the remote project with Remote SSH.
2. Run **Share Image Mirror: Sync remote chat images for share** from the Command Palette, or click **镜像聊天图片** in the status bar. Startup also mirrors files, and skips copies whose size already matches.
3. Run **Share Image Mirror: Trim conversation to the share limit and share**. This writes the length trim and the drive-letter fix into the Cursor installation. The patch matches Cursor 3.21.16.
4. Quit every Cursor process, then open Cursor again. Reloading the window does not replace the program script already loaded.
5. Check the three switches in the **分享镜像** panel, then use **Share Transcript**.

A Cursor update overwrites these installation changes. Run the command again after an update, then reopen Cursor. Putting images back into the share, and regenerating the link, are also changes in that installation. If an update restores the old share behavior, those changes have to be installed again.

## Settings

- `shareImageMirror.trimEnabled`: when a share is over the limit, keep the longest recent portion the server accepts. Default on.
- `shareImageMirror.uploadImages`: attach chat screenshots to the shared transcript. Default on.
- `shareImageMirror.regenerateLink`: when a link already exists, share the current chat again and delete the old link. Default on.
- `shareImageMirror.remoteAssetsDir`: absolute remote directory, using forward slashes. Leave empty to resolve it from the current workspace. The default lookup is `/root/.cursor/projects/<project>/assets`.
- `shareImageMirror.remoteHome`: remote home directory. Defaults to `/root`.
- `shareImageMirror.localDrive`: local drive letter, for example `C:`. When empty, files are written to the drive where Cursor is installed, the system drive, and the current process drive.

## Development

```powershell
npm install
npm test
npm run compile
```
