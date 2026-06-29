#!/usr/bin/env node
/**
 * 20案件分 — 国会APIから実発言を取得し data/articles/*.json を生成
 * X投稿は各5枠（URL・スクショは Phase 2 — 構造のみ）
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  excerptSpeech,
  fetchSpeech,
  pickSpeech,
} from "./lib/kokkai-api.mjs";
import { buildArticleLayers } from "./lib/article-summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const from = "2026-01-01";
const until = new Date().toISOString().slice(0, 10);

const topics = JSON.parse(await readFile(path.join(root, "data/topics.json"), "utf8"));

function emptyXSlots() {
  return Array.from({ length: 5 }, (_, i) => ({
    slot: i + 1,
    status: "pending_url",
    post_url: null,
    account_label: null,
    speaker_hint: null,
    captured_at: null,
    screenshot: null,
    note: "オーナー/CEOがURL登録後、スクショ取得（x-archive.md）",
  }));
}

const articles = [];
let ok = 0;
let miss = 0;

for (const topic of topics) {
  const rawDir = path.join(root, "data/raw/speeches");
  await mkdir(rawDir, { recursive: true });
  const rawPath = path.join(rawDir, `${topic.slug}.json`);

  let data;
  try {
    data = await fetchSpeech({
      any: topic.keyword,
      from,
      until,
      maximumRecords: 30,
    });
    await writeFile(rawPath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`FAIL API ${topic.slug}:`, e.message);
    miss++;
    continue;
  }

  const speech = pickSpeech(data.speechRecord, topic.keyword);
  if (!speech) {
    console.warn(`no speech: ${topic.slug}`);
    miss++;
    continue;
  }

  const excerpt = excerptSpeech(speech.speech);
  const speechMeta = {
    date: speech.date,
    nameOfHouse: speech.nameOfHouse,
    nameOfMeeting: speech.nameOfMeeting,
    speaker: speech.speaker,
    speakerGroup: speech.speakerGroup,
  };
  const layers = buildArticleLayers(speech.speech, [topic.keyword], speechMeta);
  const article = {
    slug: topic.slug,
    title: topic.title,
    tags: topic.tags,
    category: "国会",
    searchKeyword: topic.keyword,
    fetchedAt: new Date().toISOString(),
    apiHits: data.numberOfRecords ?? 0,
    nowSummary: layers.nowSummary,
    summaryBullets: layers.summaryBullets,
    plainExplanation: layers.plainExplanation,
    glossary: layers.glossary,
    primarySpeech: {
      speechID: speech.speechID,
      issueID: speech.issueID,
      date: speech.date,
      nameOfHouse: speech.nameOfHouse,
      nameOfMeeting: speech.nameOfMeeting,
      session: speech.session,
      issue: speech.issue,
      speaker: speech.speaker,
      speakerGroup: speech.speakerGroup,
      speakerPosition: speech.speakerPosition,
      speechURL: speech.speechURL,
      meetingURL: speech.meetingURL,
      excerpt,
      speechFull: speech.speech,
    },
    xPosts: emptyXSlots(),
    youtubeShorts: [],
    legalReview: {
      status: "pending",
      agent: "legal-check",
      note: "アップロード前に別エージェントでスキャン",
    },
    publishReady: false,
  };

  const outPath = path.join(root, "data/articles", `${topic.slug}.json`);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(article, null, 2), "utf8");
  articles.push(article);
  ok++;
  console.log(`OK ${topic.slug}: ${speech.speaker} (${speech.date})`);
}

await writeFile(
  path.join(root, "data/articles/index.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      from,
      until,
      count: articles.length,
      slugs: articles.map((a) => a.slug),
    },
    null,
    2
  ),
  "utf8"
);

console.log(`\ndone: ${ok} articles, ${miss} skipped`);
