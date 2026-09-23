export const SHARE_CACHE_MARKER = "/*share-cache-1*/";

export const CACHE_MENU_FROM =
  's?[Kd({id:I5t,label:"Share Transcript",enabled:!0,run:()=>c(I5t)})]:[],Kd({id:A5t,label:"Copy Request ID"';

export const CACHE_MENU_TO =
  's?[Kd({id:I5t,label:"Share Transcript",enabled:!0,run:()=>c(I5t)})]:[],(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(e){__fs=process.mainModule.require("fs")}const __p=(process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json";const __j=JSON.parse(__fs.readFileSync(__p,"utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch{if(globalThis.__cursorShareTrimLang==="en")__n="Cursor Optimization"}return Kd({id:"composer.cacheTranscript",label:"Cache Transcript ("+__n+")",enabled:!0,run:()=>c("composer.cacheTranscript")})})(),Kd({id:A5t,label:"Copy Request ID"';

export const CACHE_FORK_FROM = "async forkSharedConversation(e,t){if(!UQe())";

export const CACHE_REGISTER_FROM = "$e(gWh),$e(fWh),$e(vWh),$e(bWh);var EWh=class";

export const CACHE_REGISTER_FROM_32118 = "$e(fWh),$e(vWh),$e(bWh),$e(_Wh);var xWh=class";

export const GLASS_MENU_FROM =
  'tg({id:xbn,label:"Export Transcript",enabled:!0,run:()=>l(xbn)}),...s?[tg({id:s8t,label:"Share Transcript",enabled:!0,run:()=>l(s8t)})]:[],tg({id:Ibn,label:"Copy Request ID"';

export const GLASS_MENU_TO =
  'tg({id:xbn,label:"Export Transcript",enabled:!0,run:()=>l(xbn)}),...s?[tg({id:s8t,label:"Share Transcript",enabled:!0,run:()=>l(s8t)})]:[],(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(e){__fs=process.mainModule.require("fs")}const __p=(process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json";const __j=JSON.parse(__fs.readFileSync(__p,"utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch{if(globalThis.__cursorShareTrimLang==="en")__n="Cursor Optimization"}return tg({id:"composer.cacheTranscript",label:"Cache Transcript ("+__n+")",enabled:!0,run:()=>l("composer.cacheTranscript")})})(),tg({id:Ibn,label:"Copy Request ID"';

export const GLASS_FORK_FROM = "async forkSharedConversation(t,e){if(!DOe())";

export const GLASS_REGISTER_FROM =
  '__decorate([zo(ppa)],a_v.prototype,"run",null),Lt(Zbv),Lt(Qbv),Lt(Jbv),Lt(e_v);var l_v=class';

export const GLASS_REGISTER_FROM_32118 =
  '__decorate([zo(ppa)],l_v.prototype,"run",null),Lt(Qbv),Lt(Jbv),Lt(e_v),Lt(t_v);var c_v=class';

const GLASS_REGISTER_COMMANDS =
  'var __ShareTrimCacheCommand=class extends Qt{constructor(){super({id:"composer.cacheTranscript",title:{value:"Cache Transcript",original:"Cache Transcript"},f1:!1})}async run(t,e){const __n=t.get(Js),__ed=t.get(er).activeEditor;let __id=typeof e=="string"&&e?e:void 0;if(!__id&&__ed instanceof G1)__id=__ed.resource?.path;__id||(__id=__n.selectedComposerId);__id&&(__id=__n.resolveComposerIdToSelected(__id));if(!__id)return;await t.get(tp).cacheTranscript(__id)}};__decorate([zo("composer.cacheTranscript")],__ShareTrimCacheCommand.prototype,"run",null),Lt(__ShareTrimCacheCommand);var __ShareTrimForkCommand=class extends Qt{constructor(){super({id:"shareImageMirror.forkCache",title:{value:"Fork Cached Transcript",original:"Fork Cached Transcript"},f1:!1})}async run(t,e){if(typeof e!="string"||!e)return;await t.get(tp).forkCachedTranscript(e)}};__decorate([zo("shareImageMirror.forkCache")],__ShareTrimForkCommand.prototype,"run",null),Lt(__ShareTrimForkCommand);';

