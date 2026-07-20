#!/usr/bin/env node
/**
 * 法務チェック自動スキャン（L1〜L7 + L9）
 *
 * Usage:
 *   node scripts/legal-check.mjs --slug shohizei-genmen
 *   node scripts/legal-check.mjs --all
 *   node scripts/legal-check.mjs --all --fix   # 問題なしの場合は status: ok を自動書き込み
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stanceActionDistinct, isRawSpeechStance } from "../src/lib/diet-voice.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");

const args = process.argv.slice(2);
const slugArg  = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const doAll    = args.includes("--all");
const doFix    = args.includes("--fix");
const silent   = args.includes("--silent"); // 問題なしの slug を出力しない

// ---- ルール定義 ----

/** L1: 選挙誘導ワード（選挙期間中に問題になりやすいフレーズ） */
const L1_PATTERNS = [
  /[○◯〇✓]票を入れ/,
  /投票してください/,
  /に一票/,
  /支持してください/,
  /応援してください/,
  /を当選させ/,
];

/** L2: 名誉毀損リスクワード（断定的な人格攻撃） */
const L2_PATTERNS = [
  /は嘘をついて/,
  /は虚偽を述べ/,
  /は詐欺/,
  /犯罪者/,
  /は腐敗して/,
  /人間のクズ/,
  /は売国/,
];

/** L4: 個人情報パターン */
const L4_PATTERNS = [
  /\d{3}-\d{4}(-\d{4})?/,         // 電話番号・郵便番号
  /[〒]\s*\d{3}-\d{4}/,           // 郵便番号
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,  // メールアドレス
];

// ---- チェック関数 ----

function extractText(article) {
  const parts = [
    article.title ?? "",
    ...(article.nowSummary?.bullets ?? []),
    ...(article.arcSummary ?? []).map(a => a.text ?? ""),
    article.primarySpeech?.excerpt ?? "",
    ...(article.timeline ?? []).map(t => t.event ?? ""),
  ];
  return parts.join("\n");
}

function checkL1(text) {
  const hits = L1_PATTERNS.filter(p => p.test(text));
  return hits.length > 0
    ? { ok: false, rule: "L1", msg: `選挙誘導ワード検出: ${hits.map(p => p.source).join(", ")}` }
    : null;
}

function checkL2(text) {
  const hits = L2_PATTERNS.filter(p => p.test(text));
  return hits.length > 0
    ? { ok: false, rule: "L2", msg: `名誉毀損リスクワード: ${hits.map(p => p.source).join(", ")}` }
    : null;
}

function checkL3(article) {
  const ps = article.primarySpeech;
  if (!ps) return { ok: false, rule: "L3", msg: "primarySpeech が存在しない" };
  if (!ps.speechURL && !ps.meetingURL) {
    return { ok: false, rule: "L3", msg: "primarySpeech に出典URL（speechURL/meetingURL）がない" };
  }
  return null;
}

function checkL4(text) {
  const hits = L4_PATTERNS.filter(p => p.test(text));
  return hits.length > 0
    ? { ok: false, rule: "L4", msg: `個人情報らしきパターン検出: ${hits.map(p => p.source).join(", ")}` }
    : null;
}

function checkL5(article) {
  const disc = article.nowSummary?.disclaimer ?? "";
  if (!disc) {
    return { ok: false, rule: "L5", msg: "nowSummary.disclaimer（AI表示）が空" };
  }
  return null;
}

function checkL6(article) {
  const posts = article.xPosts ?? [];
  const issues = [];
  for (const p of posts) {
    if (p.screenshot && !p.post_url) {
      issues.push(`slot ${p.slot}: screenshot あり・post_url なし`);
    }
  }
  return issues.length > 0
    ? { ok: false, rule: "L6", msg: `Xスクショ出典URL不備: ${issues.join(" / ")}` }
    : null;
}

function checkL7(text) {
  // 運営者実名・電話などが記事本文に含まれていないか（簡易）
  const OWNER_PATTERNS = [/國脇/, /くにわき/, /bero19800228/];
  const hits = OWNER_PATTERNS.filter(p => p.test(text));
  return hits.length > 0
    ? { ok: false, rule: "L7", msg: "運営者個人情報らしき文字列を検出" }
    : null;
}

/** L9: 公言と行動 — 方針＝議事録切り出し／行動＝同一引用コピペ */
async function checkL9(article) {
  const sm = article.stanceMatrix;
  if (!sm?.dataPath && !sm?.policySlug) return null;
  const matrixPath = path.join(
    root,
    sm.dataPath || `data/policy-matrix/${sm.policySlug || article.slug}.json`,
  );
  let matrix;
  try {
    matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  } catch {
    return null;
  }
  const bad = [];
  for (const p of matrix.parties || []) {
    const stance = p.stance?.text || "";
    const action = p.action?.text || "";
    const label = p.partyLabel || "?";
    if (isRawSpeechStance(stance)) {
      bad.push(`${label}: 方針が議事録切り出し`);
    }
    if (stance && action && !stanceActionDistinct(stance, action)) {
      bad.push(`${label}: 方針と行動が同一引用の切り貼り`);
    }
  }
  return bad.length
    ? { ok: false, rule: "L9", msg: `公言と行動NG — ${bad.join(" / ")}` }
    : null;
}

// ---- メイン ----

async function checkSlug(slug) {
  const filePath = path.join(articlesDir, `${slug}.json`);
  let article;
  try {
    article = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return { slug, issues: [{ rule: "ERR", msg: "ファイル読み込み失敗" }] };
  }

  const text = extractText(article);
  const checks = [
    checkL1(text),
    checkL2(text),
    checkL3(article),
    checkL4(text),
    checkL5(article),
    checkL6(article),
    checkL7(text),
    await checkL9(article),
  ].filter(Boolean);

  return { slug, article, filePath, issues: checks };
}

async function main() {
  let slugs = [];

  if (slugArg) {
    slugs = [slugArg];
  } else if (doAll) {
    const files = await readdir(articlesDir);
    slugs = files
      .filter(f => f.endsWith(".json") && f !== "index.json" && f !== "parked.json")
      .map(f => f.replace(/\.json$/, ""));
  } else {
    console.error("--slug <slug> か --all が必要です");
    process.exit(1);
  }

  let totalOk = 0;
  let totalNG = 0;

  for (const slug of slugs) {
    const { article, filePath, issues } = await checkSlug(slug);

    if (issues.length === 0) {
      totalOk++;
      if (!silent) console.log(`✅ ${slug}: 問題なし`);

      if (doFix && article && filePath) {
        // status が pending の場合のみ ok に更新
        if (article.legalReview?.status !== "ok") {
          article.legalReview = {
            status: "ok",
            checkedAt: new Date().toISOString(),
            notes: "auto-scan: L1-L7 クリア",
          };
          await writeFile(filePath, JSON.stringify(article, null, 2) + "\n", "utf8");
          console.log(`  → legalReview.status: ok に更新`);
        }
      }
    } else {
      totalNG++;
      console.log(`\n【法務】${slug}`);
      for (const issue of issues) {
        console.log(`  ❌ ${issue.rule}: ${issue.msg}`);
      }
    }
  }

  console.log(`\n--- 結果 ---`);
  console.log(`OK: ${totalOk} / NG: ${totalNG} / 合計: ${slugs.length}`);

  if (totalNG > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
