"use strict";

const assert = require("assert");
const { shareTooBig, shareWithinLimit, shrinkMessages } = require("../out/shareTrim");
const { applyImagePathPatch, applyShareTrimPatch, buildShareTrimRuntime, SHARE_TRIM_MARKER } = require("../out/sharePatch");

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
  assert.strictEqual(created[created.length - 1].length, 30);
  assert.strictEqual(created[created.length - 1].includePlan, false);
  assert.ok(deleted.length >= 1);
  assert.ok(deleted.every((id) => id !== result.shareId));
  assert.ok(created.every((item) => item.includePlan === false));
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
      assert.strictEqual(includePlan, true);
      return { shareId: "full", shareUrl: "u", redactions: 1 };
    },
  });
  assert.strictEqual(calls, 1);
  assert.strictEqual(result.shareId, "full");
  assert.strictEqual(result.redactions, 1);
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
  assert.deepStrictEqual(message.images, []);
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
}

async function main() {
  await testKeepsLongestSuffix();
  await testUnchangedWhenItFits();
  await testTrimCanBeTurnedOff();
  await testOtherErrorsPropagate();
  await testTruncatesASingleOversizedMessage();
  testShrinkDropsImagesAndBytes();
  testTooBigDetector();
  testPatchRoundTrip();
  console.log("share trim tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
