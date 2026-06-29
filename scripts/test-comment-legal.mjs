#!/usr/bin/env node
import { scanCommentLegal } from "../functions/lib/comment-legal.mjs";

const cases = [
  { text: "小池百合子は逮捕だろ", ok: true },
  { text: "不倫して揉み消したらしい", ok: true },
  { text: "ドシモネタだけど裏金があるらしい", ok: true },
  { text: "この法案には反対です", ok: true },
  {
    text: "〇〇候補は過去に不倫して金を揉み消したらしい。絶対に投票するな！",
    ok: false,
  },
  { text: "投票してください", ok: false },
  { text: "090-1234-5678", ok: false },
  { text: "死ね", ok: false },
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
