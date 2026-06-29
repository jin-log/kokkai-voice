#!/usr/bin/env node
/**
 * prosCons 一括適用
 * node scripts/apply-proscons-all.mjs [--slug X] [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROSCONS_BATCH_A } from "./data/proscons-batch-a.mjs";
import { PROSCONS_BATCH_B } from "./data/proscons-batch-b.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");
const ALL = { ...PROSCONS_BATCH_A, ...PROSCONS_BATCH_B };

const dryRun = process.argv.includes("--dry-run");
const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

  let applied = 0;
  let missing = [];

  for (const slug of slugs) {
    const pc = ALL[slug];
    if (!pc) {
      missing.push(slug);
      continue;
    }
    const fp = path.join(articlesDir, `${slug}.json`);
    const article = JSON.parse(await readFile(fp, "utf8"));
    article.prosCons = pc;
    if (!dryRun) {
      await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
    }
    applied++;
    console.log(`OK ${slug}: メリ${pc.merits.length} デメ${pc.demerits.length}`);
  }

  console.log(`\n適用 ${applied} / 不足 ${missing.length}`);
  if (missing.length) console.log("不足:", missing.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
