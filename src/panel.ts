import * as vscode from "vscode";
import { readFlags, writeFlags } from "./flags";

export class ShareMirrorPanelProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration("shareImageMirror.trimEnabled") ||
          event.affectsConfiguration("shareImageMirror.uploadImages") ||
          event.affectsConfiguration("shareImageMirror.regenerateLink")
        ) {
          void writeFlags();
          this.postState();
        }
      })
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage((message: { type?: string; value?: boolean }) => {
      void this.onMessage(message);
    });
    this.postState();
  }

  private postState(): void {
    const flags = readFlags();
    void this.view?.webview.postMessage(flags);
  }

  private async onMessage(message: { type?: string; value?: boolean }): Promise<void> {
    const config = vscode.workspace.getConfiguration("shareImageMirror");
    if (message.type === "trim") {
      await config.update("trimEnabled", message.value === true, vscode.ConfigurationTarget.Global);
    } else if (message.type === "images") {
      await config.update("uploadImages", message.value === true, vscode.ConfigurationTarget.Global);
    } else if (message.type === "regenerate") {
      await config.update("regenerateLink", message.value === true, vscode.ConfigurationTarget.Global);
    } else if (message.type === "sync") {
      await vscode.commands.executeCommand("shareImageMirror.sync");
      return;
    }
    await writeFlags();
    this.postState();
  }

  private html(): string {
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <style>
    body { color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: 13px; padding: 12px; }
    label { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
    .hint { margin: 4px 0 0 22px; color: var(--vscode-descriptionForeground); }
    button { margin-top: 18px; }
  </style>
</head>
<body>
  <label><input id="trim" type="checkbox" />长度裁剪</label>
  <p class="hint">超限时保留服务器还能接受的最近一段。</p>
  <label><input id="images" type="checkbox" />图片上传</label>
  <p class="hint">把会话里的截图放进分享链接。</p>
  <label><input id="regenerate" type="checkbox" />重新生成链接</label>
  <p class="hint">已有分享时，按当前会话生成新链接并删掉旧的。关闭后继续打开上次的链接。</p>
  <button id="sync" type="button">立即镜像</button>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const trim = document.getElementById("trim");
    const images = document.getElementById("images");
    const regenerate = document.getElementById("regenerate");
    window.addEventListener("message", (event) => {
      trim.checked = !!event.data.trim;
      images.checked = !!event.data.uploadImages;
      regenerate.checked = !!event.data.regenerateLink;
    });
    trim.addEventListener("change", () => vscode.postMessage({ type: "trim", value: trim.checked }));
    images.addEventListener("change", () => vscode.postMessage({ type: "images", value: images.checked }));
    regenerate.addEventListener("change", () => vscode.postMessage({ type: "regenerate", value: regenerate.checked }));
    document.getElementById("sync").addEventListener("click", () => vscode.postMessage({ type: "sync" }));
  </script>
</body>
</html>`;
  }
}
