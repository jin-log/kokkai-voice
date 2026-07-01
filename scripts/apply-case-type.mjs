#!/usr/bin/env node
/**
 * 非公開記事すべてに caseType を付与（コンテンツブロックUI用）
 * Usage: node scripts/apply-case-type.mjs [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle, loadStanceData } from "../src/lib/articles.mjs";
import { isLiveArticle, resolveCaseType } from "../src/lib/case-blocks.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));

let updated = 0;
let skipped = 0;

for (const slug of index.slugs ?? []) {
  const article = await loadArticle(slug);
  if (isLiveArticle(article)) {
    skipped++;
    continue;
  }
  const stance = await loadStanceData(article).catch(() => null);
  const caseType = resolveCaseType(article, stance);
  const before = article.caseType;
  if (before === caseType && article.contentBlocks === true) {
    skipped++;
    continue;
  }
  article.caseType = caseType;
  article.contentBlocks = true;
  console.log(`${dryRun ? "DRY" : "OK "} ${slug} → ${caseType}${before && before !== caseType ? ` (was ${before})` : ""}`);
  if (!dryRun) {
    await writeFile(
      path.join(root, "data/articles", `${slug}.json`),
      `${JSON.stringify(article, null, 2)}\n`,
      "utf8",
    );
    updated++;
  }
}

console.log(`\n${dryRun ? "dry-run" : `更新 ${updated} 件 / スキップ（公開済み等） ${skipped} 件`}`);
