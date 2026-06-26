#!/usr/bin/env node
/**
 * 既存 data/articles/*.json に AI 平易語レイヤーを付与し、
 * キーワード関連度で primarySpeech を再選定
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { excerptSpeech, pickSpeech } from "./lib/kokkai-api.mjs";
import { buildArticleLayers } from "./lib/article-summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const topics = JSON.parse(await readFile(path.join(root, "data/topics.json"), "utf8"));
const topicBySlug = Object.fromEntries(topics.map((t) => [t.slug, t]));

const articleDir = path.join(root, "data/articles");
const files = (await readdir(articleDir)).filter((f) => f.endsWith(".json") && f !== "index.json");

const changed = [];
const updated = [];

for (const file of files) {
  const slug = file.replace(/\.json$/, "");
  const topic = topicBySlug[slug];
  if (!topic) {
    console.warn(`skip (no topic): ${slug}`);
    continue;
  }

  const articlePath = path.join(articleDir, file);
  const article = JSON.parse(await readFile(articlePath, "utf8"));
  const rawPath = path.join(root, "data/raw/speeches", `${slug}.json`);
  const raw = JSON.parse(await readFile(rawPath, "utf8"));

  const prevId = article.primarySpeech?.speechID;
  const speech = pickSpeech(raw.speechRecord, topic.keyword);
  if (!speech) {
    console.warn(`no speech: ${slug}`);
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

  article.nowSummary = layers.nowSummary;
  article.summaryBullets = layers.summaryBullets;
  article.plainExplanation = layers.plainExplanation;
  article.glossary = layers.glossary;
  article.primarySpeech = {
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
  };

  await writeFile(articlePath, JSON.stringify(article, null, 2), "utf8");
  updated.push(slug);
  if (prevId !== speech.speechID) {
    changed.push(`${slug}: ${prevId} → ${speech.speechID} (${speech.speaker})`);
  }
  console.log(`OK ${slug}: ${speech.speaker} / ${speech.nameOfMeeting}`);
}

console.log(`\nupdated: ${updated.length}`);
if (changed.length) {
  console.log("speech re-selected:");
  for (const line of changed) console.log(`  ${line}`);
}
