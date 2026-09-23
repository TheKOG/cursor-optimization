import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface ShareTrimFlags {
  trim: boolean;
  regenerateLink: boolean;
}

export function flagsPath(): string {
  return path.join(os.homedir(), ".cursor", "share-image-mirror.json");
}

export function readFlags(): ShareTrimFlags {
  const config = vscode.workspace.getConfiguration("shareImageMirror");
  return {
    trim: config.get<boolean>("trimEnabled") !== false,
    regenerateLink: config.get<boolean>("regenerateLink") !== false,
  };
}

export async function writeFlags(flags: ShareTrimFlags = readFlags()): Promise<void> {
  const file = flagsPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    `${JSON.stringify({ ...flags, uploadImages: false }, null, 2)}\n`,
    "utf8"
  );
}
