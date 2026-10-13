"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_PATH_MARKER = exports.SHARE_CACHE_MARKER = exports.SHARE_ERROR_MARKER = exports.SHARE_TRIM_MARKER = void 0;
exports.buildShareTrimRuntime = buildShareTrimRuntime;
exports.applyShareTrimPatch = applyShareTrimPatch;
exports.applyShareErrorPatch = applyShareErrorPatch;
exports.applyImagePathPatch = applyImagePathPatch;
exports.glassCacheMethods = glassCacheMethods;
exports.applyShareCachePatch = applyShareCachePatch;
exports.applyGlassShareCachePatch = applyGlassShareCachePatch;
exports.applyEditorTitleCachePatch = applyEditorTitleCachePatch;
const cacheWorkbench_1 = require("./cacheWorkbench");
const shareTrim_1 = require("./shareTrim");
const workbenchShape_1 = require("./workbenchShape");
exports.SHARE_TRIM_MARKER = "/*share-trim-1*/";
exports.SHARE_ERROR_MARKER = "/*share-error-1*/";
function shareErrorReplacement(name, param, tooBig) {
    return `function ${name}(${param}){const __why=${param}&&String(${param}.rawMessage||${param}.message||"").replace(/\\s+/g," ").trim();const __prefix=globalThis.__cursorShareTrimLang==="en"?"Share failed: ":"分享失败：";return ${param} instanceof Error&&${param}.message==="No content to share"?"Failed to share transcript. Agent conversation is empty.":${tooBig}(${param})?"This chat is too large to share. Try sharing a shorter chat.":__why?__prefix+__why:"Failed to share transcript. Try again later."}`;
}
var cacheWorkbench_2 = require("./cacheWorkbench");
Object.defineProperty(exports, "SHARE_CACHE_MARKER", { enumerable: true, get: function () { return cacheWorkbench_2.SHARE_CACHE_MARKER; } });
exports.IMAGE_PATH_MARKER = "/*root-drive-1*/";
const IMAGE_FROM = "function Z7f(e,t,n,i={}){const r=we.file(e.path),";
const IMAGE_TO = 'function Z7f(e,t,n,i={}){const __p=typeof e.path==="string"&&/^[\\\\/]root[\\\\/]/.test(e.path)&&!/^[A-Za-z]:/.test(e.path)?"C:"+e.path.replace(/\\//g,"\\\\"):e.path;const r=we.file(__p),';
function buildShareTrimRuntime() {
    return `(function(){${shareTrim_1.shareTooBig.toString()};${shareTrim_1.shrinkMessages.toString()};${shareTrim_1.clampAttempt.toString()};return ${shareTrim_1.shareWithinLimit.toString()};})()`;
}
function applyShareTrimPatch(source) {
    if (source.includes(exports.SHARE_TRIM_MARKER)) {
        return { source, status: "already" };
    }
    const heads = (0, workbenchShape_1.findShareHeads)(source);
    const sends = (0, workbenchShape_1.findShareSends)(source);
    if (heads.length !== 1 || sends.length !== 1) {
        return {
            source,
            status: "missing-anchor",
            detail: `share heads=${heads.length} sends=${sends.length}`,
        };
    }
    const send = sends[0];
    const patchedSend = `${send.result}=await globalThis.__cursorShareTrimV1({messages:${send.messages},title:${send.title},send:(msgs,title,includePlan)=>${send.client}.shareConversation(new ${send.ctor}({conversationId:${send.conversationId},title:title,visibility:${send.visibility},messages:msgs,latestPlan:includePlan?${send.plan}:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)})`;
    const patched = source.replace(SHARE_SEND_RE_SOURCE(sends[0]), patchedSend).replace(heads[0].from, `async shareConversation(${shareHeadParams(heads[0].from)}){if(!globalThis.__cursorShareTrimV1){globalThis.__cursorShareTrimV1=${exports.SHARE_TRIM_MARKER}${buildShareTrimRuntime()};}if(!${heads[0].guard}())`);
    if (!patched.includes(exports.SHARE_TRIM_MARKER) || patched.includes(shareSendOriginal(send))) {
        return { source, status: "missing-anchor", detail: "share rewrite did not apply" };
    }
    return { source: patched, status: "inserted" };
}
function shareHeadParams(from) {
    const match = from.match(/async shareConversation\((.*)\)\{/);
    return match ? match[1] : "e,t,n";
}
function shareSendOriginal(send) {
    return `${send.result}=await ${send.client}.shareConversation(new ${send.ctor}({conversationId:${send.conversationId},title:${send.title},visibility:${send.visibility},messages:${send.messages},latestPlan:${send.plan}}))`;
}
function SHARE_SEND_RE_SOURCE(send) {
    return shareSendOriginal(send);
}
function applyShareErrorPatch(source) {
    if (source.includes(exports.SHARE_ERROR_MARKER) && source.includes("__prefix+__why")) {
        return { source, status: "already" };
    }
    const start = source.search(/function \w+\(\w+\)\{const __why=/);
    const end = source.indexOf(exports.SHARE_ERROR_MARKER, start);
    if (start >= 0 && end > start) {
        const named = source.slice(start).match(/^function (\w+)\((\w+)\)\{/);
        const tooBig = source.slice(start, end).match(/:(\w+)\(\w+\)\?"This chat is too large/);
        if (named && tooBig) {
            const upgraded = `${shareErrorReplacement(named[1], named[2], tooBig[1])}${exports.SHARE_ERROR_MARKER}`;
            return {
                source: source.slice(0, start) + upgraded + source.slice(end + exports.SHARE_ERROR_MARKER.length),
                status: "inserted",
            };
        }
    }
    const errors = (0, workbenchShape_1.findShareErrors)(source);
    if (errors.length !== 1) {
        return { source, status: "missing-anchor", detail: `share errors=${errors.length}` };
    }
    const error = errors[0];
    return {
        source: source.replace(error.from, `${shareErrorReplacement(error.name, error.param, error.tooBig)}${exports.SHARE_ERROR_MARKER}`),
        status: "inserted",
    };
}
function applyImagePathPatch(source) {
    if (source.includes(exports.IMAGE_PATH_MARKER) || source.includes("const __p=typeof e.path===\"string\"&&/^[\\\\/]root[\\\\/]/.test(e.path)")) {
        return { source, status: "already" };
    }
    if (countOf(source, IMAGE_FROM) !== 1) {
        return { source, status: "missing-anchor" };
    }
    return { source: source.replace(IMAGE_FROM, `${exports.IMAGE_PATH_MARKER}${IMAGE_TO}`), status: "inserted" };
}
function upgradeCacheReadBytes(source) {
    let next = source;
    let changed = false;
    for (const fileFn of ["we.file", "Ze.file"]) {
        const old = cacheWorkbench_1.CACHE_READ_BYTES_OLD.replaceAll("we.file", fileFn);
        const neu = cacheWorkbench_1.CACHE_READ_BYTES.replaceAll("we.file", fileFn);
        if (next.includes(old)) {
            next = next.split(old).join(neu);
            changed = true;
        }
    }
    return { source: next, changed };
}
const DESKTOP_SYMBOLS = {
    uri: "we",
    buffer: "pi",
    id: "Vn",
    bubble: "gf",
    header: "aN",
    workspace: "kS",
};
const GLASS_SYMBOLS = {
    uri: "Ze",
    buffer: "yr",
    id: "bi",
    bubble: "Vv",
    header: "RO",
    workspace: "n0",
};
function glassCacheMethods() {
    return (0, cacheWorkbench_1.cacheMethodsFor)(GLASS_SYMBOLS);
}
function applyShareCachePatch(source) {
    return applyCachePatch(source, {
        symbols: DESKTOP_SYMBOLS,
        registerPairs: [
            [cacheWorkbench_1.CACHE_REGISTER_FROM, cacheWorkbench_1.CACHE_REGISTER_TO],
            [cacheWorkbench_1.CACHE_REGISTER_FROM_32118, cacheWorkbench_1.CACHE_REGISTER_TO_32118],
        ],
        requireForkMethod: true,
    });
}
function applyGlassShareCachePatch(source) {
    return applyCachePatch(source, {
        symbols: GLASS_SYMBOLS,
        registerPairs: [
            [cacheWorkbench_1.GLASS_REGISTER_FROM, cacheWorkbench_1.GLASS_REGISTER_TO],
            [cacheWorkbench_1.GLASS_REGISTER_FROM_32118, cacheWorkbench_1.GLASS_REGISTER_TO_32118],
        ],
        requireForkMethod: false,
        rejectUnmappedGlass: true,
    });
}
function applyCachePatch(source, fallback) {
    if (source.includes(cacheWorkbench_1.SHARE_CACHE_MARKER)) {
        const upgraded = upgradeCacheReadBytes(source);
        const methods = upgradeCacheMethods(upgraded.source);
        return {
            source: methods.source,
            status: upgraded.changed || methods.changed ? "inserted" : "already",
        };
    }
    const menus = (0, workbenchShape_1.findMenuSites)(source);
    const forks = (0, workbenchShape_1.findForkSites)(source);
    const structural = (0, workbenchShape_1.findShareCommand)(source);
    const exact = structural ? undefined : pickRegister(source, fallback.registerPairs);
    if (menus.length !== 1 || forks.length !== 1 || (!structural && !exact)) {
        return {
            source,
            status: "missing-anchor",
            detail: `menu=${menus.length} fork=${forks.length} command=${structural ? "shape" : exact ? "exact" : "missing"}`,
        };
    }
    const symbols = (0, workbenchShape_1.discoverSymbols)(source, forks[0].index) ?? fallback.symbols;
    const methods = (0, cacheWorkbench_1.cacheMethodsFor)(symbols);
    if (fallback.rejectUnmappedGlass &&
        !(0, workbenchShape_1.discoverSymbols)(source, forks[0].index) &&
        (methods.includes("we.joinPath") || methods.includes("pi.") || methods.includes("Vn()") || methods.includes("gf()"))) {
        return { source, status: "missing-anchor", detail: "glass helper names were not rewritten" };
    }
    let patched = source.replace(menus[0].from, (0, workbenchShape_1.cacheMenuInsertion)(menus[0])).replace(forks[0].from, `${methods}${forks[0].from}`);
    if (structural) {
        patched = patched
            .replace(structural.decorateFrom, `${structural.decorateFrom};${(0, workbenchShape_1.shareCommandBlock)(structural)}`)
            .replace(structural.registerFrom, `${structural.registerFrom},${structural.register}(__ShareTrimCacheCommand),${structural.register}(__ShareTrimForkCommand)`);
    }
    else if (exact) {
        patched = patched.replace(exact.from, exact.to);
    }
    const registerLeft = exact && !structural ? patched.includes(exact.from) : false;
    if (!patched.includes(cacheWorkbench_1.SHARE_CACHE_MARKER) ||
        patched.includes(menus[0].from) ||
        registerLeft ||
        countOf(patched, "async cacheTranscript(") !== 1 ||
        (fallback.requireForkMethod && countOf(patched, "async forkCachedTranscript(") !== 1)) {
        return { source, status: "missing-anchor", detail: "cache rewrite did not apply" };
    }
    return { source: patched, status: "inserted" };
}
const EDITOR_TITLE_LABEL = 'title:(()=>{let __n="Cursor Optimization";try{let __fs;try{__fs=require("fs")}catch(__e){__fs=process.mainModule.require("fs")}const __j=JSON.parse(__fs.readFileSync((process.env.USERPROFILE||process.env.HOME||"")+"/.cursor/share-image-mirror.json","utf8"));if(__j.language==="en")__n="Cursor Optimization"}catch(__e){}return"Cache Transcript ("+__n+")"})()';
const EDITOR_TITLE_ITEM = `{command:{id:"composer.cacheTranscript",${EDITOR_TITLE_LABEL}},group:"1_chatTools",order:2.5,when:`;
function applyEditorTitleCachePatch(source) {
    if (source.includes('id:"composer.cacheTranscript",title:(()=>') || source.includes("order:2.5,when:")) {
        return { source, status: "already" };
    }
    const menus = (0, workbenchShape_1.findEditorMenus)(source);
    if (menus.length !== 1) {
        return { source, status: "missing-anchor", detail: `editor menus=${menus.length}` };
    }
    const site = menus[0];
    const patched = source.replace(site.from, `{command:{id:${site.shareId},title:"Share Transcript",icon:${site.icon}.link},group:"1_chatTools",order:2,when:${site.shareWhen}},${EDITOR_TITLE_ITEM}${site.copyWhen}},{command:{id:${site.copyId},title:"Copy Request ID"},group:"1_chatTools",order:3,when:${site.copyWhen}}`);
    return patched.includes(`order:2.5,when:${site.copyWhen}`)
        ? { source: patched, status: "inserted" }
        : { source, status: "missing-anchor", detail: "editor rewrite did not apply" };
}
function upgradeCacheMethods(source) {
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
    const fork = (0, workbenchShape_1.findForkSites)(source.slice(end))[0];
    const symbols = fork ? (0, workbenchShape_1.discoverSymbols)(source, end + fork.index) : undefined;
    const glass = source.slice(end, end + 120).includes("if(!DOe())");
    const next = (symbols ? (0, cacheWorkbench_1.cacheMethodsFor)(symbols) : (0, cacheWorkbench_1.cacheMethodsFor)(glass ? GLASS_SYMBOLS : DESKTOP_SYMBOLS)).replace(/^\n/, "");
    return { source: source.slice(0, start) + next + source.slice(end), changed: true };
}
function pickRegister(source, pairs) {
    return pairs
        .filter(([from]) => countOf(source, from) === 1)
        .map(([from, to]) => ({ from, to }))[0];
}
function countOf(source, needle) {
    let count = 0;
    let index = 0;
    while ((index = source.indexOf(needle, index)) !== -1) {
        count += 1;
        index += needle.length;
    }
    return count;
}
//# sourceMappingURL=sharePatch.js.map