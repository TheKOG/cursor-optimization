import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { writeFlags } from "./flags";
import { ShareTrimPanelProvider } from "./panel";
import { applyEditorTitleCachePatch, applyGlassShareCachePatch, applyShareCachePatch, applyShareErrorPatch, applyShareTrimPatch } from "./sharePatch";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Cursor Optimization");
  context.subscriptions.push(output);
  void writeFlags().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[share-trim] 写入开关失败 ${message}`);
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "shareImageMirror.panel",
      new ShareTrimPanelProvider(context)
    )
  );
  void logPatchStatus(output);
  context.subscriptions.push(
    vscode.commands.registerCommand("shareImageMirror.trimAndShare", () => trimAndShare(output))
  );
}

export function deactivate(): void {}

const WORKBENCH_RELATIVE = ["out", "vs", "workbench", "workbench.desktop.main.js"];
const GLASS_RELATIVE = ["out", "vs", "workbench", "workbench.glass.main.js"];

async function logPatchStatus(output: vscode.OutputChannel): Promise<void> {
  const file = path.join(vscode.env.appRoot, ...WORKBENCH_RELATIVE);
  output.appendLine(`[share-trim] 检查 ${file}`);
  try {
    const source = await fs.readFile(file, "utf8");
    const stat = await fs.stat(file);
    output.appendLine(`[share-trim] 磁盘裁剪补丁=${source.includes("/*share-trim-1*/")}`);
    output.appendLine(`[share-trim] 磁盘缓存补丁=${source.includes("/*share-cache-1*/")}`);
    const glass = path.join(vscode.env.appRoot, ...GLASS_RELATIVE);
    const glassSource = await fs.readFile(glass, "utf8");
    output.appendLine(`[share-trim] 玻璃窗缓存补丁=${glassSource.includes("/*share-cache-1*/")}`);
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
  const failure = applyShareErrorPatch(share.source);
  const cached = applyShareCachePatch(failure.source);
  const desktopMenu = applyEditorTitleCachePatch(cached.source);
  const glassFile = path.join(vscode.env.appRoot, ...GLASS_RELATIVE);
  let glassStatus: "inserted" | "already" | "missing-anchor" | "unreadable" = "unreadable";
  try {
    const glassSource = await fs.readFile(glassFile, "utf8");
    const glass = applyGlassShareCachePatch(glassSource);
    glassStatus = glass.status;
    const glassMenu = applyEditorTitleCachePatch(glass.status === "inserted" ? glass.source : glassSource);
    if (glass.status === "inserted" || glassMenu.status === "inserted") {
      const next = glassMenu.status === "inserted" ? glassMenu.source : glass.source;
      await fs.writeFile(glassFile, next);
      output.appendLine(`已写入玻璃窗会话缓存：${glassFile}`);
    }
    if (glassMenu.status === "inserted") {
      glassStatus = "inserted";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[share-trim] 玻璃窗补丁失败 ${message}`);
  }
  if (share.status === "missing-anchor" && failure.status === "missing-anchor" && cached.status === "missing-anchor") {
    void vscode.window.showErrorMessage(
      "当前 Cursor 版本对不上，无法安装Cursor Optimization。这个补丁是按 3.21.16 写的。"
    );
    return;
  }
  if (share.status === "inserted" || failure.status === "inserted" || cached.status === "inserted" || desktopMenu.status === "inserted") {
    await fs.writeFile(file, desktopMenu.status === "inserted" ? desktopMenu.source : cached.source);
    output.appendLine(`已写入Cursor Optimization：${file}`);
    if (cached.status === "inserted" || desktopMenu.status === "inserted" || glassStatus === "inserted") {
      void vscode.window.showInformationMessage(
        "已装上会话缓存。请完全退出 Cursor 再打开。聊天菜单里会出现 Cache Transcript，控制面板里会出现本地会话列表。"
      );
      return;
    }
    const choice = await vscode.window.showInformationMessage(
      "已装上Cursor Optimization。重新加载窗口后，再点 Share Transcript。整段超限时，会留下服务器还能接受的最长一段并分享。",
      "重新加载"
    );
    if (choice === "重新加载") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
    return;
  }
  if (glassStatus === "inserted") {
    void vscode.window.showInformationMessage(
      "已装上会话缓存。请完全退出 Cursor 再打开。聊天菜单里 Share Transcript 下面会出现 Cache Transcript。"
    );
    return;
  }
  const choice = await vscode.window.showInformationMessage(
    "Cursor Optimization已经在程序里。如果这次窗口是在安装之后打开的，直接点分享即可。否则先重新加载。",
    "打开分享",
    "重新加载"
  );
  if (choice === "打开分享") {
    await vscode.commands.executeCommand("composer.shareChat");
  } else if (choice === "重新加载") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}
