import * as os from "os";
import * as path from "path";
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
        ? "。请完全退出 Cursor 后再打开，让 Fork 命令装上。"
        : ". Quit Cursor completely and reopen it so the fork command can load."
      : "";
    void vscode.window.showErrorMessage((zh ? "Fork 失败：" : "Fork failed: ") + message + hint);
  }
}
