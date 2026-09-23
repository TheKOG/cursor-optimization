import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface ShareTrimFlags {
  trim: boolean;
  regenerateLink: boolean;
  minAttempts: number;
  maxAttempts: number;
}

export function flagsPath(): string {
  return path.join(os.homedir(), ".cursor", "share-image-mirror.json");
}

function clampAttempt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(50, Math.max(1, n));
}

export function readFlags(): ShareTrimFlags {
  const config = vscode.workspace.getConfiguration("shareImageMirror");
  let minAttempts = clampAttempt(config.get("minAttempts"), 1);
  let maxAttempts = clampAttempt(config.get("maxAttempts"), 16);
  if (minAttempts > maxAttempts) {
    minAttempts = maxAttempts;
  }
  return {
    trim: config.get<boolean>("trimEnabled") !== false,
    regenerateLink: config.get<boolean>("regenerateLink") !== false,
    minAttempts,
    maxAttempts,
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
