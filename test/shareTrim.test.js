"use strict";

const assert = require("assert");
const { shareTooBig, shareWithinLimit, shrinkMessages } = require("../out/shareTrim");
const { applyEditorTitleCachePatch, applyGlassShareCachePatch, applyImagePathPatch, applyShareCachePatch, applyShareErrorPatch, applyShareTrimPatch, buildShareTrimRuntime, SHARE_ERROR_MARKER, SHARE_TRIM_MARKER } = require("../out/sharePatch");
const { CACHE_READ_BYTES, CACHE_READ_BYTES_OLD } = require("../out/cacheWorkbench");

function limitError() {
  const err = new Error("Error");
  err.details = [{ details: { detail: "Share exceeds content limits.", title: "Bad Request" } }];
  return err;
}

async function testKeepsLongestSuffix() {
  const messages = Array.from({ length: 40 }, (_, index) => ({ weight: 1, index }));
  const created = [];
  const deleted = [];
  const result = await shareWithinLimit({
    messages,
    title: "chat",
    minAttempts: 8,
    maxAttempts: 20,
    async send(slice, title, includePlan) {
      const weight = slice.reduce((sum, message) => sum + message.weight, 0) + (includePlan ? 1000 : 0);
      if (weight > 30) {
        throw limitError();
      }
      const shareId = `s${created.length}-${slice.length}`;
      created.push({ shareId, title, includePlan, length: slice.length });
      return { shareId, shareUrl: "https://cursor.com/s/x", redactions: 0 };
    },
    async deleteShare(shareId) {
      deleted.push(shareId);
    },
  });
  assert.strictEqual(result.shareId, created[created.length - 1].shareId);
  assert.strictEqual(result.attempt, 3);
  assert.strictEqual(result.messageCount, 30);
  assert.strictEqual(result.messageTotal, 40);
  assert.strictEqual(created[created.length - 1].length, 30);
  assert.strictEqual(created[created.length - 1].includePlan, false);
  assert.ok(deleted.length >= 1);
  assert.ok(deleted.every((id) => id !== result.shareId));
  assert.ok(created.every((item) => item.includePlan === false));
}

async function testKeepsImagesFromTrimmedMessages() {
  const messages = [
    { type: 1, text: "old", images: ["shot"] },
    { type: 1, text: "a" },
    { type: 1, text: "b" },
    { type: 1, text: "c" },
    { type: 1, text: "d" },
    { type: 1, text: "e" },
  ];
  const result = await shareWithinLimit({
    messages,
    title: "pics",
    minAttempts: 10,
    maxAttempts: 20,
    async send(slice) {
      if (slice.length > 3) {
        throw limitError();
      }
      const images = slice.reduce((sum, message) => sum + (message.images?.length || 0), 0);
      return { shareId: `n${slice.length}-i${images}`, shareUrl: "u", redactions: 0 };
    },
  });
  assert.strictEqual(result.shareId, "n3-i1");
  assert.strictEqual(result.imageCount, 1);
}

async function testMaxAttemptsStopsTheSearch() {
  let calls = 0;
  const messages = Array.from({ length: 8 }, () => ({ weight: 1 }));
  const result = await shareWithinLimit({
    messages,
    title: "cap",
    maxAttempts: 3,
    async send(slice) {
      calls += 1;
      if (slice.length > 4) {
        throw limitError();
      }
      return { shareId: `len-${slice.length}`, shareUrl: "u", redactions: 0 };
    },
  });
  assert.strictEqual(calls, 3);
  assert.strictEqual(result.attempt, 2);
  assert.strictEqual(result.messageCount, 4);
}

async function testMinAttemptsKeepsSearching() {
  let calls = 0;
  const messages = Array.from({ length: 16 }, () => ({ weight: 1 }));
  const result = await shareWithinLimit({
    messages,
    title: "floor",
    minAttempts: 6,
    maxAttempts: 10,
    async send(slice) {
      calls += 1;
      if (slice.length > 4) {
        throw limitError();
      }
      return { shareId: `len-${slice.length}`, shareUrl: "u", redactions: 0 };
    },
  });
  assert.strictEqual(calls, 5);
  assert.strictEqual(result.messageCount, 4);
}

async function testMinStopsOnceASuccessExists() {
  const messages = Array.from({ length: 8 }, () => ({ weight: 1 }));
  async function run(minAttempts) {
    let calls = 0;
    const result = await shareWithinLimit({
      messages,
      title: "floor",
      minAttempts,
      maxAttempts: 10,
      async send(slice) {
        calls += 1;
        if (slice.length > 6) {
          throw limitError();
        }
        return { shareId: `len-${slice.length}`, shareUrl: "u", redactions: 0 };
      },
    });
    return { result, calls };
  }
  const early = await run(1);
  const later = await run(5);
  assert.strictEqual(early.calls, 2);
  assert.strictEqual(early.result.messageCount, 4);
  assert.strictEqual(later.calls, 4);
  assert.strictEqual(later.result.messageCount, 6);
}

