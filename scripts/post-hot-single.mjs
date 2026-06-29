#!/usr/bin/env node
/**
 * 夜の単体 X — スコアが閾値以上の「熱い」案件のみ（1日最大2本のうち2本目）
 *
 *   node scripts/post-hot-single.mjs
 *   node scripts/post-hot-single.mjs --dry-run
 *   node scripts/post-hot-single.mjs --force
 */
import {
  loadBufferApiKeyAsync,
  loadBufferChannelId,
  resolveTwitterChannel,
  createXPost,
} from "../src/lib/buffer-api.mjs";
import { refreshBufferStatus, recordBufferPost } from "../src/lib/buffer-status.mjs";
import { loadAllArticles } from "../src/lib/articles.mjs";
import { HOT_SCORE_THRESHOLD, pickHotSingle } from "../src/lib/article-promo-score.mjs";
import { formatXMainPost } from "../src/lib/promo-generate.mjs";
import {
  hotPostedToday,
  postsTodayCount,
  readXPostLog,
  todayDigestSlugs,
  todayJst,
  writeXPostLog,
} from "../src/lib/x-post-log.mjs";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

async function main() {
  const day = todayJst();
  const log = await readXPostLog();

  if (!force && hotPostedToday(log, day)) {
    console.log(`SKIP 本日(${day})の夜単体は投稿済み`);
    process.exit(0);
  }

  if (!force && postsTodayCount(log, day) >= 2) {
    console.log(`SKIP 本日のX上限(2本)に達しています`);
    process.exit(0);
  }

  const articles = await loadAllArticles();
  const excludeSlugs = todayDigestSlugs(log, day);
  const { article, score, reason } = pickHotSingle(articles, {
    excludeSlugs,
    minScore: HOT_SCORE_THRESHOLD,
  });

  if (!article) {
    console.log(
      `SKIP 夜単体なし — 最高スコア ${score ?? 0} < 閾値 ${HOT_SCORE_THRESHOLD} (${reason})`,
    );
    process.exit(0);
  }

  const text = formatXMainPost(article);
  console.log(`\n--- 夜・単体 (${day}) score=${score} ---\n${text}\n`);

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

  log.hot = [
    {
      date: day,
      postedAt: new Date().toISOString(),
      slug: article.slug,
      score,
      postId: post.id,
    },
    ...(log.hot || []).slice(0, 30),
  ];
  await writeXPostLog(log);
  await recordBufferPost({ slug: article.slug, ok: true, postId: post.id });

  console.log(`\nOK 夜単体を投稿しました ${article.slug} (${post.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
