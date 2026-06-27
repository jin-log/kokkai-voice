#!/usr/bin/env node
/**
 * 国会以外（地方・行政・リコール等）の記事骨組みを生成
 *
 * Usage:
 *   node scripts/init-article-general.mjs \
 *     --slug tokyo-recall \
 *     --title "東京リコール — あの話どうなった？" \
 *     --keyword "東京リコール" \
 *     --category "地方" \
 *     --sources "https://...,https://..."
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AI_DISCLAIMER } from "./lib/article-summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const slug = arg("slug");
const title = arg("title");
const keyword = arg("keyword");
const tags = (arg("tags") || "").split(",").map((s) => s.trim()).filter(Boolean);
const category = arg("category", "地方");
const sourcesRaw = arg("sources", "");
const force = argFlag("force");

const sourceUrls = sourcesRaw
  .split(/[,、\n]/)
  .map((s) => s.trim())
  .filter((u) => u.startsWith("http"));

if (!slug || !title || !keyword) {
  console.error("必須: --slug --title --keyword");
  process.exit(1);
}

const outPath = path.join(root, "data/articles", `${slug}.json`);

if (!force) {
  try {
    await access(outPath);
    console.error(`既存ファイルあり: ${outPath}（--force で上書き）`);
    process.exit(1);
  } catch {
    /* ok */
  }
}

const today = new Date().toISOString().slice(0, 10);
const excerptBase =
  sourceUrls.length > 0
    ? `${keyword}に関する公開情報を整理中。出典リンク ${sourceUrls.length} 件を登録済み。`
    : `${keyword}に関する公開情報を収集中。ソースURL・X投稿・会見動画を追加してください。`;

const primarySpeech = {
  speechID: null,
  issueID: null,
  date: today,
  nameOfHouse: category,
  nameOfMeeting: "公開ソース",
  session: null,
  issue: null,
  speaker: null,
  speakerGroup: null,
  speakerPosition: null,
  speechURL: sourceUrls[0] ?? null,
  meetingURL: null,
  excerpt: excerptBase,
  speechFull: null,
};

const timeline = sourceUrls.map((url, i) => ({
  date: today,
  event: `出典${i + 1}: ${url}`,
  label: "source",
  sourceUrl: url,
}));

const xPosts = Array.from({ length: 5 }, (_, i) => ({
  slot: i + 1,
  status: "search_failed",
  post_url: null,
  account_label: null,
  post_text: null,
  speaker_hint: null,
  captured_at: null,
  screenshot: null,
  note: "x-research-batch.mjs で補完",
  researched_at: null,
}));

const article = {
  slug,
  title,
  tags: tags.length ? tags : [category],
  category,
  searchKeyword: keyword,
  sourceUrls,
  fetchedAt: new Date().toISOString(),
  apiHits: 0,
  nowSummary: {
    label: "いまの結論",
    bullets: [
      `${keyword}について、公開されている発言・声明・報道を順次整理します。`,
      sourceUrls.length
        ? `一次ソース ${sourceUrls.length} 件を登録済み。`
        : "管理画面またはJSON編集でソースURLを追加してください。",
    ],
    disclaimer: `${AI_DISCLAIMER} 国会議事録以外の案件です。正本は各出典リンクをご確認ください。`,
    updatedAt: new Date().toISOString(),
  },
  arcSummary: [],
  primarySpeech,
  timeline,
  stanceMatrix: {
    policySlug: slug,
    dataPath: `data/policy-matrix/${slug}.json`,
  },
  xPosts,
  legalReview: { status: "pending", checkedAt: null, notes: null },
  qaReview: { status: "pending", checkedAt: null, notes: null },
  xResearch: {
    researched_at: null,
    urls_found: 0,
    method: "pending",
    date_range: null,
  },
  publishReady: false,
  pageReady: false,
};

await mkdir(path.join(root, "data/articles"), { recursive: true });
await writeFile(outPath, JSON.stringify(article, null, 2) + "\n", "utf8");

console.log(`\n✅ 生成完了（${category}）: ${outPath}`);
console.log(`  sourceUrls: ${sourceUrls.length}件`);
console.log(`\n次のステップ:`);
console.log(`  1. arcSummary・timeline を手修正（またはソースから追記）`);
console.log(`  2. node scripts/x-research-batch.mjs ${slug}`);
console.log(`  3. node scripts/legal-check.mjs --slug ${slug}`);
