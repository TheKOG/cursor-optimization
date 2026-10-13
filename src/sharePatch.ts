import {
  CACHE_READ_BYTES,
  CACHE_READ_BYTES_OLD,
  CACHE_REGISTER_FROM,
  CACHE_REGISTER_FROM_32118,
  CACHE_REGISTER_TO,
  CACHE_REGISTER_TO_32118,
  cacheMethodsFor,
  GLASS_REGISTER_FROM,
  GLASS_REGISTER_FROM_32118,
  GLASS_REGISTER_TO,
  GLASS_REGISTER_TO_32118,
  SHARE_CACHE_MARKER,
  type CacheSymbolNames,
} from "./cacheWorkbench";
import { clampAttempt, shareTooBig, shareWithinLimit, shrinkMessages } from "./shareTrim";
import {
  cacheMenuInsertion,
  discoverSymbols,
  findEditorMenus,
  findForkSites,
  findMenuSites,
  findShareCommand,
  findShareErrors,
  findShareHeads,
  findShareSends,
  shareCommandBlock,
} from "./workbenchShape";

export const SHARE_TRIM_MARKER = "/*share-trim-1*/";
export const SHARE_ERROR_MARKER = "/*share-error-1*/";

function shareErrorReplacement(name: string, param: string, tooBig: string): string {
  return `function ${name}(${param}){const __why=${param}&&String(${param}.rawMessage||${param}.message||"").replace(/\\s+/g," ").trim();const __prefix=globalThis.__cursorShareTrimLang==="en"?"Share failed: ":"分享失败：";return ${param} instanceof Error&&${param}.message==="No content to share"?"Failed to share transcript. Agent conversation is empty.":${tooBig}(${param})?"This chat is too large to share. Try sharing a shorter chat.":__why?__prefix+__why:"Failed to share transcript. Try again later."}`;
}

export { SHARE_CACHE_MARKER } from "./cacheWorkbench";

export const IMAGE_PATH_MARKER = "/*root-drive-1*/";

const IMAGE_FROM = "function Z7f(e,t,n,i={}){const r=we.file(e.path),";

const IMAGE_TO =
  'function Z7f(e,t,n,i={}){const __p=typeof e.path==="string"&&/^[\\\\/]root[\\\\/]/.test(e.path)&&!/^[A-Za-z]:/.test(e.path)?"C:"+e.path.replace(/\\//g,"\\\\"):e.path;const r=we.file(__p),';

export type PatchStatus = "inserted" | "already" | "missing-anchor";

export type PatchResult = { source: string; status: PatchStatus; detail?: string };

export function buildShareTrimRuntime(): string {
  return `(function(){${shareTooBig.toString()};${shrinkMessages.toString()};${clampAttempt.toString()};return ${shareWithinLimit.toString()};})()`;
}

export function applyShareTrimPatch(source: string): PatchResult {
  if (source.includes(SHARE_TRIM_MARKER)) {
    return { source, status: "already" };
  }
  const heads = findShareHeads(source);
  const sends = findShareSends(source);
  if (heads.length !== 1 || sends.length !== 1) {
    return {
      source,
      status: "missing-anchor",
      detail: `share heads=${heads.length} sends=${sends.length}`,
    };
  }
  const send = sends[0];
  const patchedSend = `${send.result}=await globalThis.__cursorShareTrimV1({messages:${send.messages},title:${send.title},send:(msgs,title,includePlan)=>${send.client}.shareConversation(new ${send.ctor}({conversationId:${send.conversationId},title:title,visibility:${send.visibility},messages:msgs,latestPlan:includePlan?${send.plan}:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)})`;
  const patched = source.replace(SHARE_SEND_RE_SOURCE(sends[0]), patchedSend).replace(
    heads[0].from,
    `async shareConversation(${shareHeadParams(heads[0].from)}){if(!globalThis.__cursorShareTrimV1){globalThis.__cursorShareTrimV1=${SHARE_TRIM_MARKER}${buildShareTrimRuntime()};}if(!${heads[0].guard}())`
  );
  if (!patched.includes(SHARE_TRIM_MARKER) || patched.includes(shareSendOriginal(send))) {
    return { source, status: "missing-anchor", detail: "share rewrite did not apply" };
  }
  return { source: patched, status: "inserted" };
}

