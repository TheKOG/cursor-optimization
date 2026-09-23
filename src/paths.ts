import * as path from "path";

/**
 * Cursor stores per-workspace data under ~/.cursor/projects/<slug>.
 * The slug replaces every non-alphanumeric character with "-", collapses
 * repeats, then trims leading and trailing hyphens.
 */
export function toCursorProjectSlug(workspacePath: string): string {
  return workspacePath
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePosixDir(input: string): string {
  let value = input.trim().replace(/\\/g, "/");
  if (!value.startsWith("/")) {
    value = `/${value}`;
  }
  value = value.replace(/\/+$/, "");
  return value || "/";
}

export function expectedAssetsDir(home: string, slug: string): string {
  return `${normalizePosixDir(home)}/.cursor/projects/${slug}/assets`;
}

export function candidateHomes(workspacePath: string, configuredHome: string): string[] {
  const homes: string[] = [];
  const add = (home: string | undefined) => {
    if (!home || !home.trim()) {
      return;
    }
    const normalized = normalizePosixDir(home);
    if (!homes.includes(normalized)) {
      homes.push(normalized);
    }
  };

  add(configuredHome);
  add("/root");

  const posix = workspacePath.replace(/\\/g, "/");
  const homeMatch = posix.match(/^\/(?:home|Users)\/[^/]+/);
  if (homeMatch) {
    add(homeMatch[0]);
  }
  return homes;
}

/** "C:\\", "c", and "D:" all become "C:" / "D:". Invalid input returns undefined. */
export function normalizeDrive(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const letter = trimmed.replace(/[\\/]/g, "").replace(/:$/, "");
  if (!/^[A-Za-z]$/.test(letter)) {
    return undefined;
  }
  return `${letter.toUpperCase()}:`;
}

export function collectMirrorDrives(options: {
  appRoot: string;
  cwd: string;
  systemDrive?: string;
  configured: string;
  fixedDrives?: string[];
}): string[] {
  if (options.configured.trim()) {
    const drive = normalizeDrive(options.configured);
    if (!drive) {
      throw new Error(`盘符无效：${options.configured}。请填写 C: 这种格式。`);
    }
    return [drive];
  }

  const drives: string[] = [];
  const roots = [
    path.win32.parse(options.appRoot).root,
    options.systemDrive ?? "",
    path.win32.parse(options.cwd).root,
    ...(options.fixedDrives ?? []),
  ];
  for (const root of roots) {
    const drive = normalizeDrive(root);
    if (drive && !drives.includes(drive)) {
      drives.push(drive);
    }
  }
  if (drives.length === 0) {
    drives.push("C:");
  }
  return drives;
}

/**
 * `/root/.cursor/.../assets` is opened by the Windows client as `\root\.cursor\...\assets`,
 * which is the same location as `{drive}:\root\.cursor\...\assets`.
 */
export function remotePosixToLocal(remotePosix: string, drive: string): string {
  const relative = remotePosix.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\//g, "\\");
  return `${drive}\\${relative}`;
}

export function remoteFileToLocal(remoteAssetsDir: string, relativePosix: string, drive: string): string {
  const base = remotePosixToLocal(remoteAssetsDir, drive);
  const parts = relativePosix.split("/").filter(Boolean);
  return path.win32.join(base, ...parts);
}

/** Win32 extended-length path, so long encoded image names are not truncated at MAX_PATH. */
export function toExtendedLengthPath(winPath: string): string {
  const normalized = path.win32.normalize(winPath);
  if (normalized.startsWith("\\\\?\\")) {
    return normalized;
  }
  if (normalized.startsWith("\\\\")) {
    return `\\\\?\\UNC\\${normalized.slice(2)}`;
  }
  return `\\\\?\\${normalized}`;
}
