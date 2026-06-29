#!/usr/bin/env node
/**
 * 昼の X 投稿 — 関心度・新しさ上位3件を1本にまとめる
 *
 *   node scripts/post-daily-digest.mjs
 *   node scripts/post-daily-digest.mjs --dry-run
 *   node scripts/post-daily-digest.mjs --force
 */
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
import {
  digestPostedToday,
  readXPostLog,
  recentlyInDigest,
  todayJst,
  writeXPostLog,
} from "../src/lib/x-post-log.mjs";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

async function main() {
  const log = await readXPostLog();
  const day = todayJst();

  if (!force && digestPostedToday(log, day)) {
    console.log(`SKIP 本日(${day})の昼3選は投稿済み`);
    process.exit(0);
  }

  const articles = await loadAllArticles();
  if (articles.length < 1) {
    console.error("NG 公開記事がありません");
    process.exit(1);
  }

  const featured = recentlyInDigest(log);
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

  log.digest = [
    {
      date: day,
      slot: "noon",
      postedAt: new Date().toISOString(),
      slugs: picks.map((a) => a.slug),
      postId: post.id,
    },
    ...(log.digest || []).slice(0, 30),
  ];
  await writeXPostLog(log);
  await recordBufferPost({ slug: `digest-${day}`, ok: true, postId: post.id });

  console.log(`\nOK 昼3選を投稿しました (${post.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
