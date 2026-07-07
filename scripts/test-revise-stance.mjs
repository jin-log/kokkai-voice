#!/usr/bin/env node
/** formatStanceReviseText が policy-matrix の stance.text を読む回帰テスト */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatStanceReviseText } from "../functions/lib/revise-stance-format.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`NG ${msg}`);
  process.exit(1);
}

const fixture = {
  parties: [
    {
      partyLabel: "テスト党",
      symbol: "◎",
      stance: { text: "FIXTURE_STANCE_TEXT", sourceUrl: "https://example.com/s" },
      action: { text: "FIXTURE_ACTION_TEXT", speechUrl: "https://example.com/a" },
      symbolReason: "テスト判定",
    },
  ],
};

const out = formatStanceReviseText(fixture);
if (!out.includes("FIXTURE_STANCE_TEXT")) fail("stance.text が出力に含まれない");
if (!out.includes("FIXTURE_ACTION_TEXT")) fail("action.text が出力に含まれない");
if (!out.includes("公言:") || !out.includes("行動:")) fail("公言・行動ラベルがない");
if (/テスト党:\s*$/m.test(out)) fail("党名だけで中身が空の行がある");

const matrixPath = path.join(root, "data/policy-matrix/bouka-taisaku.json");
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
const live = formatStanceReviseText(matrix);
if (!live.includes("公言:") || live.includes("自由民主党:\n")) {
  fail("実データで公言展開されていない");
}

console.log("OK test:revise-stance");
