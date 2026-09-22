"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  candidateHomes,
  collectMirrorDrives,
  expectedAssetsDir,
  normalizeDrive,
  remoteFileToLocal,
  remotePosixToLocal,
  toCursorProjectSlug,
  toExtendedLengthPath,
} = require("../out/paths");

function testSlug() {
  assert.strictEqual(toCursorProjectSlug("/data/workspace/main"), "data-workspace-main");
  assert.strictEqual(
    toCursorProjectSlug("C:\\Users\\jekywang\\AppData\\Local\\Temp\\b74939c8-4268-458c-8650-93197e84ad6d"),
    "C-Users-jekywang-AppData-Local-Temp-b74939c8-4268-458c-8650-93197e84ad6d"
  );
  assert.strictEqual(toCursorProjectSlug("c:\\Users\\jekywang"), "c-Users-jekywang");
  assert.strictEqual(toCursorProjectSlug("\\data\\workspace\\main"), "data-workspace-main");
}

function testLocalPath() {
  const remote = "/root/.cursor/projects/data-workspace-main/assets";
  assert.strictEqual(
    remotePosixToLocal(remote, "C:"),
    "C:\\root\\.cursor\\projects\\data-workspace-main\\assets"
  );
  const file = remoteFileToLocal(
    remote,
    "c__Users_jekywang_image-36bd8988-f332-4542-b75f-b57d33ed049c.jpg",
    "C:"
  );
  assert.strictEqual(
    file,
    "C:\\root\\.cursor\\projects\\data-workspace-main\\assets\\c__Users_jekywang_image-36bd8988-f332-4542-b75f-b57d33ed049c.jpg"
  );
}

function testDrives() {
  assert.deepStrictEqual(
    collectMirrorDrives({
      appRoot: "C:\\Users\\jekywang\\AppData\\Local\\Programs\\cursor\\resources\\app",
      cwd: "C:\\Users\\jekywang",
      systemDrive: "C:",
      configured: "",
    }),
    ["C:"]
  );
  assert.deepStrictEqual(
    collectMirrorDrives({
      appRoot: "C:\\cursor\\resources\\app",
      cwd: "D:\\work",
      systemDrive: "C:",
      configured: "",
    }),
    ["C:", "D:"]
  );
  assert.deepStrictEqual(
    collectMirrorDrives({
      appRoot: "C:\\cursor\\resources\\app",
      cwd: "C:\\Users\\jekywang",
      systemDrive: "C:",
      configured: "d",
    }),
    ["D:"]
  );
  assert.strictEqual(normalizeDrive("C:\\"), "C:");
  assert.throws(() =>
    collectMirrorDrives({
      appRoot: "C:\\cursor",
      cwd: "C:\\",
      configured: "not-a-drive",
    })
  );
}

function testHomes() {
  assert.deepStrictEqual(candidateHomes("/data/workspace/main", "/root"), ["/root"]);
  assert.deepStrictEqual(candidateHomes("/home/ubuntu/src/app", "/root"), ["/root", "/home/ubuntu"]);
  assert.strictEqual(
    expectedAssetsDir("/root", "data-workspace-main"),
    "/root/.cursor/projects/data-workspace-main/assets"
  );
}

function testExtendedWrite() {
  const dir = path.join(os.tmpdir(), "share-image-mirror-test");
  const destination = path.join(dir, "assets", "image.jpg");
  const extended = toExtendedLengthPath(destination);
  fs.mkdirSync(path.win32.dirname(extended), { recursive: true });
  fs.writeFileSync(extended, Buffer.from("ok"));
  assert.strictEqual(fs.readFileSync(destination, "utf8"), "ok");
  fs.rmSync(dir, { recursive: true, force: true });
}

testSlug();
testLocalPath();
testDrives();
testHomes();
testExtendedWrite();
console.log("paths tests passed");
