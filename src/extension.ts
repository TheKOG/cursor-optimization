import { execFile } from "child_process";
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
import { writeFlags } from "./flags";
import { ShareMirrorPanelProvider } from "./panel";
import { applyImagePathPatch, applyShareTrimPatch } from "./sharePatch";

class CancelledError extends Error {
  constructor() {
    super("已取消");
    this.name = "CancelledError";
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Share Image Mirror");
  context.subscriptions.push(output);
  void writeFlags().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[share-trim] 写入开关失败 ${message}`);
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "shareImageMirror.panel",
      new ShareMirrorPanelProvider(context)
    )
  );
  void logPatchStatus(output);
  context.subscriptions.push(
    vscode.commands.registerCommand("shareImageMirror.sync", () => sync(output)),
    vscode.commands.registerCommand("shareImageMirror.trimAndShare", () => trimAndShare(output))
  );

  if (vscode.env.remoteName) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.command = "shareImageMirror.sync";
    item.text = "$(cloud-download) 镜像聊天图片";
    item.tooltip = "把远端聊天图片复制到本机。完成后再分享会话。";
    item.show();
    context.subscriptions.push(item);
    const timer = setTimeout(() => {
      void sync(output, { quiet: true });
    }, 1500);
    context.subscriptions.push({ dispose: () => clearTimeout(timer) });
    context.subscriptions.push({
      dispose: () => {
        if (watchTimer) {
          clearInterval(watchTimer);
          watchTimer = undefined;
        }
      },
    });
  }
}

export function deactivate(): void {}

const WORKBENCH_RELATIVE = ["out", "vs", "workbench", "workbench.desktop.main.js"];

async function logPatchStatus(output: vscode.OutputChannel): Promise<void> {
  const file = path.join(vscode.env.appRoot, ...WORKBENCH_RELATIVE);
  output.appendLine(`[share-trim] 检查 ${file}`);
  try {
    const source = await fs.readFile(file, "utf8");
    const stat = await fs.stat(file);
    output.appendLine(`[share-trim] 磁盘裁剪补丁=${source.includes("/*share-trim-1*/")}`);
    output.appendLine(`[share-trim] 磁盘盘符补丁=${source.includes("/*root-drive-1*/")}`);
    output.appendLine(`[share-trim] 文件修改时间=${stat.mtime.toISOString()}`);
    output.appendLine("[share-trim] 完全退出并重新打开 Cursor 后，开发者工具控制台应出现 [share-trim] patch-loaded。点分享后应出现 [share-trim] start。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[share-trim] 读程序文件失败 ${message}`);
  }
}

async function trimAndShare(output: vscode.OutputChannel): Promise<void> {
  const file = path.join(vscode.env.appRoot, ...WORKBENCH_RELATIVE);
  let source: string;
  try {
    source = await fs.readFile(file, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`读不到 Cursor 程序文件：${message}`);
    return;
  }
  const share = applyShareTrimPatch(source);
  const image = applyImagePathPatch(share.source);
  if (share.status === "missing-anchor") {
    void vscode.window.showErrorMessage(
      "当前 Cursor 版本对不上，无法安装分享裁剪。这个补丁是按 3.21.16 写的。"
    );
    return;
  }
  if (share.status === "inserted" || image.status === "inserted") {
    await fs.writeFile(file, image.source);
    output.appendLine(`已写入分享裁剪：${file}`);
    const choice = await vscode.window.showInformationMessage(
      "已装上分享裁剪。重新加载窗口后，再点 Share Transcript。整段超限时，会留下服务器还能接受的最长一段并分享。",
      "重新加载"
    );
    if (choice === "重新加载") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
    return;
  }
  const choice = await vscode.window.showInformationMessage(
    "分享裁剪已经在程序里。如果这次窗口是在安装之后打开的，直接点分享即可。否则先重新加载。",
    "打开分享",
    "重新加载"
  );
  if (choice === "打开分享") {
    await vscode.commands.executeCommand("composer.shareChat");
  } else if (choice === "重新加载") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}

const neverCancelled: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
};

let syncing: Promise<void> | undefined;
let watchTimer: ReturnType<typeof setInterval> | undefined;
const mirrored = new Set<string>();
let mirrorTarget: {
  folder: vscode.WorkspaceFolder;
  remoteAssets: string;
  drives: string[];
} | undefined;

async function sync(output: vscode.OutputChannel, options?: { quiet?: boolean }): Promise<void> {
  if (syncing) {
    return syncing;
  }
  syncing = runSync(output, options?.quiet === true).finally(() => {
    syncing = undefined;
  });
  return syncing;
}

