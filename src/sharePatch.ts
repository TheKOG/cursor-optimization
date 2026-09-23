import {
  CACHE_FORK_FROM,
  CACHE_MENU_FROM,
  CACHE_MENU_TO,
  CACHE_METHODS,
  CACHE_REGISTER_FROM,
  CACHE_REGISTER_TO,
  GLASS_FORK_FROM,
  GLASS_MENU_FROM,
  GLASS_MENU_TO,
  GLASS_REGISTER_FROM,
  GLASS_REGISTER_TO,
  SHARE_CACHE_MARKER,
} from "./cacheWorkbench";
import { clampAttempt, shareTooBig, shareWithinLimit, shrinkMessages } from "./shareTrim";

export const SHARE_TRIM_MARKER = "/*share-trim-1*/";
export const SHARE_ERROR_MARKER = "/*share-error-1*/";

const SHARE_ERROR_FROM =
  'function nv_(e){return e instanceof Error&&e.message==="No content to share"?"Failed to share transcript. Agent conversation is empty.":tv_(e)?"This chat is too large to share. Try sharing a shorter chat.":"Failed to share transcript. Try again later."}';

const SHARE_ERROR_TO =
  'function nv_(e){const __why=e&&String(e.rawMessage||e.message||"").replace(/\\s+/g," ").trim();const __prefix=globalThis.__cursorShareTrimLang==="en"?"Share failed: ":"分享失败：";return e instanceof Error&&e.message==="No content to share"?"Failed to share transcript. Agent conversation is empty.":tv_(e)?"This chat is too large to share. Try sharing a shorter chat.":__why?__prefix+__why:"Failed to share transcript. Try again later."}';

const SHARE_ANCHOR = "async shareConversation(e,t,n){if(!UQe())";

const SHARE_SEND =
  "c=await o.shareConversation(new IWs({conversationId:e.data.composerId,title:t,visibility:n,messages:s,latestPlan:a}));return{shareId:c.shareId,shareUrl:c.shareUrl,redactions:c.redactions||0}";

const SHARE_SEND_PATCHED =
  "c=await globalThis.__cursorShareTrimV1({messages:s,title:t,send:(msgs,title,includePlan)=>o.shareConversation(new IWs({conversationId:e.data.composerId,title:title,visibility:n,messages:msgs,latestPlan:includePlan?a:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)});return{shareId:c.shareId,shareUrl:c.shareUrl,redactions:c.redactions||0}";

export { SHARE_CACHE_MARKER } from "./cacheWorkbench";

export const IMAGE_PATH_MARKER = "/*root-drive-1*/";

const IMAGE_FROM = "function Z7f(e,t,n,i={}){const r=we.file(e.path),";

const IMAGE_TO =
  'function Z7f(e,t,n,i={}){const __p=typeof e.path==="string"&&/^[\\\\/]root[\\\\/]/.test(e.path)&&!/^[A-Za-z]:/.test(e.path)?"C:"+e.path.replace(/\\//g,"\\\\"):e.path;const r=we.file(__p),';

export type PatchStatus = "inserted" | "already" | "missing-anchor";

export function buildShareTrimRuntime(): string {
  return `(function(){${shareTooBig.toString()};${shrinkMessages.toString()};${clampAttempt.toString()};return ${shareWithinLimit.toString()};})()`;
}

export function applyShareTrimPatch(source: string): { source: string; status: PatchStatus } {
  if (source.includes(SHARE_TRIM_MARKER)) {
    return { source, status: "already" };
  }
  const anchors = countOf(source, SHARE_ANCHOR);
  const sends = countOf(source, SHARE_SEND);
  if (anchors !== 1 || sends !== 1) {
    return { source, status: "missing-anchor" };
  }
  const patched = source
    .replace(SHARE_SEND, SHARE_SEND_PATCHED)
    .replace(
      SHARE_ANCHOR,
      `async shareConversation(e,t,n){if(!globalThis.__cursorShareTrimV1){globalThis.__cursorShareTrimV1=${SHARE_TRIM_MARKER}${buildShareTrimRuntime()};}if(!UQe())`
    );
  if (!patched.includes(SHARE_TRIM_MARKER) || patched.includes(SHARE_SEND)) {
    return { source, status: "missing-anchor" };
  }
  return { source: patched, status: "inserted" };
}

