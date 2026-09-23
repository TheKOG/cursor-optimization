"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_PATH_MARKER = exports.SHARE_TRIM_MARKER = void 0;
exports.buildShareTrimRuntime = buildShareTrimRuntime;
exports.applyShareTrimPatch = applyShareTrimPatch;
exports.applyImagePathPatch = applyImagePathPatch;
const shareTrim_1 = require("./shareTrim");
exports.SHARE_TRIM_MARKER = "/*share-trim-1*/";
const SHARE_ANCHOR = "async shareConversation(e,t,n){if(!UQe())";
const SHARE_SEND = "c=await o.shareConversation(new IWs({conversationId:e.data.composerId,title:t,visibility:n,messages:s,latestPlan:a}));return{shareId:c.shareId,shareUrl:c.shareUrl,redactions:c.redactions||0}";
const SHARE_SEND_PATCHED = "c=await globalThis.__cursorShareTrimV1({messages:s,title:t,send:(msgs,title,includePlan)=>o.shareConversation(new IWs({conversationId:e.data.composerId,title:title,visibility:n,messages:msgs,latestPlan:includePlan?a:void 0})),deleteShare:(id)=>this.deleteSharedConversation(id)});return{shareId:c.shareId,shareUrl:c.shareUrl,redactions:c.redactions||0}";
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
    const anchors = countOf(source, SHARE_ANCHOR);
    const sends = countOf(source, SHARE_SEND);
    if (anchors !== 1 || sends !== 1) {
        return { source, status: "missing-anchor" };
    }
    const patched = source
        .replace(SHARE_SEND, SHARE_SEND_PATCHED)
        .replace(SHARE_ANCHOR, `async shareConversation(e,t,n){if(!globalThis.__cursorShareTrimV1){globalThis.__cursorShareTrimV1=${exports.SHARE_TRIM_MARKER}${buildShareTrimRuntime()};}if(!UQe())`);
    if (!patched.includes(exports.SHARE_TRIM_MARKER) || patched.includes(SHARE_SEND)) {
        return { source, status: "missing-anchor" };
    }
    return { source: patched, status: "inserted" };
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