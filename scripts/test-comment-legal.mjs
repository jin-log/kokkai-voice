#!/usr/bin/env node
import { scanCommentLegal } from "../functions/lib/comment-legal.mjs";

const cases = [
  {
    text: "〇〇候補は過去に不倫して金を揉み消したらしい。絶対に投票するな！",
    ok: false,
  },
  { text: "小池百合子は逮捕だろ", ok: false },
  { text: "ドシモネタだけど裏金があるらしい", ok: false },
  { text: "この法案には反対です。説明が足りない。", ok: true },
  { text: "高市首相の説明は納得できない。", ok: true },
  { text: "逮捕要件の議論は国会でもある。", ok: true },
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