export function applyShareErrorPatch(source: string): { source: string; status: PatchStatus } {
  const upgraded = `${SHARE_ERROR_TO}${SHARE_ERROR_MARKER}`;
  if (source.includes(upgraded)) {
    return { source, status: "already" };
  }
  const start = source.indexOf("function nv_(e)");
  const end = source.indexOf(SHARE_ERROR_MARKER, start);
  if (start >= 0 && end > start) {
    return {
      source: source.slice(0, start) + upgraded + source.slice(end + SHARE_ERROR_MARKER.length),
      status: "inserted",
    };
  }
  if (countOf(source, SHARE_ERROR_FROM) !== 1) {
    return { source, status: "missing-anchor" };
  }
  return { source: source.replace(SHARE_ERROR_FROM, upgraded), status: "inserted" };
}

export function applyImagePathPatch(source: string): { source: string; status: PatchStatus } {
  if (source.includes(IMAGE_PATH_MARKER) || source.includes("const __p=typeof e.path===\"string\"&&/^[\\\\/]root[\\\\/]/.test(e.path)")) {
    return { source, status: "already" };
  }
  if (countOf(source, IMAGE_FROM) !== 1) {
    return { source, status: "missing-anchor" };
  }
  return { source: source.replace(IMAGE_FROM, `${IMAGE_PATH_MARKER}${IMAGE_TO}`), status: "inserted" };
}

export function applyShareCachePatch(source: string): { source: string; status: PatchStatus } {
  if (source.includes(SHARE_CACHE_MARKER)) {
    return { source, status: "already" };
  }
  if (
    countOf(source, CACHE_MENU_FROM) !== 1 ||
    countOf(source, CACHE_FORK_FROM) !== 1 ||
    countOf(source, CACHE_REGISTER_FROM) !== 1
  ) {
    return { source, status: "missing-anchor" };
  }
  const patched = source
    .replace(CACHE_MENU_FROM, CACHE_MENU_TO)
    .replace(CACHE_FORK_FROM, `${CACHE_METHODS}${CACHE_FORK_FROM}`)
    .replace(CACHE_REGISTER_FROM, CACHE_REGISTER_TO);
  if (
    !patched.includes(SHARE_CACHE_MARKER) ||
    patched.includes(CACHE_MENU_FROM) ||
    patched.includes(CACHE_REGISTER_FROM) ||
    countOf(patched, "async cacheTranscript(") !== 1 ||
    countOf(patched, "async forkCachedTranscript(") !== 1
  ) {
    return { source, status: "missing-anchor" };
  }
  return { source: patched, status: "inserted" };
}

export function glassCacheMethods(): string {
  return CACHE_METHODS.replaceAll("we.file", "Ze.file")
    .replaceAll("we.joinPath", "Ze.joinPath")
    .replaceAll("pi.fromString", "yr.fromString")
    .replaceAll("pi.wrap", "yr.wrap")
    .replaceAll("Vn()", "bi()")
    .replaceAll("gf()", "Vv()")
    .replaceAll("aN(", "RO(")
    .replaceAll("kS(", "n0(");
}

