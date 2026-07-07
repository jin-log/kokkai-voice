#!/usr/bin/env node
/** タイムライン summaryPlain 一括サニタイズ */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeArticleTimeline } from "../src/lib/timeline-sanitize.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

for (const slug of slugs) {
  const fp = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  const before = article.timeline?.length ?? 0;
  const next = sanitizeArticleTimeline(article);
  const after = next.timeline?.length ?? 0;
  if (JSON.stringify(article.timeline) !== JSON.stringify(next.timeline)) {
    await writeFile(fp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`${slug}: timeline ${before} → ${after} 件`);
  }
}
