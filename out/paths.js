"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCursorProjectSlug = toCursorProjectSlug;
exports.normalizePosixDir = normalizePosixDir;
exports.expectedAssetsDir = expectedAssetsDir;
exports.candidateHomes = candidateHomes;
exports.normalizeDrive = normalizeDrive;
exports.collectMirrorDrives = collectMirrorDrives;
exports.remotePosixToLocal = remotePosixToLocal;
exports.remoteFileToLocal = remoteFileToLocal;
exports.toExtendedLengthPath = toExtendedLengthPath;
const path = __importStar(require("path"));
/**
 * Cursor stores per-workspace data under ~/.cursor/projects/<slug>.
 * The slug replaces every non-alphanumeric character with "-", collapses
 * repeats, then trims leading and trailing hyphens.
 */
function toCursorProjectSlug(workspacePath) {
    return workspacePath
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function normalizePosixDir(input) {
    let value = input.trim().replace(/\\/g, "/");
    if (!value.startsWith("/")) {
        value = `/${value}`;
    }
    value = value.replace(/\/+$/, "");
    return value || "/";
}
function expectedAssetsDir(home, slug) {
    return `${normalizePosixDir(home)}/.cursor/projects/${slug}/assets`;
}
function candidateHomes(workspacePath, configuredHome) {
    const homes = [];
    const add = (home) => {
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
function normalizeDrive(input) {
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
function collectMirrorDrives(options) {
    if (options.configured.trim()) {
        const drive = normalizeDrive(options.configured);
        if (!drive) {
            throw new Error(`盘符无效：${options.configured}。请填写 C: 这种格式。`);
        }
        return [drive];
    }
    const drives = [];
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
function remotePosixToLocal(remotePosix, drive) {
    const relative = remotePosix.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\//g, "\\");
    return `${drive}\\${relative}`;
}
function remoteFileToLocal(remoteAssetsDir, relativePosix, drive) {
    const base = remotePosixToLocal(remoteAssetsDir, drive);
    const parts = relativePosix.split("/").filter(Boolean);
    return path.win32.join(base, ...parts);
}
/** Win32 extended-length path, so long encoded image names are not truncated at MAX_PATH. */
function toExtendedLengthPath(winPath) {
    const normalized = path.win32.normalize(winPath);
    if (normalized.startsWith("\\\\?\\")) {
        return normalized;
    }
    if (normalized.startsWith("\\\\")) {
        return `\\\\?\\UNC\\${normalized.slice(2)}`;
    }
    return `\\\\?\\${normalized}`;
}
//# sourceMappingURL=paths.js.map