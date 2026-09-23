"use strict";
const fs = require("fs");
const file =
  "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js";
const source = fs.readFileSync(file, "utf8");
const needles = process.argv.slice(2);
for (const needle of needles) {
  let from = 0;
  let n = 0;
  while (n < 8) {
    const at = source.indexOf(needle, from);
    if (at < 0) break;
    n += 1;
    const start = Math.max(0, at - 180);
    const end = Math.min(source.length, at + needle.length + 420);
    console.log("\n====", needle, "hit", n, "at", at, "====");
    console.log(source.slice(start, end).replace(/\n/g, "\\n"));
    from = at + needle.length;
  }
  if (n === 0) console.log("\n====", needle, "MISSING ====");
}
