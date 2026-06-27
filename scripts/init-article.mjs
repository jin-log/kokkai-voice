#!/usr/bin/env node
/**
 * 新規案件記事の初期JSONを国会APIから自動生成
 *
 * Usage:
 *   node scripts/init-article.mjs \
 *     --slug "shohizei-genmen" \
 *     --title "食料品の消費税 — あの話どうなった？" \
 *     --keyword "食料品 消費税" \
 *     --tags "経済,税制" \
 *     --from 2023-01-01
 *
 * 生成物: data/articles/{slug}.json（既存の場合は上書き確認あり）
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSpeech, pickSpeech, scoreSpeechRelevance, excerptSpeech } from "./lib/kokkai-api.mjs";
import { buildNowSummaryBullets, buildGlossary, AI_DISCLAIMER } from "./lib/article-summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

// --- 引数パース ---
const slug     = arg("slug");
const title    = arg("title");
const keyword  = arg("keyword");
const tags     = (arg("tags") || "").split(",").map(s => s.trim()).filter(Boolean);
const category = arg("category", "国会");
const from     = arg("from", "2023-01-01");
const until    = arg("until", new Date().toISOString().slice(0, 10));
const force    = argFlag("force");

if (!slug || !title || !keyword) {
  console.error("必須: --slug --title --keyword");
  console.error("例: node scripts/init-article.mjs --slug test --title \"テスト\" --keyword \"消費税\"");
  process.exit(1);
}

const outPath = path.join(root, "data/articles", `${slug}.json`);

// 既存ファイルの確認
if (!force) {
  try {
    await access(outPath);
    console.error(`既存ファイルあり: ${outPath}`);
    console.error("上書きするには --force を付けてください");
    process.exit(1);
  } catch {
    // ファイルなし → 続行
  }
}

console.log(`[init-article] slug=${slug} keyword="${keyword}" from=${from}〜${until}`);

// --- 国会API取得（最大100件で良質な発言を確保）---
console.log("国会議事録API取得中...");
const data = await fetchSpeech({ any: keyword, from, until, maximumRecords: 100 });
const records = data.speechRecord ?? [];
const apiHits = parseInt(data.numberOfRecords ?? "0", 10);
console.log(`  ${apiHits}件ヒット、${records.length}件取得`);

// --- ベスト発言を選出 ---
const best = pickSpeech(records, keyword);
if (!best) {
  console.error("有効な発言が見つかりませんでした。--keyword を変えてみてください。");
  process.exit(1);
}

// --- arcSummary：日付ごとにスコア上位1件 → 最大8件 ---
const byDate = new Map();
for (const r of records) {
  if (!r.date || !r.speech) continue;
  const score = scoreSpeechRelevance(r, keyword);
  if (score < 5) continue;
  const prev = byDate.get(r.date);
  if (!prev || score > prev.score) {
    byDate.set(r.date, { record: r, score });
  }
}

const arcSummary = [...byDate.entries()]
  .sort(([a], [b]) => b.localeCompare(a)) // 新しい順
  .slice(0, 8)
  .map(([date, { record }]) => ({
    date,
    text: excerptSpeech(record.speech, 100),
  }));

// --- nowSummary ---
const keywords = keyword.split(/\s+/).filter(Boolean);
const nowBullets = buildNowSummaryBullets(best.speech, keywords);
const nowSummary = {
  label: "いまの結論",
  bullets: nowBullets.length > 0
    ? nowBullets
    : ["国会での審議状況については下記の議事録をご確認ください。"],
  disclaimer: AI_DISCLAIMER,
  updatedAt: new Date().toISOString(),
};

// --- primarySpeech ---
const primarySpeech = {
  speechID:        best.speechID ?? null,
  issueID:         best.issueID  ?? null,
  date:            best.date     ?? null,
  nameOfHouse:     best.nameOfHouse    ?? null,
  nameOfMeeting:   best.nameOfMeeting  ?? null,
  session:         best.session        ?? null,
  issue:           best.issue          ?? null,
  speaker:         best.speaker        ?? null,
  speakerGroup:    best.speakerGroup   ?? null,
  speakerPosition: best.speakerPosition ?? null,
  speechURL:       best.speechURL   ?? null,
  meetingURL:      best.meetingURL  ?? null,
  excerpt:         excerptSpeech(best.speech, 280),
  speechFull:      best.speech ?? null,
};

// --- xPosts スケルトン ---
const xPosts = Array.from({ length: 5 }, (_, i) => ({
  slot: i + 1,
  status: "search_failed",
  post_url: null,
  account_label: null,
  post_text: null,
  speaker_hint: null,
  captured_at: null,
  screenshot: null,
  note: "init-article で生成。x-research-batch.mjs で補完してください",
  researched_at: null,
}));

// --- legalReview / qaReview / stanceMatrix スケルトン ---
const legalReview = {
  status: "pending",
  checkedAt: null,
  notes: null,
};

const qaReview = {
  status: "pending",
  checkedAt: null,
  notes: null,
};

const stanceMatrix = {
  policySlug: slug,
  dataPath: `data/policy-matrix/${slug}.json`,
};

// --- timeline スケルトン ---
const timeline = arcSummary.slice(0, 5).map(a => ({
  date: a.date,
  event: a.text,
  label: null,
}));

// --- 組み立て ---
const article = {
  slug,
  title,
  tags,
  category,
  searchKeyword: keyword,
  fetchedAt: new Date().toISOString(),
  apiHits,
  nowSummary,
  arcSummary,
  primarySpeech,
  timeline,
  stanceMatrix,
  xPosts,
  legalReview,
  qaReview,
  xResearch: {
    researched_at: null,
    urls_found: 0,
    method: "pending",
    date_range: null,
  },
};

await mkdir(path.join(root, "data/articles"), { recursive: true });
await writeFile(outPath, JSON.stringify(article, null, 2) + "\n", "utf8");

console.log(`\n✅ 生成完了: ${outPath}`);
console.log(`  arcSummary: ${arcSummary.length}件`);
console.log(`  nowSummary: ${nowBullets.length}件`);
console.log(`  primarySpeech: ${primarySpeech.speaker}（${primarySpeech.date}）`);
console.log(`\n次のステップ:`);
console.log(`  1. data/articles/${slug}.json を確認・手修正（title・arcSummary）`);
console.log(`  2. data/policy-matrix/${slug}.json を作成（② 〇×）`);
console.log(`  3. node scripts/x-research-batch.mjs ${slug}（③ X調査）`);
console.log(`  4. npm run pipeline -- --slug ${slug}`);
