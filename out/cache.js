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
exports.listCaches = listCaches;
exports.deleteCache = deleteCache;
exports.importCache = importCache;
exports.exportCache = exportCache;
exports.forkCache = forkCache;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const vscode = __importStar(require("vscode"));
const flags_1 = require("./flags");
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
function chinese() {
    return (0, flags_1.readFlags)().language !== "en";
}
function cacheDir() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    return root ? vscode.Uri.joinPath(root, ".cursor", "share-trim-cache") : undefined;
}
function isSummary(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const item = value;
    return SAFE_ID.test(item.id) && typeof item.title === "string";
}
async function listCaches() {
    const dir = cacheDir();
    if (!dir) {
        return { items: [] };
    }
    try {
        const raw = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, "index.json"));
        const parsed = JSON.parse(new TextDecoder().decode(raw));
        if (!Array.isArray(parsed)) {
            return { items: [] };
        }
        return { items: parsed.filter(isSummary) };
    }
    catch (error) {
        if (error instanceof vscode.FileSystemError && error.code === "FileNotFound") {
            return { items: [] };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { items: [], error: message };
    }
}
async function deleteCache(id) {
    const zh = chinese();
    if (!SAFE_ID.test(id)) {
        void vscode.window.showErrorMessage(zh ? "缓存编号无效" : "Invalid cache id");
        return;
    }
    const dir = cacheDir();
    if (!dir) {
        void vscode.window.showErrorMessage(zh ? "请先打开一个文件夹" : "Open a folder first");
        return;
    }
    const remove = zh ? "删除" : "Delete";
    const choice = await vscode.window.showWarningMessage(zh ? "删除这份缓存会话？" : "Delete this cached transcript?", { modal: true }, remove);
    if (choice !== remove) {
        return;
    }
    await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, `${id}.json`), { recursive: true }).then(() => undefined, () => undefined);
    await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, id), { recursive: true }).then(() => undefined, () => undefined);
    const current = await listCaches();
    const next = current.items.filter((item) => item.id !== id);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "index.json"), new TextEncoder().encode(JSON.stringify(next)));
}
function newCacheId() {
    return (0, crypto_1.randomUUID)().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}
function countStoredImages(messages) {
    let count = 0;
    for (const message of messages) {
        if (!message || typeof message !== "object") {
            continue;
        }
        const images = message.images;
        if (!Array.isArray(images)) {
            continue;
        }
        for (const image of images) {
            if (image && typeof image === "object" && typeof image.base64 === "string") {
                count += 1;
            }
        }
    }
    return count;
}
async function importCache() {
    const zh = chinese();
    const dir = cacheDir();
    if (!dir) {
        void vscode.window.showErrorMessage(zh ? "请先打开一个文件夹" : "Open a folder first");
        return;
    }
    const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFiles: true,
        canSelectFolders: false,
        filters: { JSON: ["json"] },
        openLabel: zh ? "从本机导入" : "Import from this PC",
        title: zh ? "选择本机上的缓存 JSON" : "Choose a cache JSON on this computer",
        defaultUri: vscode.Uri.file(os.homedir()),
    });
    const source = picked?.[0];
    if (!source) {
        return;
    }
    if (source.scheme !== "file") {
        void vscode.window.showErrorMessage(zh ? "请从本机选文件，不要选远程服务器上的路径。" : "Pick a file on this computer, not on the remote server.");
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(await fs.readFile(source.fsPath, "utf8"));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage((zh ? "无法读取这个 JSON：" : "Could not read this JSON: ") + message);
        return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        void vscode.window.showErrorMessage(zh ? "这不是本插件导出的缓存会话" : "This is not a cached transcript from this extension");
        return;
    }
    const payload = parsed;
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
        void vscode.window.showErrorMessage(zh ? "这个文件里没有对话" : "This file has no messages");
        return;
    }
    const listed = await listCaches();
    let id = typeof payload.id === "string" && SAFE_ID.test(payload.id) ? payload.id : newCacheId();
    if (!id || listed.items.some((item) => item.id === id)) {
        id = newCacheId();
    }
    if (!SAFE_ID.test(id)) {
        void vscode.window.showErrorMessage(zh ? "无法生成缓存编号" : "Could not create a cache id");
        return;
    }
    const title = String(payload.title || path.basename(source.fsPath, ".json")).slice(0, 200) || (zh ? "未命名会话" : "Untitled Chat");
    const createdAt = typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt) ? payload.createdAt : Date.now();
    const messageCount = payload.messages.length;
    const imageCount = typeof payload.imageCount === "number" && Number.isFinite(payload.imageCount)
        ? Math.max(0, Math.floor(payload.imageCount))
        : countStoredImages(payload.messages);
    const stored = {
        version: 1,
        id,
        title,
        composerId: typeof payload.composerId === "string" ? payload.composerId : "",
        createdAt,
        messageCount,
        imageCount,
        messages: payload.messages,
    };
    await vscode.workspace.fs.createDirectory(dir);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, `${id}.json`), new TextEncoder().encode(JSON.stringify(stored)));
    const next = listed.items.filter((item) => item.id !== id);
    next.unshift({ id, title, createdAt, messageCount, imageCount });
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "index.json"), new TextEncoder().encode(JSON.stringify(next)));
    void vscode.window.showInformationMessage(zh ? "已导入缓存会话" : "Imported the cached transcript");
}
async function exportCache(id) {
    const zh = chinese();
    if (!SAFE_ID.test(id)) {
        void vscode.window.showErrorMessage(zh ? "缓存编号无效" : "Invalid cache id");
        return;
    }
    const dir = cacheDir();
    if (!dir) {
        void vscode.window.showErrorMessage(zh ? "请先打开一个文件夹" : "Open a folder first");
        return;
    }
    const listed = await listCaches();
    const title = listed.items.find((item) => item.id === id)?.title || id;
    const base = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").trim().slice(0, 80) || id;
    const target = await vscode.window.showSaveDialog({
        filters: { JSON: ["json"] },
        saveLabel: zh ? "导出" : "Export",
        defaultUri: vscode.Uri.file(path.join(os.homedir(), `${base}.json`)),
    });
    if (!target) {
        return;
    }
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, `${id}.json`));
    await vscode.workspace.fs.writeFile(target, bytes);
    void vscode.window.showInformationMessage(zh ? "已导出缓存会话" : "Exported the cached transcript");
}
async function forkCache(id) {
    const zh = chinese();
    if (!SAFE_ID.test(id)) {
        void vscode.window.showErrorMessage(zh ? "缓存编号无效" : "Invalid cache id");
        return;
    }
    try {
        await vscode.commands.executeCommand("shareImageMirror.forkCache", id);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const hint = /not found/i.test(message)
            ? zh
                ? "。请完全退出 Cursor 后再打开，让 Fork 命令装上。"
                : ". Quit Cursor completely and reopen it so the fork command can load."
            : "";
        void vscode.window.showErrorMessage((zh ? "Fork 失败：" : "Fork failed: ") + message + hint);
    }
}
//# sourceMappingURL=cache.js.map