export const GLASS_REGISTER_TO =
  `__decorate([zo(ppa)],a_v.prototype,"run",null),Lt(Zbv),Lt(Qbv),Lt(Jbv),Lt(e_v);${GLASS_REGISTER_COMMANDS}var l_v=class`;

export const GLASS_REGISTER_TO_32118 =
  `__decorate([zo(ppa)],l_v.prototype,"run",null),Lt(Qbv),Lt(Jbv),Lt(e_v),Lt(t_v);${GLASS_REGISTER_COMMANDS}var c_v=class`;

const CACHE_REGISTER_COMMANDS =
  'var __ShareTrimCacheCommand=class extends ct{constructor(){super({id:"composer.cacheTranscript",title:{value:"Cache Transcript",original:"Cache Transcript"},f1:!1})}async run(e,t){const __n=e.get(zs),__ed=e.get(sn).activeEditor;let __id=typeof t=="string"&&t?t:void 0;if(!__id&&__ed instanceof Ly)__id=__ed.resource?.path;__id||(__id=__n.selectedComposerId);__id&&(__id=__n.resolveComposerIdToSelected(__id));if(!__id)return;await e.get(zh).cacheTranscript(__id)}};__decorate([Ns("composer.cacheTranscript")],__ShareTrimCacheCommand.prototype,"run",null);var __ShareTrimForkCommand=class extends ct{constructor(){super({id:"shareImageMirror.forkCache",title:{value:"Fork Cached Transcript",original:"Fork Cached Transcript"},f1:!1})}async run(e,t){if(typeof t!="string"||!t)return;await e.get(zh).forkCachedTranscript(t)}};__decorate([Ns("shareImageMirror.forkCache")],__ShareTrimForkCommand.prototype,"run",null),$e(__ShareTrimCacheCommand),$e(__ShareTrimForkCommand);';

export const CACHE_REGISTER_TO =
  `$e(gWh),$e(fWh),$e(vWh),$e(bWh);${CACHE_REGISTER_COMMANDS}var EWh=class`;

export const CACHE_REGISTER_TO_32118 =
  `$e(fWh),$e(vWh),$e(bWh),$e(_Wh);${CACHE_REGISTER_COMMANDS}var xWh=class`;

export const CACHE_READ_BYTES_OLD =
  'const __readBytes=async imagePath=>{const attempts=[we.file(imagePath)];if(root.scheme!=="file"&&imagePath.charAt(0)==="/")attempts.push(root.with({path:imagePath}));let last;for(const uri of attempts){try{const result=await this.composerFileService.readFile({uri,composerData:void 0});const raw=result.value.buffer;return raw instanceof Uint8Array?raw:new Uint8Array(raw)}catch(err){last=err}}throw last};';

export const CACHE_READ_BYTES =
  'const __readBytes=async imagePath=>{const __u8=raw=>raw instanceof Uint8Array?raw:new Uint8Array(raw);let p=typeof imagePath==="string"?imagePath:"";if(/^vscode-file:\\/\\//i.test(p))p=p.replace(/^vscode-file:\\/\\/[^/]+/i,"");if(/^file:\\/\\//i.test(p)){try{p=decodeURIComponent(p.replace(/^file:\\/\\//i,""))}catch{}}p=p.replace(/^\\/([A-Za-z]:)/,"$1");try{let fs;try{fs=require("fs")}catch(e){fs=process.mainModule.require("fs")}if(p&&fs.existsSync(p)){const buf=fs.readFileSync(p);if(buf&&buf.length)return __u8(buf)}}catch{}const attempts=[we.file(p||imagePath)];if(root.scheme!=="file"&&String(p||imagePath).charAt(0)==="/")attempts.push(root.with({path:p||imagePath}));let last;for(const uri of attempts){try{const result=await this.composerFileService.readFile({uri,composerData:void 0});const raw=result.value&&result.value.buffer;if(raw==null)throw new Error("empty");const bytes=__u8(raw);if(!bytes.length)throw new Error("empty");return bytes}catch(err){last=err}}throw last};';

