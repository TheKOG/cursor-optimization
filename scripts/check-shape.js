"use strict";
const fs = require("fs");
const {
  discoverSymbols,
  findEditorMenus,
  findForkSites,
  findMenuSites,
  findShareCommand,
  findShareHeads,
  findShareSends,
} = require("../out/workbenchShape");

const files = {
  desktop:
    "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js",
  glass:
    "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.glass.main.js",
};

for (const [name, file] of Object.entries(files)) {
  const source = fs.readFileSync(file, "utf8");
  const forks = findForkSites(source);
  const symbols = forks[0] ? discoverSymbols(source, forks[0].index) : undefined;
  const command = findShareCommand(source);
  console.log("\n==", name);
  const stripped = source.replace(
    /\]:\[\],\(\(\)=>\{let __n="Cursor Optimization"[\s\S]*?\}\)\(\),(\w+)\(\{id:\w+,label:"Copy Request ID"/,
    "]:[],$1({id:ZZ,label:\"Copy Request ID\""
  );
  console.log(
    "menus",
    findMenuSites(source).length,
    "menus-if-unpatched",
    stripped === source ? "unchanged" : findMenuSites(stripped).length,
    "editors",
    findEditorMenus(source).length
  );
  const heads = findShareHeads(source);
  const sends = findShareSends(source);
  console.log("heads", heads.map((item) => item.from));
  console.log("sends", sends);
  console.log("forks", forks.length, forks[0] && forks[0].from);
  console.log("symbols", symbols);
  console.log(
    "command",
    command && {
      className: command.className,
      base: command.base,
      shareId: command.shareId,
      decorator: command.decorator,
      register: command.register,
      accessor: command.accessor,
      arg: command.arg,
      service: command.service,
      resolver: command.resolver,
    }
  );
}