async function testMaxStopsWithoutSuccess() {
  let calls = 0;
  await assert.rejects(
    () =>
      shareWithinLimit({
        messages: Array.from({ length: 4 }, () => ({ text: "x".repeat(5000) })),
        title: "never",
        minAttempts: 1,
        maxAttempts: 2,
        async send() {
          calls += 1;
          throw limitError();
        },
      }),
    (error) => shareTooBig(error)
  );
  assert.strictEqual(calls, 2);
}

async function testPlanSwitchAppliesToEveryRound() {
  async function run(includePlan) {
    const plans = [];
    const lengths = [];
    await shareWithinLimit({
      messages: Array.from({ length: 8 }, () => ({ weight: 1 })),
      title: "plan",
      includePlan,
      minAttempts: 1,
      maxAttempts: 4,
      async send(slice, _title, plan) {
        plans.push(plan);
        lengths.push(slice.length);
        if (slice.length > 4) {
          throw limitError();
        }
        return { shareId: "ok", shareUrl: "u", redactions: 0 };
      },
    });
    return { plans, lengths };
  }
  const on = await run(true);
  const off = await run(false);
  assert.deepStrictEqual(on.plans, [true, true]);
  assert.deepStrictEqual(on.lengths, [8, 4]);
  assert.deepStrictEqual(off.plans, [false, false]);
  assert.deepStrictEqual(off.lengths, [8, 4]);
}

async function testUnchangedWhenItFits() {
  const messages = [{ weight: 1 }, { weight: 1 }];
  let calls = 0;
  const result = await shareWithinLimit({
    messages,
    title: "short",
    async send(slice, title, includePlan) {
      calls += 1;
      assert.strictEqual(slice.length, 2);
      assert.strictEqual(title, "short");
      assert.strictEqual(includePlan, false);
      return { shareId: "full", shareUrl: "u", redactions: 1 };
    },
  });
  assert.strictEqual(calls, 1);
  assert.strictEqual(result.shareId, "full");
  assert.strictEqual(result.redactions, 1);
  assert.strictEqual(result.attempt, 1);
  assert.strictEqual(result.messageCount, 2);
  assert.strictEqual(result.messageTotal, 2);
}

async function testTrimCanBeTurnedOff() {
  let calls = 0;
  await assert.rejects(
    () =>
      shareWithinLimit({
        messages: [{ weight: 1 }, { weight: 1 }, { weight: 1 }],
        title: "full",
        trim: false,
        async send() {
          calls += 1;
          throw limitError();
        },
      }),
    (error) => shareTooBig(error)
  );
  assert.strictEqual(calls, 1);
}

async function testOtherErrorsPropagate() {
  await assert.rejects(
    () =>
      shareWithinLimit({
        messages: [{ weight: 1 }],
        title: "x",
        async send() {
          throw new Error("not logged in");
        },
      }),
    /not logged in/
  );
}

async function testTruncatesASingleOversizedMessage() {
  const messages = [
    {
      text: "a".repeat(10000),
      images: [1, 2, 3],
      bytes: new Uint8Array([1, 2, 3, 4]),
    },
  ];
  const result = await shareWithinLimit({
    messages,
    title: "one",
    async send(slice) {
      const message = slice[0];
      if (message.text.length > 2500 || message.images.length > 0 || message.bytes.byteLength > 0) {
        throw limitError();
      }
      assert.ok(message.text.endsWith("...[truncated]"));
      return { shareId: "cut", shareUrl: "u", redactions: 0 };
    },
  });
  assert.strictEqual(result.shareId, "cut");
}

function testShrinkDropsImagesAndBytes() {
  const [message] = shrinkMessages(
    [{ text: "hello", images: ["x"], bytes: new Uint8Array([9]), note: "abcdef" }],
    5
  );
  assert.strictEqual(message.text, "hello");
  assert.deepStrictEqual(message.images, ["x"]);
  assert.strictEqual(message.bytes.byteLength, 0);
  assert.ok(message.note.startsWith("abcd"));
  assert.ok(message.note.includes("[truncated]"));
}

function testTooBigDetector() {
  assert.strictEqual(shareTooBig(limitError()), true);
  assert.strictEqual(shareTooBig(new Error("nope")), false);
  const debug = new Error("Error");
  debug.details = [{ debug: { details: { detail: "Share exceeds content limits." } } }];
  assert.strictEqual(shareTooBig(debug), true);
}