export function applyGlassShareCachePatch(source: string): { source: string; status: PatchStatus } {
  if (source.includes(SHARE_CACHE_MARKER)) {
    return { source, status: "already" };
  }
  if (
    countOf(source, GLASS_MENU_FROM) !== 1 ||
    countOf(source, GLASS_FORK_FROM) !== 1 ||
    countOf(source, GLASS_REGISTER_FROM) !== 1
  ) {
    return { source, status: "missing-anchor" };
  }
  const methods = glassCacheMethods();
  if (methods.includes("we.joinPath") || methods.includes("pi.") || methods.includes("Vn()") || methods.includes("gf()")) {
    return { source, status: "missing-anchor" };
  }
  const patched = source
    .replace(GLASS_MENU_FROM, GLASS_MENU_TO)
    .replace(GLASS_FORK_FROM, `${methods}${GLASS_FORK_FROM}`)
    .replace(GLASS_REGISTER_FROM, GLASS_REGISTER_TO);
  if (
    !patched.includes(SHARE_CACHE_MARKER) ||
    patched.includes(GLASS_MENU_FROM) ||
    patched.includes(GLASS_REGISTER_FROM) ||
    countOf(patched, "async cacheTranscript(") !== 1
  ) {
    return { source, status: "missing-anchor" };
  }
  return { source: patched, status: "inserted" };
}

const EDITOR_TITLE_LABEL =
  'title:(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(__e){__fs=process.mainModule.require("fs")}const __j=JSON.parse(__fs.readFileSync((process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json","utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch(__e){}return"Cache Transcript ("+__n+")"})()';

const EDITOR_TITLE_ITEM =
  `{command:{id:"composer.cacheTranscript",${EDITOR_TITLE_LABEL}},group:"1_chatTools",order:2.5,when:`;

const DESKTOP_EDITOR_FROM =
  '{command:{id:I5t,title:"Share Transcript",icon:Re.link},group:"1_chatTools",order:2,when:ce.and(nu.Scheme.isEqualTo(dt.composer),uHt)},{command:{id:WMs,title:"Copy Request ID"},group:"1_chatTools",order:3,when:nu.Scheme.isEqualTo(dt.composer)}';

const GLASS_EDITOR_FROM =
  '{command:{id:s8t,title:"Share Transcript",icon:vt.link},group:"1_chatTools",order:2,when:ut.and(hh.Scheme.isEqualTo(Pt.composer),I7t)},{command:{id:mpa,title:"Copy Request ID"},group:"1_chatTools",order:3,when:hh.Scheme.isEqualTo(Pt.composer)}';

export function applyEditorTitleCachePatch(source: string): { source: string; status: PatchStatus } {
  if (source.includes('id:"composer.cacheTranscript",title:(()=>')) {
    return { source, status: "already" };
  }
  const desktop = countOf(source, DESKTOP_EDITOR_FROM);
  const glass = countOf(source, GLASS_EDITOR_FROM);
  if (desktop === 1 && glass === 0) {
    const patched = source.replace(
      DESKTOP_EDITOR_FROM,
      `{command:{id:I5t,title:"Share Transcript",icon:Re.link},group:"1_chatTools",order:2,when:ce.and(nu.Scheme.isEqualTo(dt.composer),uHt)},${EDITOR_TITLE_ITEM}nu.Scheme.isEqualTo(dt.composer)},{command:{id:WMs,title:"Copy Request ID"},group:"1_chatTools",order:3,when:nu.Scheme.isEqualTo(dt.composer)}`
    );
    return patched.includes('order:2.5,when:nu.Scheme.isEqualTo(dt.composer)')
      ? { source: patched, status: "inserted" }
      : { source, status: "missing-anchor" };
  }
  if (glass === 1 && desktop === 0) {
    const patched = source.replace(
      GLASS_EDITOR_FROM,
      `{command:{id:s8t,title:"Share Transcript",icon:vt.link},group:"1_chatTools",order:2,when:ut.and(hh.Scheme.isEqualTo(Pt.composer),I7t)},${EDITOR_TITLE_ITEM}hh.Scheme.isEqualTo(Pt.composer)},{command:{id:mpa,title:"Copy Request ID"},group:"1_chatTools",order:3,when:hh.Scheme.isEqualTo(Pt.composer)}`
    );
    return patched.includes('order:2.5,when:hh.Scheme.isEqualTo(Pt.composer)')
      ? { source: patched, status: "inserted" }
      : { source, status: "missing-anchor" };
  }
  return { source, status: "missing-anchor" };
}

function countOf(source: string, needle: string): number {
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}
