"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareTrimPanelProvider = void 0;
const vscode = __importStar(require("vscode"));
const flags_1 = require("./flags");
class ShareTrimPanelProvider {
    view;
    constructor(context) {
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("shareImageMirror.trimEnabled") ||
                event.affectsConfiguration("shareImageMirror.regenerateLink")) {
                void (0, flags_1.writeFlags)();
                this.postState();
            }
        }));
    }
    resolveWebviewView(view) {
        this.view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this.html();
        view.webview.onDidReceiveMessage((message) => {
            void this.onMessage(message);
        });
        this.postState();
    }
    postState() {
        const flags = (0, flags_1.readFlags)();
        void this.view?.webview.postMessage(flags);
    }
    async onMessage(message) {
        const config = vscode.workspace.getConfiguration("shareImageMirror");
        if (message.type === "trim") {
            await config.update("trimEnabled", message.value === true, vscode.ConfigurationTarget.Global);
        }
        else if (message.type === "regenerate") {
            await config.update("regenerateLink", message.value === true, vscode.ConfigurationTarget.Global);
        }
        await (0, flags_1.writeFlags)();
        this.postState();
    }
    html() {
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
  </style>
</head>
<body>
  <label><input id="trim" type="checkbox" />长度裁剪</label>
  <p class="hint">超限时保留服务器还能接受的最近一段。</p>
  <label><input id="regenerate" type="checkbox" />重新生成链接</label>
  <p class="hint">已有分享时，按当前会话生成新链接并删掉旧的。关闭后继续打开上次的链接。</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const trim = document.getElementById("trim");
    const regenerate = document.getElementById("regenerate");
    window.addEventListener("message", (event) => {
      trim.checked = !!event.data.trim;
      regenerate.checked = !!event.data.regenerateLink;
    });
    trim.addEventListener("change", () => vscode.postMessage({ type: "trim", value: trim.checked }));
    regenerate.addEventListener("change", () => vscode.postMessage({ type: "regenerate", value: regenerate.checked }));
  </script>
</body>
</html>`;
    }
}
exports.ShareTrimPanelProvider = ShareTrimPanelProvider;
//# sourceMappingURL=panel.js.map