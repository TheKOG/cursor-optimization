"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..");
const stage = path.join(process.env.TEMP, "cursor-optimization-vsix");
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, "extension", "out"), { recursive: true });
fs.mkdirSync(path.join(stage, "extension", "media"), { recursive: true });

for (const name of ["package.json", "README.md"]) {
  fs.copyFileSync(path.join(src, name), path.join(stage, "extension", name));
}
for (const name of fs.readdirSync(path.join(src, "out"))) {
  if (name.endsWith(".js")) {
    fs.copyFileSync(path.join(src, "out", name), path.join(stage, "extension", "out", name));
  }
}
const mediaDir = path.join(src, "media");
if (fs.existsSync(mediaDir)) {
  for (const name of fs.readdirSync(mediaDir)) {
    fs.copyFileSync(path.join(mediaDir, name), path.join(stage, "extension", "media", name));
  }
}

fs.writeFileSync(
  path.join(stage, "extension.vsixmanifest"),
  `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="cursor-optimization" Version="0.0.4" Publisher="TheKOG"/>
    <DisplayName>Cursor Optimization</DisplayName>
    <Description>Trim oversized shares and cache a full transcript for a local fork.</Description>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
`
);

const contentTypesName = "[Content_Types].xml";
fs.writeFileSync(
  path.join(stage, contentTypesName),
  `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js" ContentType="application/javascript"/>
  <Default Extension="md" ContentType="text/markdown"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
</Types>
`
);

const vsix = path.join(src, "cursor-optimization-0.0.4.vsix");
fs.rmSync(vsix, { force: true });
const stagePs = stage.replace(/'/g, "''");
const vsixPs = vsix.replace(/'/g, "''");
const command = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stage = '${stagePs}'
$vsix = '${vsixPs}'
$zip = [System.IO.Compression.ZipFile]::Open($vsix, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -LiteralPath $stage -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($stage.Length + 1).Replace('\\', '/')
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel)
}
$zip.Dispose()
`;
const run = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status || 1);
console.log("vsix", fs.statSync(vsix).size);
