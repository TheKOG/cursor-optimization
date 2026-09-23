"use strict";

const fs = require("fs");
const file =
  "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js";
let source = fs.readFileSync(file, "utf8");

if (source.includes("/*share-regen-flag-1*/")) {
  console.log("already");
  process.exit(0);
}

const helper =
  'const __readShareRefresh=async()=>{/*share-regen-flag-1*/try{const home=typeof process!=="undefined"&&process.env?process.env.USERPROFILE||process.env.HOME||"":"";if(!home)return true;const uri=we.file(home+"/.cursor/share-image-mirror.json");const result=await n.oalToolPopulationService._composerFileService.readFile({uri,composerData:f});const raw=result.value.buffer;const text=new TextDecoder().decode(raw instanceof ArrayBuffer?new Uint8Array(raw):raw);const json=JSON.parse(text);const on=json.regenerateLink!==false;console.warn("[share-trim] flags regenerate="+on);return on}catch(err){console.warn("[share-trim] flags fallback",err&&(err.message||String(err)));return true}};';

const beforeN = "const N=!!(A&&D);";
if (source.split(beforeN).length - 1 !== 1) {
  console.error("N anchor", source.split(beforeN).length - 1);
  process.exit(2);
}
source = source.replace(beforeN, helper + beforeN);

const glassFrom = "if(l.isGlass){if(N){try{";
const glassTo = "if(l.isGlass){if(N&&await __readShareRefresh()){try{";
if (!source.includes(glassFrom)) {
  console.error("glass anchor missing");
  process.exit(3);
}
source = source.replace(glassFrom, glassTo);

const dialogFrom =
  "try{/*share-refresh-1*/const __prev=A;const W=await L(N?P:Xf_(v));";
const dialogTo =
  'try{/*share-refresh-1*/const __regen=await __readShareRefresh();if(__regen||!N){const __prev=A;const W=await L(N?P:Xf_(v));';
if (!source.includes(dialogFrom)) {
  console.error("dialog anchor missing");
  process.exit(4);
}
source = source.replace(dialogFrom, dialogTo);

const closeFrom =
  'console.warn("[share-trim] refreshed",A,"replaced",__prev||"");if(!D||!A){';
const closeTo =
  'console.warn("[share-trim] refreshed",A,"replaced",__prev||"")}else console.warn("[share-trim] regenerate off, keeping",A||"");if(!D||!A){';
if (!source.includes(closeFrom)) {
  console.error("close anchor missing");
  process.exit(5);
}
source = source.replace(closeFrom, closeTo);

const optsFrom =
  'const opts={trim:json.trim!==false,uploadImages:json.uploadImages!==false};console.warn("[share-trim] flags trim="+opts.trim+" images="+opts.uploadImages);';
const optsTo =
  'const opts={trim:json.trim!==false,uploadImages:json.uploadImages!==false,regenerateLink:json.regenerateLink!==false};console.warn("[share-trim] flags trim="+opts.trim+" images="+opts.uploadImages+" regenerate="+opts.regenerateLink);';
if (!source.includes(optsFrom)) {
  console.error("opts anchor missing");
  process.exit(6);
}
source = source.replace(optsFrom, optsTo);
source = source.replace(
  "const fallback={trim:true,uploadImages:true};",
  "const fallback={trim:true,uploadImages:true,regenerateLink:true};"
);

fs.writeFileSync(file, source);
console.log("patched");
