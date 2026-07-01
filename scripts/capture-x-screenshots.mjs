#!/usr/bin/env node
/**
 * X 投稿スクショ一括/単体取得 → public/assets/x-screenshots + 記事JSON更新
 *
 * chrome-profile.json（Profile 9）があればそれを使用。なければ初回のみ browser:login -- x
 *
 * Usage:
 *   node scripts/capture-x-screenshots.mjs --slug shoshika --slot 1
 *   node scripts/capture-x-screenshots.mjs --url https://x.com/.../status/...
 *   node scripts/capture-x-screenshots.mjs --slug shoshika          # 全枠
 *   node scripts/capture-x-screenshots.mjs --all --limit 5
 *   node scripts/capture-x-screenshots.mjs --all --dry-run
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyScreenshotToArticle,
  captureTweetScreenshot,
  root,
} from "./lib/x-screenshot.mjs";

const articlesDir = path.join(root, "data/articles");

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug");
const slotArg = arg("--slot");
const urlArg = arg("--url");
const limit = Number(arg("--limit") || "20");
const dryRun = flag("--dry-run");
const allPending = flag("--all");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadArticle(s) {
  return JSON.parse(await readFile(path.join(articlesDir, `${s}.json`), "utf8"));
}

async function saveArticle(s, article) {
  await writeFile(
    path.join(articlesDir, `${s}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
    "utf8",
  );
}

/** @param {import('../src/lib/articles.mjs').Article} article */
function pendingPosts(article) {
  return (article.xPosts ?? []).filter(
    (p) => p.post_url && !p.screenshot && p.status !== "search_failed",
  );
}

async function listSlugs() {
  const files = await readdir(articlesDir);
  return files
    .filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "parked.json")
    .map((f) => f.replace(/\.json$/, ""));
}

async function captureOne(articleSlug, post) {
  console.log(`  capture slot ${post.slot}: ${post.post_url}`);
  if (dryRun) return { ok: true, dry: true };

  const result = await captureTweetScreenshot(post.post_url);
  const article = await loadArticle(articleSlug);
  applyScreenshotToArticle(
    article,
    post.slot,
    result.publicPath,
    result.thumbPublic,
    result.capturedAt,
    result.sha256,
  );
  await saveArticle(articleSlug, article);
  console.log(`  OK ${result.publicPath} thumb ${result.thumbPublic}`);
  return { ok: true, path: result.publicPath };
}

async function main() {
  if (urlArg) {
    if (dryRun) {
      console.log(`dry-run: ${urlArg}`);
      return;
    }
    const result = await captureTweetScreenshot(urlArg);
    console.log(`OK ${result.publicPath} thumb ${result.thumbPublic} sha256=${result.sha256.slice(0, 12)}…`);
    return;
  }

  const jobs = [];

  if (allPending) {
    for (const s of await listSlugs()) {
      const article = await loadArticle(s);
      for (const p of pendingPosts(article)) {
        jobs.push({ slug: s, post: p });
      }
    }
  } else if (slug) {
    const article = await loadArticle(slug);
    let posts = pendingPosts(article);
    if (slotArg) {
      const slot = Number(slotArg);
      posts = posts.filter((p) => p.slot === slot);
      if (!posts.length) {
        const any = article.xPosts?.find((p) => p.slot === slot);
        if (any?.screenshot) {
          console.log(`slot ${slot} は既にスクショあり: ${any.screenshot}`);
          return;
        }
        throw new Error(`slot ${slot} に未取得の post_url がありません`);
      }
    }
    for (const p of posts) jobs.push({ slug, post: p });
  } else {
    console.error(`使い方:
  npm run x:capture -- --slug SLUG [--slot N]
  npm run x:capture -- --url https://x.com/.../status/...
  npm run x:capture -- --all [--limit N] [--dry-run]`);
    process.exit(1);
  }

  const batch = jobs.slice(0, limit);
  console.log(`対象 ${batch.length} 件${dryRun ? " (dry-run)" : ""}`);

  let ok = 0;
  let fail = 0;
  for (const { slug: s, post } of batch) {
    console.log(`[${s}]`);
    try {
      await captureOne(s, post);
      ok++;
      if (!dryRun) await sleep(3000);
    } catch (e) {
      fail++;
      console.error(`  NG: ${e.message}`);
    }
  }

  console.log(`\n完了: OK ${ok} / NG ${fail}`);
  if (fail && !dryRun) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
