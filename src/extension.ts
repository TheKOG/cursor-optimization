import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import {
  candidateHomes,
  collectMirrorDrives,
  expectedAssetsDir,
  normalizePosixDir,
  remoteFileToLocal,
  remotePosixToLocal,
  toCursorProjectSlug,
  toExtendedLengthPath,
} from "./paths";

class CancelledError extends Error {
  constructor() {
    super("已取消");
    this.name = "CancelledError";
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Share Image Mirror");
  context.subscriptions.push(output);
  context.subscriptions.push(
    vscode.commands.registerCommand("shareImageMirror.sync", () => sync(output))
  );

  if (vscode.env.remoteName) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.command = "shareImageMirror.sync";
    item.text = "$(cloud-download) 镜像聊天图片";
    item.tooltip = "把远端聊天图片复制到本机。完成后再分享会话。";
    item.show();
    context.subscriptions.push(item);
  }
}

export function deactivate(): void {}

async function sync(output: vscode.OutputChannel): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "正在镜像远端聊天图片",
        cancellable: true,
      },
      (progress, token) => mirror(output, progress, token)
    );
  } catch (error) {
    if (error instanceof CancelledError) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(message);
    output.show(true);
    void vscode.window.showErrorMessage(message);
  }
}

async function mirror(
  output: vscode.OutputChannel,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
  const folder = await selectFolder();
  const remoteAssets = await resolveRemoteAssets(folder);
  throwIfCancelled(token);

  const drives = collectMirrorDrives({
    appRoot: vscode.env.appRoot,
    cwd: process.cwd(),
    systemDrive: process.env.SystemDrive,
    configured: vscode.workspace.getConfiguration("shareImageMirror").get<string>("localDrive") ?? "",
  });
  const localDirs = drives.map((drive) => remotePosixToLocal(remoteAssets, drive));

  output.clear();
  output.appendLine(`工作区：${folder.uri.path}`);
  output.appendLine(`远端目录：${remoteAssets}`);
  output.appendLine(`本机目录：${localDirs.join(" , ")}`);

  progress.report({ message: "正在列出远端文件" });
  const files = await listFiles(remoteUri(folder, remoteAssets), "", token);
  throwIfCancelled(token);

  if (files.length === 0) {
    const message = `远端目录是空的，没有文件需要镜像：${remoteAssets}`;
    output.appendLine(message);
    void vscode.window.showWarningMessage(message);
    return;
  }

  const failures: string[] = [];
  let copied = 0;
  for (const file of files) {
    throwIfCancelled(token);
    try {
      const bytes = await vscode.workspace.fs.readFile(file.uri);
      for (const drive of drives) {
        const destination = remoteFileToLocal(remoteAssets, file.rel, drive);
        await fs.mkdir(toExtendedLengthPath(path.win32.dirname(destination)), { recursive: true });
        await fs.writeFile(toExtendedLengthPath(destination), bytes);
      }
      copied++;
      output.appendLine(file.rel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${file.rel}: ${message}`);
      output.appendLine(`失败 ${file.rel}: ${message}`);
    }
    progress.report({
      message: `${copied + failures.length}/${files.length}`,
      increment: 100 / files.length,
    });
  }

  if (failures.length > 0) {
    output.show(true);
    const denied = failures.some((line) => /\b(EPERM|EACCES)\b/.test(line));
    const hint = denied
      ? " 在盘符根目录创建 \\root 被拒绝。用管理员身份打开 Cursor，或换 shareImageMirror.localDrive 里的盘符后再同步。"
      : "";
    throw new Error(
      `镜像了 ${copied} 个文件，${failures.length} 个失败。分享会在任意一张读不到的图上失败。详见输出面板 Share Image Mirror。${hint}`
    );
  }

  const where = localDirs.join(" 和 ");
  output.appendLine(`完成，共 ${copied} 个文件。`);
  void vscode.window.showInformationMessage(`已镜像 ${copied} 个文件到 ${where}。现在可以分享。`);
}

async function selectFolder(): Promise<vscode.WorkspaceFolder> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    throw new Error("没有打开的工作区。请先用 Remote SSH 打开远端项目，再执行这条命令。");
  }

  const first = folders[0];
  if (first.uri.scheme === "vscode-remote") {
    return first;
  }

  const remote = folders.find((folder) => folder.uri.scheme === "vscode-remote");
  if (!remote) {
    throw new Error("需要在 Remote SSH 窗口里执行。当前是本地窗口，读不到 Linux 上的图片。");
  }
  return remote;
}

async function resolveRemoteAssets(folder: vscode.WorkspaceFolder): Promise<string> {
  const config = vscode.workspace.getConfiguration("shareImageMirror");
  const override = (config.get<string>("remoteAssetsDir") ?? "").trim();
  if (override) {
    const dir = normalizePosixDir(override);
    if (!(await exists(folder, dir))) {
      throw new Error(`设置的远端目录不存在：${dir}`);
    }
    return dir;
  }

  const workspacePath = folder.uri.path;
  const slug = toCursorProjectSlug(workspacePath);
  const homes = candidateHomes(workspacePath, config.get<string>("remoteHome") ?? "/root");
  const tried: string[] = [];

  for (const home of homes) {
    const assets = expectedAssetsDir(home, slug);
    tried.push(assets);
    if (await exists(folder, assets)) {
      return assets;
    }
  }

  const found: string[] = [];
  for (const home of homes) {
    const projects = `${normalizePosixDir(home)}/.cursor/projects`;
    if (!(await exists(folder, projects))) {
      continue;
    }
    const entries = await vscode.workspace.fs.readDirectory(remoteUri(folder, projects));
    for (const [name, type] of entries) {
      if ((type & vscode.FileType.Directory) === 0) {
        continue;
      }
      const assets = `${projects}/${name}/assets`;
      if (await exists(folder, assets)) {
        found.push(assets);
      }
    }
  }

  const unique = [...new Set(found)];
  if (unique.length === 1) {
    return unique[0];
  }
  if (unique.length > 1) {
    const pick = await vscode.window.showQuickPick(
      unique.map((dir) => ({ label: dir })),
      {
        title: "选择要镜像的远端 assets 目录",
        placeHolder: `当前工作区标识是 ${slug}，没有同名目录`,
      }
    );
    if (!pick) {
      throw new CancelledError();
    }
    return pick.label;
  }

  throw new Error(
    `找不到远端聊天图片目录。工作区 ${workspacePath} 的项目标识是 ${slug}。已尝试：${tried.join("；")}。可以在设置 shareImageMirror.remoteAssetsDir 里填写绝对路径。`
  );
}

interface RemoteFile {
  uri: vscode.Uri;
  rel: string;
}

function remoteUri(folder: vscode.WorkspaceFolder, posixPath: string): vscode.Uri {
  const normalized = posixPath.startsWith("/") ? posixPath : `/${posixPath}`;
  return folder.uri.with({ path: normalized });
}

async function exists(folder: vscode.WorkspaceFolder, posixPath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(remoteUri(folder, posixPath));
    return true;
  } catch {
    return false;
  }
}

async function listFiles(
  dir: vscode.Uri,
  prefix: string,
  token: vscode.CancellationToken
): Promise<RemoteFile[]> {
  throwIfCancelled(token);
  const entries = await vscode.workspace.fs.readDirectory(dir);
  const files: RemoteFile[] = [];
  for (const [name, type] of entries) {
    throwIfCancelled(token);
    if (name === "." || name === "..") {
      continue;
    }
    const child = dir.with({ path: `${dir.path.replace(/\/+$/, "")}/${name}` });
    const rel = prefix ? `${prefix}/${name}` : name;
    if ((type & vscode.FileType.Directory) !== 0) {
      files.push(...(await listFiles(child, rel, token)));
    } else if ((type & vscode.FileType.File) !== 0) {
      files.push({ uri: child, rel });
    }
  }
  return files;
}

function throwIfCancelled(token: vscode.CancellationToken): void {
  if (token.isCancellationRequested) {
    throw new CancelledError();
  }
}
