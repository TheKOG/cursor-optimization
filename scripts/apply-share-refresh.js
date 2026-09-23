"use strict";

const fs = require("fs");
const file =
  "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js";
let source = fs.readFileSync(file, "utf8");

if (source.includes("/*share-refresh-1*/")) {
  console.log("already");
  process.exit(0);
}

const dropOld = [
  "try{const __listed=await n.listOwnSharedConversationsForComposer(g);",
  "for(const __item of __listed){if(__item.shareId&&__item.shareId!==__keep)await n.deleteSharedConversation(__item.shareId)}",
  "}catch(__e){console.warn(\"[share-trim] old shares kept\",__e&&(__e.message||String(__e)))}",
].join("");

const glassFrom = "if(l.isGlass){const B=await x,U=Zf_(v)";
const glassTo = [
  "if(l.isGlass){if(N){try{const __refreshed=await L(P);const __keep=__refreshed.shareId;",
  dropOld,
  "A=__refreshed.shareId,D=__refreshed.shareUrl,P=__refreshed.visibility;",
  "console.warn(\"[share-trim] refreshed\",A)",
  "}catch(__e){console.warn(\"[share-trim] refresh failed\",__e&&(__e.message||String(__e)))}}",
  "const B=await x,U=Zf_(v)",
].join("");

const dialogFrom =
  "try{if(!N){const W=await L(Xf_(v));A=W.shareId,D=W.shareUrl,P=W.visibility}if(!D||!A){";
const dialogTo = [
  "try{/*share-refresh-1*/const __prev=A;const W=await L(N?P:Xf_(v));A=W.shareId,D=W.shareUrl,P=W.visibility;",
  "const __keep=A;",
  dropOld,
  "console.warn(\"[share-trim] refreshed\",A,\"replaced\",__prev||\"\");",
  "if(!D||!A){",
].join("");

if (!source.includes(glassFrom) || !source.includes(dialogFrom)) {
  console.error("anchors missing");
  process.exit(2);
}
source = source.replace(glassFrom, glassTo).replace(dialogFrom, dialogTo);
fs.writeFileSync(file, source);
console.log("patched");