async function runSync(output: vscode.OutputChannel, quiet: boolean): Promise<void> {
  try {
    if (quiet) {
      await mirror(output, { report() {} }, neverCancelled, true);
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "正在镜像远端聊天图片",
        cancellable: true,
      },
      (progress, token) => mirror(output, progress, token, false)
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
  token: vscode.CancellationToken,
  quiet: boolean
): Promise<void> {
  const folder = await selectFolder();
  const remoteAssets = await resolveRemoteAssets(folder);
  throwIfCancelled(token);

  const drives = collectMirrorDrives({
    appRoot: vscode.env.appRoot,
    cwd: process.cwd(),
    systemDrive: process.env.SystemDrive,
    configured: vscode.workspace.getConfiguration("shareImageMirror").get<string>("localDrive") ?? "",
    fixedDrives: await listFixedDrives(),
  });
  const localDirs = drives.map((drive) => remotePosixToLocal(remoteAssets, drive));

  mirrorTarget = { folder, remoteAssets, drives };
  ensureWatch(output);

  if (!quiet) {
    output.clear();
  }
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
  let skipped = 0;
  for (const file of files) {
    throwIfCancelled(token);
    try {
      if (await localCopyIsCurrent(file.uri, remoteAssets, file.rel, drives)) {
        skipped++;
        mirrored.add(file.rel);
        continue;
      }
      await writeMirror(file.uri, remoteAssets, file.rel, drives);
      mirrored.add(file.rel);
      copied++;
      output.appendLine(file.rel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${file.rel}: ${message}`);
      output.appendLine(`失败 ${file.rel}: ${message}`);
    }
    progress.report({
      message: `${copied + skipped + failures.length}/${files.length}`,
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
  output.appendLine(`完成，新复制 ${copied} 个，跳过已有 ${skipped} 个。`);
  if (copied > 0) {
    void vscode.window.showInformationMessage(`已镜像 ${copied} 个新文件到 ${where}。现在可以分享。`);
  }
}

function ensureWatch(output: vscode.OutputChannel): void {
  if (watchTimer) {
    return;
  }
  watchTimer = setInterval(() => {
    void mirrorIncoming(output);
  }, 5000);
}

async function mirrorIncoming(output: vscode.OutputChannel): Promise<void> {
  if (!mirrorTarget || syncing) {
    return;
  }
  const target = mirrorTarget;
  syncing = (async () => {
    let files: RemoteFile[];
    try {
      files = await listFiles(remoteUri(target.folder, target.remoteAssets), "", neverCancelled);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`检查新图片失败：${message}`);
      return;
    }
    const fresh = files.filter((file) => !mirrored.has(file.rel));
    if (fresh.length === 0) {
      return;
    }
    let copied = 0;
    for (const file of fresh) {
      try {
        await writeMirror(file.uri, target.remoteAssets, file.rel, target.drives);
        mirrored.add(file.rel);
        copied++;
        output.appendLine(`新图片 ${file.rel}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`失败 ${file.rel}: ${message}`);
      }
    }
    if (copied > 0) {
      void vscode.window.showInformationMessage(`已镜像 ${copied} 张新图片。`);
    }
  })().finally(() => {
    syncing = undefined;
  });
  return syncing;
}

async function localCopyIsCurrent(
  remote: vscode.Uri,
  remoteAssets: string,
  rel: string,
  drives: string[]
): Promise<boolean> {
  const stat = await vscode.workspace.fs.stat(remote);
  for (const drive of drives) {
    const destination = remoteFileToLocal(remoteAssets, rel, drive);
    try {
      const local = await fs.stat(toExtendedLengthPath(destination));
      if (!local.isFile() || local.size !== stat.size) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return drives.length > 0;
}

async function writeMirror(
  remote: vscode.Uri,
  remoteAssets: string,
  rel: string,
  drives: string[]
): Promise<void> {
  const bytes = await vscode.workspace.fs.readFile(remote);
  for (const drive of drives) {
    const destination = remoteFileToLocal(remoteAssets, rel, drive);
    await fs.mkdir(toExtendedLengthPath(path.win32.dirname(destination)), { recursive: true });
    await fs.writeFile(toExtendedLengthPath(destination), bytes);
  }
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

function listFixedDrives(): Promise<string[]> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\").DeviceID",
      ],
      { windowsHide: true, timeout: 8000 },
      (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        resolve(
          stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => /^[A-Za-z]:$/.test(line))
        );
      }
    );
  });
}
