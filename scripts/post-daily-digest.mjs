#!/usr/bin/env node
/**
 * 日次 X 投稿 — 関心度・新しさ上位3件を1本にまとめる（1日1回）
 *
 *   node scripts/post-daily-digest.mjs
 *   node scripts/post-daily-digest.mjs --dry-run
 *   node scripts/post-daily-digest.mjs --force
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "../src/lib/articles.mjs";
import { pickTopForDigest } from "../src/lib/article-promo-score.mjs";
import { formatDailyDigestPost } from "../src/lib/format-daily-digest.mjs";
import {
  loadBufferApiKeyAsync,
  loadBufferChannelId,
  resolveTwitterChannel,
  createXPost,
} from "../src/lib/buffer-api.mjs";
import { refreshBufferStatus, recordBufferPost } from "../src/lib/buffer-status.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG_PATH = path.join(root, "data/daily-digest-log.json");

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function todayJst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

async function readLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    return { posts: [] };
  }
}

async function writeLog(log) {
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

function recentlyFeatured(log, days = 5) {
  const since = Date.now() - days * 86400000;
  const set = new Set();
  for (const p of log.posts || []) {
    if (new Date(p.postedAt).getTime() >= since) {
      for (const s of p.slugs || []) set.add(s);
    }
  }
  return set;
}

async function main() {
  const log = await readLog();
  const day = todayJst();

  if (!force && log.posts?.some((p) => p.date === day)) {
    console.log(`SKIP 本日(${day})の3選は投稿済み`);
    process.exit(0);
  }

  const articles = await loadAllArticles();
  if (articles.length < 1) {
    console.error("NG 公開記事がありません");
    process.exit(1);
  }

  const featured = recentlyFeatured(log);
  const picks = pickTopForDigest(articles, featured, 3);
  const text = formatDailyDigestPost(picks);

  console.log(`\n--- 日次3選 (${day}) ---\n${text}\n`);
  console.log(
    "選定:",
    picks.map((a) => `${a.slug}(${a.publishedAt?.slice(0, 10) || "?"})`).join(", "),
  );

  if (dryRun) process.exit(0);

  const apiKey = await loadBufferApiKeyAsync();
  if (!apiKey) {
    console.error("NG BUFFER_API_KEY 未設定");
    process.exit(1);
  }

  const check = await refreshBufferStatus();
  if (!check.ok) {
    console.error(`NG Buffer — ${check.message}`);
    process.exit(1);
  }

  const channelId = loadBufferChannelId() || check.channelId;
  const resolved = await resolveTwitterChannel(apiKey, channelId);
  if (!resolved.ok) {
    console.error(`NG ${resolved.message}`);
    process.exit(1);
  }

  const post = await createXPost(apiKey, {
    channelId: resolved.channel.id,
    text,
  });

  log.posts = [
    {
      date: day,
      postedAt: new Date().toISOString(),
      slugs: picks.map((a) => a.slug),
      postId: post.id,
    },
    ...(log.posts || []).slice(0, 30),
  ];
  await writeLog(log);
  await recordBufferPost({ slug: `digest-${day}`, ok: true, postId: post.id });

  console.log(`\nOK 日次3選を投稿しました (${post.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