function testPatchRoundTrip() {
  const anchor = "async shareConversation(e,t,n){if(!UQe())";
  const send =
    "c=await o.shareConversation(new IWs({conversationId:e.data.composerId,title:t,visibility:n,messages:s,latestPlan:a}));return{shareId:c.shareId,shareUrl:c.shareUrl,redactions:c.redactions||0}";
  const source = `prefix ${anchor}throw new Error("x");const s=1,o=2,${send}}async deleteSharedConversation`;
  const first = applyShareTrimPatch(source);
  assert.strictEqual(first.status, "inserted");
  assert.ok(first.source.includes(SHARE_TRIM_MARKER));
  assert.ok(first.source.includes("if(!globalThis.__cursorShareTrimV1)"));
  assert.ok(!first.source.includes(`${SHARE_TRIM_MARKER}globalThis`));
  assert.ok(!first.source.includes(send));
  assert.strictEqual(applyShareTrimPatch(first.source).status, "already");
  assert.strictEqual(applyShareTrimPatch("no share here").status, "missing-anchor");

  const runtime = buildShareTrimRuntime();
  const loaded = new Function(`return ${runtime};`)();
  assert.strictEqual(typeof loaded, "function");

  const imageFrom = "function Z7f(e,t,n,i={}){const r=we.file(e.path),";
  const image = applyImagePathPatch(`head ${imageFrom} tail`);
  assert.strictEqual(image.status, "inserted");
  assert.ok(image.source.includes('we.file(__p)'));
  assert.strictEqual(applyImagePathPatch(image.source).status, "already");

  const errorFrom =
    'function nv_(e){return e instanceof Error&&e.message==="No content to share"?"Failed to share transcript. Agent conversation is empty.":tv_(e)?"This chat is too large to share. Try sharing a shorter chat.":"Failed to share transcript. Try again later."}';
  const errorPatch = applyShareErrorPatch(`head ${errorFrom} tail`);
  assert.strictEqual(errorPatch.status, "inserted");
  assert.ok(errorPatch.source.includes(SHARE_ERROR_MARKER));
  assert.ok(errorPatch.source.includes("__prefix+__why"));
  assert.strictEqual(applyShareErrorPatch(errorPatch.source).status, "already");
  const showReason = new Function(
    "e",
    "function tv_(){return false;}" +
      errorPatch.source.slice(errorPatch.source.indexOf("function nv_"), errorPatch.source.indexOf(SHARE_ERROR_MARKER)) +
      "return nv_(e);"
  );
  assert.strictEqual(
    showReason({ rawMessage: "You have reached the daily limit of shares. Please try again tomorrow.", message: "[unauthenticated] limit" }),
    "分享失败：You have reached the daily limit of shares. Please try again tomorrow."
  );
  globalThis.__cursorShareTrimLang = "en";
  assert.strictEqual(
    showReason({ rawMessage: "You have reached the daily limit of shares. Please try again tomorrow." }),
    "Share failed: You have reached the daily limit of shares. Please try again tomorrow."
  );
  delete globalThis.__cursorShareTrimLang;
}

function testCachePatch() {
  const source = [
    's?[Kd({id:I5t,label:"Share Transcript",enabled:!0,run:()=>c(I5t)})]:[],Kd({id:A5t,label:"Copy Request ID"',
    "async forkSharedConversation(e,t){if(!UQe())",
    "$e(gWh),$e(fWh),$e(vWh),$e(bWh);var EWh=class",
  ].join("\n");
  const first = applyShareCachePatch(source);
  assert.strictEqual(first.status, "inserted");
  assert.ok(first.source.includes("/*share-cache-1*/"));
  assert.ok(first.source.includes('label:"Cache Transcript ("+__n+")"'));
  assert.ok(first.source.includes('__n="Cursor Optimization"'));
  assert.ok(first.source.includes('label:"Cache Transcript ("+__n+")"'));
  assert.ok(first.source.includes("shareImageMirror.forkCache"));
  assert.ok(first.source.includes("$e(__ShareTrimCacheCommand)"));
  assert.ok(first.source.includes("$e(__ShareTrimForkCommand)"));
  assert.ok(first.source.includes("context.selectedImages"));
  assert.ok(first.source.includes("fs.existsSync(p)"));
  assert.strictEqual(applyShareCachePatch(first.source).status, "already");
  const stale = first.source.replace(CACHE_READ_BYTES, CACHE_READ_BYTES_OLD);
  assert.ok(stale.includes("const attempts=[we.file(imagePath)]"));
  const upgraded = applyShareCachePatch(stale);
  assert.strictEqual(upgraded.status, "inserted");
  assert.ok(upgraded.source.includes("fs.existsSync(p)"));
  assert.ok(!upgraded.source.includes("const attempts=[we.file(imagePath)]"));
  assert.strictEqual(applyShareCachePatch("nope").status, "missing-anchor");
  const methodsStart = first.source.indexOf("async __shareTrimLang()");
  const methodsEnd = first.source.indexOf("async forkSharedConversation(e,t){if(!UQe())");
  new Function(`class __CacheCheck {${first.source.slice(methodsStart, methodsEnd)}}`);
  const menuStart = first.source.indexOf("(()=>{let __n=");
  const menuEnd = first.source.indexOf(',Kd({id:A5t,label:"Copy Request ID"');
  new Function(`return ${first.source.slice(menuStart, menuEnd)};`);
  const registerStart = first.source.indexOf("var __ShareTrimCacheCommand");
  const registerEnd = first.source.indexOf("var EWh=class");
  new Function(first.source.slice(registerStart, registerEnd));
}

