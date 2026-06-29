#!/usr/bin/env node
/**
 * 新規公開案件を Buffer 経由で X 投稿（日上限3本）
 *
 *   node scripts/post-to-buffer.mjs --recent 1
 *   node scripts/post-to-buffer.mjs --slug shussho-budget-seika
 *   node scripts/post-to-buffer.mjs --dry-run
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "../src/lib/articles.mjs";
import { formatXMainPost } from "../src/lib/promo-generate.mjs";
import {
  loadBufferApiKeyAsync,
  loadBufferChannelId,
  resolveTwitterChannel,
  createXPost,
} from "../src/lib/buffer-api.mjs";
import {
  refreshBufferStatus,
  recordBufferPost,
  loadBufferStatusFile,
} from "../src/lib/buffer-status.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const LOG_PATH = path.join(root, "data/buffer-post-log.json");
const DAILY_CAP = 3;

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug");
const recentDays = arg("--recent");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

async function readLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeLog(log) {
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

async function pickTargets(articles) {
  if (slug) {
    const a = articles.find((x) => x.slug === slug);
    return a ? [a] : [];
  }

  if (recentDays) {
    const days = Number(recentDays);
    const since = Date.now() - days * 86400000;
    return articles.filter((a) => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      return t >= since;
    });
  }

  return [];
}

async function main() {
  const apiKey = await loadBufferApiKeyAsync();
  if (!apiKey) {
    console.log("SKIP Buffer — BUFFER_API_KEY 未設定（docs/buffer-setup.md）");
    await refreshBufferStatus();
    process.exit(0);
  }

  const check = await refreshBufferStatus();
  if (!check.ok) {
    console.error(`NG Buffer 連携 — ${check.message}`);
    process.exit(1);
  }

  const articles = await loadAllArticles();
  const targets = await pickTargets(articles);
  const log = await readLog();
  const statusFile = await loadBufferStatusFile();
  const today = new Date().toISOString().slice(0, 10);
  let postedToday =
    statusFile.postsTodayDate === today ? statusFile.postsToday ?? 0 : 0;

  const pending = targets.filter((a) => {
    if (force) return true;
    return !log[a.slug];
  });

  if (pending.length === 0) {
    console.log("SKIP Buffer — 投稿対象なし（済み or --slug/--recent 指定なし）");
    process.exit(0);
  }

  const channelId = loadBufferChannelId() || check.channelId;
  const resolved = await resolveTwitterChannel(apiKey, channelId);
  if (!resolved.ok) {
    await recordBufferPost({ slug: pending[0].slug, ok: false, error: resolved.message });
    console.error(`NG ${resolved.message}`);
    process.exit(1);
  }

  let okCount = 0;
  for (const article of pending) {
    if (postedToday >= DAILY_CAP) {
      console.log(`SKIP 日上限 ${DAILY_CAP} 本に達しました`);
      break;
    }

    const text = formatXMainPost(article);
    console.log(`\n対象: ${article.slug}`);
    if (dryRun) {
      console.log(text);
      continue;
    }

    try {
      const post = await createXPost(apiKey, {
        channelId: resolved.channel.id,
        text,
      });
      log[article.slug] = new Date().toISOString();
      await writeLog(log);
      await recordBufferPost({ slug: article.slug, ok: true, postId: post.id });
      postedToday++;
      okCount++;
      console.log(`OK Buffer post ${post.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordBufferPost({ slug: article.slug, ok: false, error: msg });
      console.error(`NG ${article.slug} — ${msg}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  await refreshBufferStatus();
  console.log(`\n完了: ${okCount} 本投稿（本日 ${postedToday}/${DAILY_CAP}）`);
  process.exit(okCount > 0 || dryRun ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await refreshBufferStatus().catch(() => {});
  process.exit(1);
});
