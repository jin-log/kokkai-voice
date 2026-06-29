#!/usr/bin/env node
/**
 * 壊れた X スクショを検出して再取得し、全記事 JSON を同期
 *
 * Usage:
 *   npm run x:recapture-bad
 *   npm run x:recapture-bad -- --dry-run
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditScreenshotFile } from "./lib/x-screenshot-audit.mjs";
import { captureTweetScreenshot, parseXStatusId, root } from "./lib/x-screenshot.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(root, "public/assets/x-screenshots");
const articlesDir = path.join(root, "data/articles");

const dryRun = process.argv.includes("--dry-run");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @returns {Promise<Map<string, string>>} statusId → post_url */
async function urlMapForBadIds(badIds) {
  const map = new Map();
  const files = await readdir(articlesDir);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const article = JSON.parse(await readFile(path.join(articlesDir, f), "utf8"));
    for (const p of article.xPosts ?? []) {
      const id = parseXStatusId(p.post_url || "");
      if (id && badIds.has(id) && p.post_url && !map.has(id)) {
        map.set(id, p.post_url);
      }
    }
    for (const e of article.timeline ?? []) {
      const xp = e.xPost;
      const id = parseXStatusId(xp?.post_url || "");
      if (id && badIds.has(id) && xp?.post_url && !map.has(id)) {
        map.set(id, xp.post_url);
      }
    }
  }
  return map;
}

/**
 * @param {string} statusId
 * @param {{ publicPath: string; thumbPublic: string; sha256: string; capturedAt: string }} meta
 */
async function propagateScreenshotMeta(statusId, meta) {
  const files = await readdir(articlesDir);
  let articles = 0;
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const fp = path.join(articlesDir, f);
    const article = JSON.parse(await readFile(fp, "utf8"));
    let changed = false;

    const patch = (obj) => {
      if (!obj?.screenshot?.includes(statusId)) return;
      obj.screenshot = meta.publicPath;
      obj.screenshot_thumb = meta.thumbPublic;
      obj.captured_at = meta.capturedAt;
      obj.sha256 = meta.sha256;
      changed = true;
    };

    for (const p of article.xPosts ?? []) patch(p);
    for (const e of article.timeline ?? []) {
      if (e.xPost) patch(e.xPost);
    }

    if (changed) {
      await writeFile(fp, `${JSON.stringify(article, null, 2)}\n`, "utf8");
      articles += 1;
    }
  }
  return articles;
}

async function main() {
  const pngs = (await readdir(screenshotDir)).filter((f) => /^\d+\.png$/i.test(f));
  const badAudits = [];
  for (const f of pngs) {
    const audit = await auditScreenshotFile(path.join(screenshotDir, f));
    if (audit.bad) badAudits.push(audit);
  }

  if (badAudits.length === 0) {
    console.log("[x:recapture-bad] 壊れたスクショなし");
    return;
  }

  console.log(`[x:recapture-bad] 壊れ ${badAudits.length} 件`);
  const badIds = new Set(badAudits.map((a) => a.id));
  const urls = await urlMapForBadIds(badIds);

  let ok = 0;
  let fail = 0;
  for (const audit of badAudits) {
    const url = urls.get(audit.id);
    console.log(`\n[${audit.id}] ${audit.reasons.join(",")} ${audit.bytes}B`);
    if (!url) {
      console.error("  NG: post_url 不明");
      fail += 1;
      continue;
    }
    console.log(`  ${url}`);
    if (dryRun) continue;

    try {
      const result = await captureTweetScreenshot(url);
      const check = await auditScreenshotFile(result.outPath);
      if (check.bad) {
        throw new Error(`再取得後も品質NG: ${check.reasons.join(",")}`);
      }
      const n = await propagateScreenshotMeta(audit.id, {
        publicPath: result.publicPath,
        thumbPublic: result.thumbPublic,
        sha256: result.sha256,
        capturedAt: result.capturedAt,
      });
      console.log(`  OK ${result.publicPath} (${check.width}x${check.height} ${check.bytes}B) articles=${n}`);
      ok += 1;
      await sleep(3500);
    } catch (e) {
      console.error(`  NG: ${e instanceof Error ? e.message : e}`);
      fail += 1;
    }
  }

  console.log(`\n[x:recapture-bad] 完了 OK ${ok} / NG ${fail}`);
  if (fail && !dryRun) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
