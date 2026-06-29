#!/usr/bin/env node
/** xPosts url_found → timeline x_post 同期のみ（高速） */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

function xPostToEntry(p) {
  const date =
    p.posted_at?.slice(0, 10) ||
    p.captured_at?.slice(0, 10) ||
    p.researched_at?.slice(0, 10) ||
    null;
  return {
    id: `x-slot-${p.slot}`,
    type: "x_post",
    date,
    summaryPlain: p.post_text || null,
    xPost: p,
  };
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  for (const slug of index.slugs) {
    if (slug === "test") continue;
    const fp = path.join(articlesDir, `${slug}.json`);
    const article = JSON.parse(await readFile(fp, "utf8"));
    let timeline = [...(article.timeline || [])];
    const ids = new Set(timeline.map((e) => e.id));
    for (const p of (article.xPosts || []).filter(
      (x) => x.post_url && x.post_text && x.status === "url_found",
    )) {
      const entry = xPostToEntry(p);
      if (!ids.has(entry.id)) {
        timeline.push(entry);
        ids.add(entry.id);
      }
    }
    timeline.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    article.timeline = timeline;
    await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
    const xn = timeline.filter((e) => e.type === "x_post").length;
    console.log(`${slug}: X in timeline ${xn}`);
  }
}

main();