export const CACHE_METHODS = `
async __shareTrimLang(){try{const home=typeof process!=="undefined"&&process.env?process.env.USERPROFILE||process.env.HOME||"":"";if(!home)return globalThis.__cursorShareTrimLang==="en"?"en":"zh";const uri=we.file(home+"/.cursor/share-image-mirror.json");const result=await this.composerFileService.readFile({uri,composerData:void 0});const raw=result.value.buffer;const text=new TextDecoder().decode(raw instanceof Uint8Array?raw:new Uint8Array(raw));const json=JSON.parse(text);const lang=json.language==="en"?"en":"zh";globalThis.__cursorShareTrimLang=lang;return lang}catch{return globalThis.__cursorShareTrimLang==="en"?"en":"zh"}}
__shareTrimBusy(text){try{if(this.__shareTrimBusyHandle){this.__shareTrimBusyHandle.close();this.__shareTrimBusyHandle=void 0}if(!text)return;const note=this._notificationService;if(note&&typeof note.status==="function")this.__shareTrimBusyHandle=note.status(text,{showProgress:!0})}catch{}}
async cacheTranscript(e){${SHARE_CACHE_MARKER}
const __lang=await this.__shareTrimLang();
const __zh=__lang!=="en";
const __tell=(text,kind)=>{const note=this._notificationService;if(kind==="error"&&typeof note.error==="function"){note.error(text);return}if(typeof note.info==="function"){note.info(text);return}if(typeof note.notify==="function")note.notify({severity:kind==="error"?3:1,message:text})};
this.__shareTrimBusy(__zh?"正在缓存…":"Caching…");
try{
if(typeof e!=="string"||!e)return;
const handle=await this.composerDataService.getComposerHandleById(e);
if(!handle||!handle.data)throw new Error(__zh?"找不到这个会话":"Chat not found");
const data=handle.data;
let messages;
if(data.fullConversationHeadersOnly&&data.fullConversationHeadersOnly.length>0){try{messages=await this.composerDataService.getConversationFromBubble(handle,data.fullConversationHeadersOnly[0].bubbleId)}catch(err){console.warn("[share-trim] cache load",err&&(err.message||String(err)))}}
if(!messages||!messages.length)messages=this.composerDataService.getLoadedConversation(handle);
if(!messages||!messages.length)throw new Error(__zh?"这个会话是空的":"This chat is empty");
const folders=this.workspaceContextService.getWorkspace().folders||[];
if(!folders.length)throw new Error(__zh?"请先打开一个文件夹":"Open a folder first");
const root=folders[0].uri;
const dir=we.joinPath(root,".cursor","share-trim-cache");
await this.composerFileService.createFolder({uri:we.joinPath(root,".cursor"),composerData:void 0}).catch(()=>{});
await this.composerFileService.createFolder({uri:dir,composerData:void 0}).catch(()=>{});
const __plain=(value,depth,seen)=>{if(value==null||typeof value==="number"||typeof value==="boolean")return value;if(typeof value==="string")return value.length>200000?value.slice(0,200000):value;if(typeof value==="bigint")return String(value);if(typeof value!=="object")return;if(typeof ArrayBuffer!=="undefined"&&ArrayBuffer.isView(value))return;if(depth>5||seen.has(value))return;seen.add(value);if(Array.isArray(value))return value.slice(0,30).map(item=>__plain(item,depth+1,seen));const out={};for(const key of Object.keys(value).slice(0,30)){if(key==="data"||key==="buffer")continue;const child=__plain(value[key],depth+1,seen);if(child!==void 0)out[key]=child}return out};
${CACHE_READ_BYTES}
const stored=[];
let imageCount=0;
for(const m of messages){
const lists=[];
if(m&&Array.isArray(m.images))lists.push(...m.images);
if(m&&m.context&&Array.isArray(m.context.selectedImages))lists.push(...m.context.selectedImages);
const __walk=(value,depth,seen)=>{if(!value||typeof value!=="object"||depth>5||seen.has(value))return;seen.add(value);if(typeof value.path==="string"&&(value.dimension||/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(value.path)))lists.push(value);const items=Array.isArray(value)?value:Object.keys(value).filter(key=>key!=="data"&&key!=="buffer").map(key=>value[key]);for(const item of items)__walk(item,depth+1,seen)};
if(m&&m.toolResults)__walk(m.toolResults,0,new WeakSet());
const seen=new Set();
const images=[];
for(const image of lists){
if(!image||typeof image.path!=="string"||!image.path)continue;
const key=image.uuid||image.path;
if(seen.has(key))continue;
seen.add(key);
const item={uuid:typeof image.uuid==="string"?image.uuid:"",path:image.path,dimension:image.dimension&&typeof image.dimension==="object"?{width:Number(image.dimension.width)||0,height:Number(image.dimension.height)||0}:{width:0,height:0}};
try{const bytes=await __readBytes(image.path);let __bin="";for(let __p=0;__p<bytes.length;__p+=8192)__bin+=String.fromCharCode.apply(null,bytes.subarray(__p,__p+8192));item.base64=btoa(__bin);imageCount++}catch(err){item.missing=true;console.warn("[share-trim] cache image",image.path,err&&(err.message||String(err)))}
images.push(item);
}
stored.push({type:m&&m.type,text:m&&typeof m.text==="string"?m.text:"",richText:m&&typeof m.richText==="string"?m.richText:"",thinking:m&&typeof m.thinking==="string"?m.thinking:"",thinkingDurationMs:m&&typeof m.thinkingDurationMs==="number"?m.thinkingDurationMs:0,serverBubbleId:m&&typeof m.serverBubbleId==="string"?m.serverBubbleId:"",toolResults:__plain(m&&m.toolResults,0,new WeakSet()),images});
}
const id=String(Vn()).replace(/[^A-Za-z0-9_-]/g,"").slice(0,80);
if(!id)throw new Error(__zh?"无法生成缓存编号":"Could not create a cache id");
const title=String(data.name||data.title||(__zh?"未命名会话":"Untitled Chat")).slice(0,200);
const createdAt=Date.now();
const payload={version:1,id,title,composerId:e,createdAt,messageCount:stored.length,imageCount,messages:stored};
await this.composerFileService.writeFile({uri:we.joinPath(dir,id+".json"),bufferOrReadableOrStream:pi.fromString(JSON.stringify(payload)),composerData:void 0});
let index=[];
try{const existing=await this.composerFileService.readFile({uri:we.joinPath(dir,"index.json"),composerData:void 0});const raw=existing.value.buffer;const text=new TextDecoder().decode(raw instanceof Uint8Array?raw:new Uint8Array(raw));const parsed=JSON.parse(text);if(Array.isArray(parsed))index=parsed}catch{}
index=index.filter(item=>item&&item.id!==id);
index.unshift({id,title,createdAt,messageCount:stored.length,imageCount});
await this.composerFileService.writeFile({uri:we.joinPath(dir,"index.json"),bufferOrReadableOrStream:pi.fromString(JSON.stringify(index)),composerData:void 0});
console.warn("[share-trim] cache id="+id+" messages="+stored.length+" images="+imageCount);
__tell(__zh?"已把会话缓存到工作区服务器":"Cached the transcript on the workspace server","info");
}catch(err){console.warn("[share-trim] cache failed",err&&(err.message||String(err)));__tell((__zh?"缓存失败：":"Cache failed: ")+(err&&(err.message||String(err))||""),"error")}
finally{this.__shareTrimBusy()}
}
async forkCachedTranscript(e){
const __lang=await this.__shareTrimLang();
const __zh=__lang!=="en";
const __tell=(text,kind)=>{const note=this._notificationService;if(kind==="error"&&typeof note.error==="function"){note.error(text);return}if(typeof note.info==="function"){note.info(text);return}if(typeof note.notify==="function")note.notify({severity:kind==="error"?3:1,message:text})};
this.__shareTrimBusy(__zh?"正在 Fork…":"Forking…");
try{
if(typeof e!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(e))throw new Error(__zh?"缓存编号无效":"Invalid cache id");
const folders=this.workspaceContextService.getWorkspace().folders||[];
if(!folders.length)throw new Error(__zh?"请先打开一个文件夹":"Open a folder first");
const root=folders[0].uri;
const dir=we.joinPath(root,".cursor","share-trim-cache");
const file=await this.composerFileService.readFile({uri:we.joinPath(dir,e+".json"),composerData:void 0});
const raw=file.value.buffer;
const text=new TextDecoder().decode(raw instanceof Uint8Array?raw:new Uint8Array(raw));
const cache=JSON.parse(text);
if(!cache||!Array.isArray(cache.messages)||!cache.messages.length)throw new Error(__zh?"缓存里没有对话":"Cached chat has no messages");
const imgDir=we.joinPath(dir,e,"images");
await this.composerFileService.createFolder({uri:we.joinPath(dir,e),composerData:void 0}).catch(()=>{});
await this.composerFileService.createFolder({uri:imgDir,composerData:void 0}).catch(()=>{});
const __fromB64=value=>{if(typeof Buffer!=="undefined")return new Uint8Array(Buffer.from(value,"base64"));const bin=atob(value);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i)&255;return out};
const bubbles=[];
for(let mi=0;mi<cache.messages.length;mi++){
const m=cache.messages[mi];
const selected=[];
const images=Array.isArray(m.images)?m.images:[];
for(let ii=0;ii<images.length;ii++){
const image=images[ii];
if(!image)continue;
let imagePath=typeof image.path==="string"?image.path:"";
if(typeof image.base64==="string"&&image.base64){
const match=String(image.path||"").match(/\\.([A-Za-z0-9]{1,8})$/);
const ext=match?match[1].toLowerCase():"png";
const name=String(image.uuid||"img").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60)||"img";
const fileUri=we.joinPath(imgDir,mi+"-"+ii+"-"+name+"."+ext);
await this.composerFileService.writeFile({uri:fileUri,bufferOrReadableOrStream:pi.wrap(__fromB64(image.base64)),composerData:void 0});
imagePath=fileUri.fsPath;
}
if(!imagePath)continue;
selected.push({uuid:image.uuid||Vn(),path:imagePath,dimension:image.dimension&&typeof image.dimension==="object"?{width:Number(image.dimension.width)||0,height:Number(image.dimension.height)||0}:{width:0,height:0},loadedAt:Date.now()});
}
const base=gf();
const bubble={...base,type:m.type,text:typeof m.text==="string"?m.text:"",bubbleId:Vn(),serverBubbleId:typeof m.serverBubbleId==="string"?m.serverBubbleId:void 0,thinking:typeof m.thinking==="string"?m.thinking:void 0,thinkingDurationMs:typeof m.thinkingDurationMs==="number"?m.thinkingDurationMs:void 0,toolResults:Array.isArray(m.toolResults)?m.toolResults:void 0,images:[]};
if(typeof m.richText==="string"&&m.richText)bubble.richText=m.richText;
if(selected.length)bubble.context={...(base.context||{}),selectedImages:selected};
bubbles.push(bubble);
}
const id=Vn();
const model=this.modelConfigService.getModelConfig("composer");
const title=cache.title||(__zh?"未命名会话":"Untitled Chat");
const header={...aN(model,id),name:title+" (Forked)",subtitle:__zh?"从服务器缓存 Fork":"Forked from server cache",createdAt:Date.now(),workspaceIdentifier:kS(this.workspaceContextService.getWorkspace())};
await this.composerDataService.appendComposer_DO_NOT_CALL_UNLESS_YOU_KNOW_WHAT_YOURE_DOING(header);
const created=await this.composerDataService.getComposerHandleById(id);
if(!created)throw new Error(__zh?"本地会话没有建成":"Failed to create the local chat");
await this.composerDataService.appendComposerBubbles(created,bubbles);
await this.openComposer(id,{insertSelection:!1,openInNewTab:!0});
console.warn("[share-trim] fork id="+e+" messages="+bubbles.length);
__tell(__zh?"已从服务器缓存 Fork 到本地":"Forked the cached transcript into a local chat","info");
}catch(err){console.warn("[share-trim] fork failed",err&&(err.message||String(err)));__tell((__zh?"Fork 失败：":"Fork failed: ")+(err&&(err.message||String(err))||""),"error")}
finally{this.__shareTrimBusy()}
}
`;
