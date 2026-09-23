import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface ShareMirrorFlags {
  trim: boolean;
  uploadImages: boolean;
  regenerateLink: boolean;
}

export function flagsPath(): string {
  return path.join(os.homedir(), ".cursor", "share-image-mirror.json");
}

export function readFlags(): ShareMirrorFlags {
  const config = vscode.workspace.getConfiguration("shareImageMirror");
  return {
    trim: config.get<boolean>("trimEnabled") !== false,
    uploadImages: config.get<boolean>("uploadImages") !== false,
    regenerateLink: config.get<boolean>("regenerateLink") !== false,
  };
}

export async function writeFlags(flags: ShareMirrorFlags = readFlags()): Promise<void> {
  const file = flagsPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(flags, null, 2)}\n`, "utf8");
}
