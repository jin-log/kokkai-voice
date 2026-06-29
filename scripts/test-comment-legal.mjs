#!/usr/bin/env node
import { scanCommentLegal } from "../functions/lib/comment-legal.mjs";

const cases = [
  { text: "小池百合子は逮捕だろ", ok: true },
  { text: "不倫して揉み消したらしい", ok: true },
  { text: "絶対に投票するな", ok: true },
  { text: "090-1234-5678", ok: true },
  { text: "この法案には反対", ok: true },
  { text: "死ね", ok: false },
  { text: "殺してやる", ok: false },
  { text: "ぶっ殺す", ok: false },
  { text: "ちんこ", ok: false },
  { text: "fuck you", ok: false },
];

let failed = 0;
for (const { text, ok } of cases) {
  const got = scanCommentLegal(text).ok;
  if (got !== ok) {
    console.error(`FAIL: expected ok=${ok} got ok=${got}\n  ${text}`);
    failed++;
  }
}
if (failed) process.exit(1);
console.log(`OK ${cases.length} cases`);
