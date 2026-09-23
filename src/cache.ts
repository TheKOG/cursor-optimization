import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import * as vscode from "vscode";
import { readFlags } from "./flags";

export interface CacheSummary {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
  imageCount: number;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

function chinese(): boolean {
  return readFlags().language !== "en";
}

function cacheDir(): vscode.Uri | undefined {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  return root ? vscode.Uri.joinPath(root, ".cursor", "share-trim-cache") : undefined;
}

function isSummary(value: unknown): value is CacheSummary {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as CacheSummary;
  return SAFE_ID.test(item.id) && typeof item.title === "string";
}

export async function listCaches(): Promise<{ items: CacheSummary[]; error?: string }> {
  const dir = cacheDir();
  if (!dir) {
    return { items: [] };
  }
  try {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, "index.json"));
    const parsed = JSON.parse(new TextDecoder().decode(raw)) as unknown;
    if (!Array.isArray(parsed)) {
      return { items: [] };
    }
    return { items: parsed.filter(isSummary) };
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === "FileNotFound") {
      return { items: [] };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { items: [], error: message };
  }
}

export async function deleteCache(id: string): Promise<void> {
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
  const choice = await vscode.window.showWarningMessage(
    zh ? "删除这份缓存会话？" : "Delete this cached transcript?",
    { modal: true },
    remove
  );
  if (choice !== remove) {
    return;
  }
  await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, `${id}.json`), { recursive: true }).then(
    () => undefined,
    () => undefined
  );
  await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, id), { recursive: true }).then(
    () => undefined,
    () => undefined
  );
  const current = await listCaches();
  const next = current.items.filter((item) => item.id !== id);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(dir, "index.json"),
    new TextEncoder().encode(JSON.stringify(next))
  );
}

function newCacheId(): string {
  return randomUUID().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}

function countStoredImages(messages: unknown[]): number {
  let count = 0;
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue;
    }
    const images = (message as { images?: unknown }).images;
    if (!Array.isArray(images)) {
      continue;
    }
    for (const image of images) {
      if (image && typeof image === "object" && typeof (image as { base64?: unknown }).base64 === "string") {
        count += 1;
      }
    }
  }
  return count;
}

export async function importCache(): Promise<void> {
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
    void vscode.window.showErrorMessage(
      zh ? "请从本机选文件，不要选远程服务器上的路径。" : "Pick a file on this computer, not on the remote server."
    );
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await fs.readFile(source.fsPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage((zh ? "无法读取这个 JSON：" : "Could not read this JSON: ") + message);
    return;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    void vscode.window.showErrorMessage(zh ? "这不是本插件导出的缓存会话" : "This is not a cached transcript from this extension");
    return;
  }
  const payload = parsed as {
    id?: unknown;
    title?: unknown;
    createdAt?: unknown;
    messageCount?: unknown;
    imageCount?: unknown;
    composerId?: unknown;
    messages?: unknown;
  };
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
  const imageCount =
    typeof payload.imageCount === "number" && Number.isFinite(payload.imageCount)
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
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(dir, `${id}.json`),
    new TextEncoder().encode(JSON.stringify(stored))
  );
  const next = listed.items.filter((item) => item.id !== id);
  next.unshift({ id, title, createdAt, messageCount, imageCount });
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(dir, "index.json"),
    new TextEncoder().encode(JSON.stringify(next))
  );
  void vscode.window.showInformationMessage(zh ? "已导入缓存会话" : "Imported the cached transcript");
}

export async function exportCache(id: string): Promise<void> {
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

export async function forkCache(id: string): Promise<void> {
  const zh = chinese();
  if (!SAFE_ID.test(id)) {
    void vscode.window.showErrorMessage(zh ? "缓存编号无效" : "Invalid cache id");
    return;
  }
  try {
    await vscode.commands.executeCommand("shareImageMirror.forkCache", id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = /not found/i.test(message)
      ? zh
        ? "。Fork 命令写在 Cursor 程序里，只装插件不够。请换 0.10.1 后完全退出 Cursor 再打开（不要只 Reload）。"
        : ". The fork command lives in the Cursor app. Install 0.10.1, then fully quit Cursor and reopen (Reload is not enough)."
      : "";
    void vscode.window.showErrorMessage((zh ? "Fork 失败：" : "Fork failed: ") + message + hint);
  }
}