function shareHeadParams(from: string): string {
  const match = from.match(/async shareConversation\((.*)\)\{/);
  return match ? match[1] : "e,t,n";
}

function shareSendOriginal(send: ReturnType<typeof findShareSends>[number]): string {
  return `${send.result}=await ${send.client}.shareConversation(new ${send.ctor}({conversationId:${send.conversationId},title:${send.title},visibility:${send.visibility},messages:${send.messages},latestPlan:${send.plan}}))`;
}

function SHARE_SEND_RE_SOURCE(send: ReturnType<typeof findShareSends>[number]): string {
  return shareSendOriginal(send);
}

export function applyShareErrorPatch(source: string): PatchResult {
  if (source.includes(SHARE_ERROR_MARKER) && source.includes("__prefix+__why")) {
    return { source, status: "already" };
  }
  const start = source.search(/function \w+\(\w+\)\{const __why=/);
  const end = source.indexOf(SHARE_ERROR_MARKER, start);
  if (start >= 0 && end > start) {
    const named = source.slice(start).match(/^function (\w+)\((\w+)\)\{/);
    const tooBig = source.slice(start, end).match(/:(\w+)\(\w+\)\?"This chat is too large/);
    if (named && tooBig) {
      const upgraded = `${shareErrorReplacement(named[1], named[2], tooBig[1])}${SHARE_ERROR_MARKER}`;
      return {
        source: source.slice(0, start) + upgraded + source.slice(end + SHARE_ERROR_MARKER.length),
        status: "inserted",
      };
    }
  }
  const errors = findShareErrors(source);
  if (errors.length !== 1) {
    return { source, status: "missing-anchor", detail: `share errors=${errors.length}` };
  }
  const error = errors[0];
  return {
    source: source.replace(error.from, `${shareErrorReplacement(error.name, error.param, error.tooBig)}${SHARE_ERROR_MARKER}`),
    status: "inserted",
  };
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

function upgradeCacheReadBytes(source: string): { source: string; changed: boolean } {
  let next = source;
  let changed = false;
  for (const fileFn of ["we.file", "Ze.file"] as const) {
    const old = CACHE_READ_BYTES_OLD.replaceAll("we.file", fileFn);
    const neu = CACHE_READ_BYTES.replaceAll("we.file", fileFn);
    if (next.includes(old)) {
      next = next.split(old).join(neu);
      changed = true;
    }
  }
  return { source: next, changed };
}

const DESKTOP_SYMBOLS: CacheSymbolNames = {
  uri: "we",
  buffer: "pi",
  id: "Vn",
  bubble: "gf",
  header: "aN",
  workspace: "kS",
};

const GLASS_SYMBOLS: CacheSymbolNames = {
  uri: "Ze",
  buffer: "yr",
  id: "bi",
  bubble: "Vv",
  header: "RO",
  workspace: "n0",
};

export function glassCacheMethods(): string {
  return cacheMethodsFor(GLASS_SYMBOLS);
}

export function applyShareCachePatch(source: string): PatchResult {
  return applyCachePatch(source, {
    symbols: DESKTOP_SYMBOLS,
    registerPairs: [
      [CACHE_REGISTER_FROM, CACHE_REGISTER_TO],
      [CACHE_REGISTER_FROM_32118, CACHE_REGISTER_TO_32118],
    ],
    requireForkMethod: true,
  });
}

export function applyGlassShareCachePatch(source: string): PatchResult {
  return applyCachePatch(source, {
    symbols: GLASS_SYMBOLS,
    registerPairs: [
      [GLASS_REGISTER_FROM, GLASS_REGISTER_TO],
      [GLASS_REGISTER_FROM_32118, GLASS_REGISTER_TO_32118],
    ],
    requireForkMethod: false,
    rejectUnmappedGlass: true,
  });
}

function applyCachePatch(
  source: string,
  fallback: {
    symbols: CacheSymbolNames;
    registerPairs: Array<[string, string]>;
    requireForkMethod: boolean;
    rejectUnmappedGlass?: boolean;
  }
): PatchResult {
  if (source.includes(SHARE_CACHE_MARKER)) {
    const upgraded = upgradeCacheReadBytes(source);
    const methods = upgradeCacheMethods(upgraded.source);
    return {
      source: methods.source,
      status: upgraded.changed || methods.changed ? "inserted" : "already",
    };
  }
  const menus = findMenuSites(source);
  const forks = findForkSites(source);
  const structural = findShareCommand(source);
  const exact = structural ? undefined : pickRegister(source, fallback.registerPairs);
  if (menus.length !== 1 || forks.length !== 1 || (!structural && !exact)) {
    return {
      source,
      status: "missing-anchor",
      detail: `menu=${menus.length} fork=${forks.length} command=${structural ? "shape" : exact ? "exact" : "missing"}`,
    };
  }
  const symbols = discoverSymbols(source, forks[0].index) ?? fallback.symbols;
  const methods = cacheMethodsFor(symbols);
  if (
    fallback.rejectUnmappedGlass &&
    !discoverSymbols(source, forks[0].index) &&
    (methods.includes("we.joinPath") || methods.includes("pi.") || methods.includes("Vn()") || methods.includes("gf()"))
  ) {
    return { source, status: "missing-anchor", detail: "glass helper names were not rewritten" };
  }
  let patched = source.replace(menus[0].from, cacheMenuInsertion(menus[0])).replace(forks[0].from, `${methods}${forks[0].from}`);
  if (structural) {
    patched = patched
      .replace(structural.decorateFrom, `${structural.decorateFrom};${shareCommandBlock(structural)}`)
      .replace(
        structural.registerFrom,
        `${structural.registerFrom},${structural.register}(__ShareTrimCacheCommand),${structural.register}(__ShareTrimForkCommand)`
      );
  } else if (exact) {
    patched = patched.replace(exact.from, exact.to);
  }
  const registerLeft = exact && !structural ? patched.includes(exact.from) : false;
  if (
    !patched.includes(SHARE_CACHE_MARKER) ||
    patched.includes(menus[0].from) ||
    registerLeft ||
    countOf(patched, "async cacheTranscript(") !== 1 ||
    (fallback.requireForkMethod && countOf(patched, "async forkCachedTranscript(") !== 1)
  ) {
    return { source, status: "missing-anchor", detail: "cache rewrite did not apply" };
  }
  return { source: patched, status: "inserted" };
}

const EDITOR_TITLE_LABEL =
  'title:(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(__e){__fs=process.mainModule.require("fs")}const __j=JSON.parse(__fs.readFileSync((process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json","utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch(__e){}return"Cache Transcript ("+__n+")"})()';

const EDITOR_TITLE_ITEM =
  `{command:{id:"composer.cacheTranscript",${EDITOR_TITLE_LABEL}},group:"1_chatTools",order:2.5,when:`;

export function applyEditorTitleCachePatch(source: string): PatchResult {
  if (source.includes('id:"composer.cacheTranscript",title:(()=>') || source.includes("order:2.5,when:")) {
    return { source, status: "already" };
  }
  const menus = findEditorMenus(source);
  if (menus.length !== 1) {
    return { source, status: "missing-anchor", detail: `editor menus=${menus.length}` };
  }
  const site = menus[0];
  const patched = source.replace(
    site.from,
    `{command:{id:${site.shareId},title:"Share Transcript",icon:${site.icon}.link},group:"1_chatTools",order:2,when:${site.shareWhen}},${EDITOR_TITLE_ITEM}${site.copyWhen}},{command:{id:${site.copyId},title:"Copy Request ID"},group:"1_chatTools",order:3,when:${site.copyWhen}}`
  );
  return patched.includes(`order:2.5,when:${site.copyWhen}`)
    ? { source: patched, status: "inserted" }
    : { source, status: "missing-anchor", detail: "editor rewrite did not apply" };
}

function upgradeCacheMethods(source: string): { source: string; changed: boolean } {
  const start = source.indexOf("async __shareTrimLang()");
  if (start < 0) {
    return { source, changed: false };
  }
  const end = source.indexOf("async forkSharedConversation(", start);
  if (end < 0) {
    return { source, changed: false };
  }
  const current = source.slice(start, end);
  if (current.includes("this.__shareTrimBusyHandle") && current.includes("fs.existsSync(p)")) {
    return { source, changed: false };
  }
  const fork = findForkSites(source.slice(end))[0];
  const symbols = fork ? discoverSymbols(source, end + fork.index) : undefined;
  const glass = source.slice(end, end + 120).includes("if(!DOe())");
  const next = (symbols ? cacheMethodsFor(symbols) : cacheMethodsFor(glass ? GLASS_SYMBOLS : DESKTOP_SYMBOLS)).replace(
    /^\n/,
    ""
  );
  return { source: source.slice(0, start) + next + source.slice(end), changed: true };
}

function pickRegister(source: string, pairs: Array<[string, string]>): { from: string; to: string } | undefined {
  return pairs
    .filter(([from]) => countOf(source, from) === 1)
    .map(([from, to]) => ({ from, to }))[0];
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
