import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { writeFlags } from "./flags";
import { ShareTrimPanelProvider } from "./panel";
import { applyShareTrimPatch } from "./sharePatch";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Share Trim");
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

async function logPatchStatus(output: vscode.OutputChannel): Promise<void> {
  const file = path.join(vscode.env.appRoot, ...WORKBENCH_RELATIVE);
  output.appendLine(`[share-trim] 检查 ${file}`);
  try {
    const source = await fs.readFile(file, "utf8");
    const stat = await fs.stat(file);
    output.appendLine(`[share-trim] 磁盘裁剪补丁=${source.includes("/*share-trim-1*/")}`);
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
  if (share.status === "missing-anchor") {
    void vscode.window.showErrorMessage(
      "当前 Cursor 版本对不上，无法安装分享裁剪。这个补丁是按 3.21.16 写的。"
    );
    return;
  }
  if (share.status === "inserted") {
    await fs.writeFile(file, share.source);
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
