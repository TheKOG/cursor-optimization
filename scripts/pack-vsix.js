"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
const vsix = path.join(src, `${pkg.name}-${pkg.version}.vsix`);
const vsce = path.join(src, "node_modules", "@vscode", "vsce", "vsce");
if (!fs.existsSync(vsce)) {
  console.error("Install @vscode/vsce first: npm install");
  process.exit(1);
}

fs.rmSync(vsix, { force: true });
const run = spawnSync(
  process.execPath,
  [vsce, "package", "--no-dependencies", "--out", vsix],
  { cwd: src, encoding: "utf8" }
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status || 1);
console.log("vsix", vsix, fs.statSync(vsix).size);