function testGlassCachePatch() {
  const source = [
    'tg({id:xbn,label:"Export Transcript",enabled:!0,run:()=>l(xbn)}),...s?[tg({id:s8t,label:"Share Transcript",enabled:!0,run:()=>l(s8t)})]:[],tg({id:Ibn,label:"Copy Request ID"',
    "async forkSharedConversation(t,e){if(!DOe())",
    '__decorate([zo(ppa)],a_v.prototype,"run",null),Lt(Zbv),Lt(Qbv),Lt(Jbv),Lt(e_v);var l_v=class',
  ].join("\n");
  const first = applyGlassShareCachePatch(source);
  assert.strictEqual(first.status, "inserted");
  assert.ok(first.source.includes("Cache Transcript ("));
  assert.ok(first.source.includes("Ze.joinPath"));
  assert.ok(!first.source.includes("we.joinPath"));
  assert.ok(first.source.includes("t.get(tp).forkCachedTranscript"));
  assert.strictEqual(applyGlassShareCachePatch(first.source).status, "already");
  const methodsStart = first.source.indexOf("async __shareTrimLang()");
  const methodsEnd = first.source.indexOf("async forkSharedConversation(t,e){if(!DOe())");
  new Function(`class __GlassCache {${first.source.slice(methodsStart, methodsEnd)}}`);
}

function testEditorTitleCachePatch() {
  const desktop =
    '{command:{id:I5t,title:"Share Transcript",icon:Re.link},group:"1_chatTools",order:2,when:ce.and(nu.Scheme.isEqualTo(dt.composer),uHt)},{command:{id:WMs,title:"Copy Request ID"},group:"1_chatTools",order:3,when:nu.Scheme.isEqualTo(dt.composer)}';
  const glass =
    '{command:{id:s8t,title:"Share Transcript",icon:vt.link},group:"1_chatTools",order:2,when:ut.and(hh.Scheme.isEqualTo(Pt.composer),I7t)},{command:{id:mpa,title:"Copy Request ID"},group:"1_chatTools",order:3,when:hh.Scheme.isEqualTo(Pt.composer)}';
  const desktopPatch = applyEditorTitleCachePatch(desktop);
  assert.strictEqual(desktopPatch.status, "inserted");
  assert.ok(desktopPatch.source.includes('id:"composer.cacheTranscript"'));
  assert.ok(desktopPatch.source.includes("order:2.5"));
  new Function(`return [${desktopPatch.source}];`);
  assert.strictEqual(applyEditorTitleCachePatch(desktopPatch.source).status, "already");
  const glassPatch = applyEditorTitleCachePatch(glass);
  assert.strictEqual(glassPatch.status, "inserted");
  new Function(`return [${glassPatch.source}];`);
  assert.strictEqual(applyEditorTitleCachePatch("nope").status, "missing-anchor");
}

async function main() {
  await testKeepsLongestSuffix();
  await testKeepsImagesFromTrimmedMessages();
  await testMaxAttemptsStopsTheSearch();
  await testMinAttemptsKeepsSearching();
  await testMinStopsOnceASuccessExists();
  await testMaxStopsWithoutSuccess();
  await testPlanSwitchAppliesToEveryRound();
  await testUnchangedWhenItFits();
  await testTrimCanBeTurnedOff();
  await testOtherErrorsPropagate();
  await testTruncatesASingleOversizedMessage();
  testShrinkDropsImagesAndBytes();
  testTooBigDetector();
  testPatchRoundTrip();
  testCachePatch();
  testGlassCachePatch();
  testEditorTitleCachePatch();
  console.log("share trim tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
