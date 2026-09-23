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
const cache_1 = require("./cache");
const flags_1 = require("./flags");
class ShareTrimPanelProvider {
    view;
    constructor(context) {
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("shareImageMirror.trimEnabled") ||
                event.affectsConfiguration("shareImageMirror.includePlan") ||
                event.affectsConfiguration("shareImageMirror.regenerateLink") ||
                event.affectsConfiguration("shareImageMirror.minAttempts") ||
                event.affectsConfiguration("shareImageMirror.maxAttempts") ||
                event.affectsConfiguration("shareImageMirror.language")) {
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
        const visibility = view.onDidChangeVisibility(() => {
            if (view.visible) {
                void this.postState();
            }
        });
        view.onDidDispose(() => visibility.dispose());
        void this.postState();
    }
    async postState() {
        const flags = (0, flags_1.readFlags)();
        const listed = await (0, cache_1.listCaches)();
        void this.view?.webview.postMessage({
            ...flags,
            caches: listed.items,
            listError: listed.error || "",
            hasFolder: !!vscode.workspace.workspaceFolders?.length,
        });
    }
    async onMessage(message) {
        if (message.type === "refreshCaches") {
            await this.postState();
            return;
        }
        if (message.type === "deleteCache" && message.id) {
            await (0, cache_1.deleteCache)(message.id);
            await this.postState();
            return;
        }
        if (message.type === "exportCache" && message.id) {
            await (0, cache_1.exportCache)(message.id);
            return;
        }
        if (message.type === "forkCache" && message.id) {
            await (0, cache_1.forkCache)(message.id);
            return;
        }
        const config = vscode.workspace.getConfiguration("shareImageMirror");
        if (message.type === "trim") {
            await config.update("trimEnabled", message.value === true, vscode.ConfigurationTarget.Global);
        }
        else if (message.type === "plan") {
            await config.update("includePlan", message.value === true, vscode.ConfigurationTarget.Global);
        }
        else if (message.type === "regenerate") {
            await config.update("regenerateLink", message.value === true, vscode.ConfigurationTarget.Global);
        }
        else if (message.type === "language") {
            await config.update("language", message.value === "en" ? "en" : "zh", vscode.ConfigurationTarget.Global);
        }
        else if (message.type === "minAttempts" || message.type === "maxAttempts") {
            const fallback = message.type === "minAttempts" ? 3 : 16;
            const n = Math.floor(Number(message.value));
            const value = Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : fallback;
            await config.update(message.type, value, vscode.ConfigurationTarget.Global);
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
    input[type="number"] { width: 4.5em; }
    select { margin-left: 8px; }
    .section { margin-top: 18px; border-top: 1px solid var(--vscode-widget-border); padding-top: 12px; }
    .row { padding: 8px 0; border-top: 1px solid var(--vscode-widget-border); }
    .title { font-weight: 600; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 12px; margin-top: 2px; }
    button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 3px 8px; margin: 6px 6px 0 0; cursor: pointer; }
    button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  </style>
</head>
<body>
  <label><span id="langLabel">Language</span><select id="language"><option value="zh">中文</option><option value="en">English</option></select></label>
  <p class="hint" id="langHint"></p>
  <label><input id="trim" type="checkbox" /><span id="trimLabel"></span></label>
  <p class="hint" id="trimHint"></p>
  <label><input id="plan" type="checkbox" /><span id="planLabel"></span></label>
  <p class="hint" id="planHint"></p>
  <label><input id="regenerate" type="checkbox" /><span id="regenerateLabel"></span></label>
  <p class="hint" id="regenerateHint"></p>
  <label><span id="minLabel"></span> <input id="minAttempts" type="number" min="1" max="50" /></label>
  <p class="hint" id="minHint"></p>
  <label><span id="maxLabel"></span> <input id="maxAttempts" type="number" min="1" max="50" /></label>
  <p class="hint" id="maxHint"></p>
  <div class="section">
    <div class="title" id="cacheTitle"></div>
    <p class="hint" id="cacheHint"></p>
    <button id="refresh" type="button"></button>
    <div id="caches"></div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const copy = {
      zh: {
        lang: "Language",
        langHint: "面板和分享提示使用这个语言。默认中文。",
        trim: "长度裁剪",
        trimHint: "超限时保留服务器还能接受的最近一段。",
        plan: "带上计划",
        planHint: "打开后每一轮都带计划。关闭后每一轮都不带。",
        regenerate: "重新生成链接",
        regenerateHint: "已有分享时，按当前会话生成新链接并删掉旧的。关闭后继续打开上次的链接。",
        min: "最小尝试轮数",
        minHint: "到这个轮数以后，只要成功过一次，就留下其中最长的一段并停止。默认 3。设成 1 时，第一次成功就停。",
        max: "最大尝试轮数",
        maxHint: "到这个轮数就停。一次都没成功也停。",
        cacheTitle: "本地会话",
        cacheHint: "缓存在当前工作区的 .cursor/share-trim-cache。远程工作区时，文件在服务器上。Fork 会在本地新建会话，图片一起带回来。",
        refresh: "刷新",
        del: "删除",
        export: "导出",
        fork: "Fork",
        empty: "还没有缓存。打开聊天右上角菜单，点 Cache Transcript (Cursor Optimization)。",
        noFolder: "先打开一个文件夹，列表才会出现。",
        untitled: "未命名会话"
      },
      en: {
        lang: "Language",
        langHint: "Panel text and share messages use this language. Chinese is the default.",
        trim: "Trim length",
        trimHint: "When a share is too large, keep the longest recent portion the server accepts.",
        plan: "Include plan",
        planHint: "On: every round includes the plan. Off: no round includes it.",
        regenerate: "Regenerate link",
        regenerateHint: "If a link already exists, create a new one from the current chat and delete the old one. Off keeps the previous link.",
        min: "Minimum attempts",
        minHint: "After this many rounds, one success is enough: keep the longest successful portion and stop. The default is 3. Set it to 1 to stop at the first success.",
        max: "Maximum attempts",
        maxHint: "Stop at this round, even if nothing succeeded.",
        cacheTitle: "Local chats",
        cacheHint: "Stored in the open workspace at .cursor/share-trim-cache. On a remote workspace, that folder is on the server. Fork creates a local chat and brings the images back.",
        refresh: "Refresh",
        del: "Delete",
        export: "Export",
        fork: "Fork",
        empty: "Nothing cached yet. Open the chat menu and choose Cache Transcript (Cursor Optimization).",
        noFolder: "Open a folder to see cached chats.",
        untitled: "Untitled Chat"
      }
    };
    const language = document.getElementById("language");
    const trim = document.getElementById("trim");
    const plan = document.getElementById("plan");
    const regenerate = document.getElementById("regenerate");
    const minAttempts = document.getElementById("minAttempts");
    const maxAttempts = document.getElementById("maxAttempts");
    function applyCopy(code) {
      const text = copy[code] || copy.zh;
      document.documentElement.lang = code === "en" ? "en" : "zh-CN";
      for (const key of ["lang", "trim", "plan", "regenerate", "min", "max"]) {
        document.getElementById(key + "Label").textContent = text[key];
        document.getElementById(key + "Hint").textContent = text[key + "Hint"];
      }
      document.getElementById("cacheTitle").textContent = text.cacheTitle;
      document.getElementById("cacheHint").textContent = text.cacheHint;
      document.getElementById("refresh").textContent = text.refresh;
    }
    function renderCaches(data) {
      const code = data.language === "en" ? "en" : "zh";
      const text = copy[code] || copy.zh;
      const root = document.getElementById("caches");
      root.textContent = "";
      const items = Array.isArray(data.caches) ? data.caches : [];
      if (data.listError) {
        const err = document.createElement("p");
        err.className = "hint";
        err.textContent = data.listError;
        root.appendChild(err);
      }
      if (!data.hasFolder || !items.length) {
        const empty = document.createElement("p");
        empty.className = "hint";
        empty.textContent = data.hasFolder ? text.empty : text.noFolder;
        root.appendChild(empty);
        return;
      }
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "row";
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = item.title || text.untitled;
        const meta = document.createElement("div");
        meta.className = "meta";
        const when = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
        const messages = Number(item.messageCount) || 0;
        const images = Number(item.imageCount) || 0;
        meta.textContent = code === "en"
          ? when + " · " + messages + " messages · " + images + " images"
          : when + " · " + messages + " 条 · " + images + " 张图片";
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = text.del;
        del.addEventListener("click", () => vscode.postMessage({ type: "deleteCache", id: item.id }));
        const exp = document.createElement("button");
        exp.type = "button";
        exp.textContent = text.export;
        exp.addEventListener("click", () => vscode.postMessage({ type: "exportCache", id: item.id }));
        const fork = document.createElement("button");
        fork.type = "button";
        fork.className = "primary";
        fork.textContent = text.fork;
        fork.addEventListener("click", () => vscode.postMessage({ type: "forkCache", id: item.id }));
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(del);
        row.appendChild(exp);
        row.appendChild(fork);
        root.appendChild(row);
      }
    }
    window.addEventListener("message", (event) => {
      const code = event.data.language === "en" ? "en" : "zh";
      language.value = code;
      applyCopy(code);
      trim.checked = !!event.data.trim;
      plan.checked = !!event.data.includePlan;
      regenerate.checked = !!event.data.regenerateLink;
      minAttempts.value = String(event.data.minAttempts || 3);
      maxAttempts.value = String(event.data.maxAttempts || 16);
      renderCaches(event.data);
    });
    document.getElementById("refresh").addEventListener("click", () => vscode.postMessage({ type: "refreshCaches" }));
    language.addEventListener("change", () => vscode.postMessage({ type: "language", value: language.value }));
    trim.addEventListener("change", () => vscode.postMessage({ type: "trim", value: trim.checked }));
    plan.addEventListener("change", () => vscode.postMessage({ type: "plan", value: plan.checked }));
    regenerate.addEventListener("change", () => vscode.postMessage({ type: "regenerate", value: regenerate.checked }));
    minAttempts.addEventListener("change", () => vscode.postMessage({ type: "minAttempts", value: Number(minAttempts.value) }));
    maxAttempts.addEventListener("change", () => vscode.postMessage({ type: "maxAttempts", value: Number(maxAttempts.value) }));
    applyCopy("zh");
  </script>
</body>
</html>`;
    }
}
exports.ShareTrimPanelProvider = ShareTrimPanelProvider;
//# sourceMappingURL=panel.js.map