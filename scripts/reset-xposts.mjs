#!/usr/bin/env node
/** Reset xPosts slots to search_failed (remove bad URLs from HTML). */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function emptySlots() {
  return [1, 2, 3, 4, 5].map((slot) => ({
    slot,
    status: "search_failed",
    post_url: null,
    account_label: null,
    speaker_hint: null,
    captured_at: null,
    screenshot: null,
    post_text: null,
  }));
}

/** @type {Record<string, number[] | 'all' | 'none'>} */
const KEEP = {
  "shohizei-genmen": [1],
  "bouka-taisaku": [1, 2],
  chingin: "none",
  nenkin: "none",
  kenpo: "none",
};

async function main() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) {
    console.error("Usage: node scripts/reset-xposts.mjs <slug> ...");
    process.exit(1);
  }
  for (const slug of slugs) {
    const file = path.join(root, `data/articles/${slug}.json`);
    const article = JSON.parse(await readFile(file, "utf8"));
    const keep = KEEP[slug];
    const prev = article.xPosts || [];
    if (keep === "none" || keep === undefined) {
      article.xPosts = emptySlots();
    } else if (Array.isArray(keep)) {
      const kept = prev.filter((p) => keep.includes(p.slot) && p.post_url);
      article.xPosts = emptySlots().map((slot) => {
        const k = kept.find((p) => p.slot === slot.slot);
        return k ? { ...k } : slot;
      });
    } else {
      article.xPosts = emptySlots();
    }
    await writeFile(file, JSON.stringify(article, null, 2) + "\n", "utf8");
    const keptCount = article.xPosts.filter((p) => p.post_url).length;
    console.log(`${slug}: kept ${keptCount}/5 xPosts`);
  }
}

main();
