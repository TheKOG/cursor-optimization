"use strict";

const fs = require("fs");
const { buildShareTrimRuntime } = require("../out/sharePatch");

const file =
  "C:/Users/jekywang/AppData/Local/Programs/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js";
let source = fs.readFileSync(file, "utf8");

const runtimeStart = source.indexOf("/*share-trim-1*/");
const runtimeEnd = source.indexOf("}if(!UQe())", runtimeStart);
if (runtimeStart < 0 || runtimeEnd < 0) {
  console.error("runtime markers", runtimeStart, runtimeEnd);
  process.exit(2);
}
source =
  source.slice(0, runtimeStart) +
  "/*share-trim-1*/" +
  buildShareTrimRuntime() +
  source.slice(runtimeEnd);

const imageStart = source.indexOf("const __imgs=s.map");
const imageEndMarker = 'console.warn("[share-trim] image inputs"';
const imageEnd = source.indexOf(imageEndMarker, imageStart);
if (imageStart < 0 || imageEnd < 0) {
  console.error("image markers", imageStart, imageEnd);
  process.exit(3);
}
const afterLog = source.indexOf(";", imageEnd);
const replacement = [
  "const __readShareMirrorOpts=async()=>{const fallback={trim:true,uploadImages:true};try{const home=typeof process!==\"undefined\"&&process.env?process.env.USERPROFILE||process.env.HOME||\"\":\"\";if(!home)return fallback;const uri=we.file(home+\"/.cursor/share-image-mirror.json\");const result=await this.oalToolPopulationService._composerFileService.readFile({uri,composerData:e.data});const raw=result.value.buffer;const text=new TextDecoder().decode(raw instanceof ArrayBuffer?new Uint8Array(raw):raw);const json=JSON.parse(text);const opts={trim:json.trim!==false,uploadImages:json.uploadImages!==false};console.warn(\"[share-trim] flags trim=\"+opts.trim+\" images=\"+opts.uploadImages);return opts}catch(err){console.warn(\"[share-trim] flags fallback\",err&&(err.message||String(err)));return fallback}};",
  "const __opts=await __readShareMirrorOpts();",
  "const __imgs=__opts.uploadImages?s.map(m=>{const x=[];if(m&&Array.isArray(m.images))x.push(...m.images);if(m&&m.context&&Array.isArray(m.context.selectedImages))x.push(...m.context.selectedImages);return x}):s.map(()=>[]);",
  "s=iv_(s);",
  "if(!__opts.uploadImages)console.warn(\"[share-trim] image upload off\");",
  "else for(let __i=0;__i<__imgs.length;__i++){const __src=__imgs[__i];if(!__src.length)continue;const __out=[];for(const __im of __src){const __path=__im&&(__im.path||__im.fsPath);if(!__path)continue;try{const __proto=await kDn({path:__path,uuid:(__im.uuid||\"\"),dimension:(__im.dimension||{width:0,height:0}),loadedAt:(__im.loadedAt||Date.now())},()=>{},l=>this.oalToolPopulationService._composerFileService.readFile({uri:l,composerData:e.data}));__out.push(__proto);console.warn(\"[share-trim] image attached\",__path)}catch(__err){console.warn(\"[share-trim] image skipped\",__path,__err&&(__err.message||String(__err)))}}if(__out.length)s[__i]=Object.assign({},s[__i],{images:__out})}",
  "console.warn(\"[share-trim] image inputs\",__imgs.reduce((n,a)=>n+a.length,0));",
].join("");
source = source.slice(0, imageStart) + replacement + source.slice(afterLog + 1);

const call =
  "c=await globalThis.__cursorShareTrimV1({messages:s,title:t,send:(msgs,title,includePlan)=>o.shareConversation(new IWs({conversationId:e.data.composerId,title:title,visibility:n,messages:msgs,latestPlan:includePlan?a:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)})";
const callNext =
  "c=await globalThis.__cursorShareTrimV1({messages:s,title:t,trim:__opts.trim,send:(msgs,title,includePlan)=>o.shareConversation(new IWs({conversationId:e.data.composerId,title:title,visibility:n,messages:msgs,latestPlan:includePlan?a:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)})";
if (!source.includes(call)) {
  console.error("call site missing");
  process.exit(4);
}
source = source.replace(call, callNext);

fs.writeFileSync(file, source);
console.log("patched", source.includes("trim:__opts.trim"), source.includes("__readShareMirrorOpts"));
