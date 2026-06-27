#!/usr/bin/env node
/**
 * 既存 xPosts の post_url から post_text を fxtwitter で補完（URLは上書きしない）
 * Usage: node scripts/x-backfill-post-text.mjs [slug ...]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.join(__dirname, "..", "data/articles");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseStatus(url) {
  const m = url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i);
  if (!m) return null;
  return { handle: m[1], id: m[2] };
}

async function fetchTweetText(handle, id) {
  const res = await fetch(`https://api.fxtwitter.com/${handle}/status/${id}`, {
    headers: { "User-Agent": "kokkai-voice-x-research/1.0" },
  });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const data = await res.json();
  const tw = data?.tweet;
  if (!tw?.id) return { ok: false, reason: "no tweet in response" };
  const author = tw.author ?? {};
  const screen = author.screen_name ?? handle;
  return {
    ok: true,
    post_text: (tw.text ?? "").replace(/\s+/g, " ").slice(0, 220),
    account_label: `${author.name ?? screen} @${screen}`,
  };
}

async function backfillSlug(slug) {
  const articlePath = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(articlePath, "utf8"));
  const results = { slug, filled: 0, skipped: 0, failed: [] };

  for (const slot of article.xPosts ?? []) {
    if (!slot.post_url) continue;
    if (slot.post_text) {
      results.skipped++;
      continue;
    }

    const parsed = parseStatus(slot.post_url);
    if (!parsed) {
      results.failed.push({ slot: slot.slot, url: slot.post_url, reason: "invalid URL" });
      continue;
    }

    try {
      const meta = await fetchTweetText(parsed.handle, parsed.id);
      if (!meta.ok) {
        results.failed.push({ slot: slot.slot, url: slot.post_url, reason: meta.reason });
      } else {
        slot.post_text = meta.post_text || null;
        if (!slot.account_label && meta.account_label) slot.account_label = meta.account_label;
        slot.text_fetched_at = new Date().toISOString();
        results.filled++;
      }
    } catch (e) {
      results.failed.push({ slot: slot.slot, url: slot.post_url, reason: String(e.message ?? e) });
    }
    await sleep(350);
  }

  if (results.filled > 0) {
    article.xResearch = {
      ...(article.xResearch ?? {}),
      post_text_backfill_at: new Date().toISOString(),
      method: "fxtwitter_public",
    };
    await writeFile(articlePath, JSON.stringify(article, null, 2) + "\n", "utf8");
  }

  return results;
}

async function main() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) {
    console.error("Usage: node scripts/x-backfill-post-text.mjs <slug> [slug ...]");
    process.exit(1);
  }

  const all = [];
  for (const slug of slugs) {
    console.log(`Backfill ${slug}...`);
    const r = await backfillSlug(slug);
    all.push(r);
    console.log(`  filled=${r.filled} skipped=${r.skipped} failed=${r.failed.length}`);
    for (const f of r.failed) console.log(`  FAIL slot ${f.slot}: ${f.reason}`);
  }

  console.log("\n=== SUMMARY ===");
  for (const r of all) {
    console.log(`${r.slug}: ${r.filled} filled, ${r.failed.length} failed`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
