/**
 * 一般記事の Title:/出典N件 ゴミ要約をメリデメから一括再構成
 * npm run fix:general-summaries
 * npm run fix:general-summaries -- --slug tokyo-recall
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generalSummaryIsBad,
  hasGeneralMeritPool,
  rebuildGeneralSummaryFromMerits,
} from "../src/lib/general-article.mjs";
import { mergeInternalLinks } from "../src/lib/internal-link-graph.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]
  || (process.argv.includes("--slug") ? process.argv[process.argv.indexOf("--slug") + 1] : null);

async function loadSlugs() {
  if (slugArg) return [slugArg];
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  return index.slugs ?? [];
}

async function main() {
  const slugs = await loadSlugs();
  let fixed = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const filePath = path.join(root, `data/articles/${slug}.json`);
    let article;
    try {
      article = JSON.parse(await readFile(filePath, "utf8"));
    } catch {
      continue;
    }
    if (article.category === "国会") continue;
    if (!hasGeneralMeritPool(article)) {
      if (generalSummaryIsBad(article)) {
        console.warn(`[skip] ${slug}: 要約ゴミだがメリデメ不足`);
      }
      skipped++;
      continue;
    }
    if (!generalSummaryIsBad(article)) {
      skipped++;
      continue;
    }
    rebuildGeneralSummaryFromMerits(article);
    mergeInternalLinks(article);
    article.summaryFixedAt = new Date().toISOString();
    await writeFile(filePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    console.log(`[fix] ${slug}`);
    fixed++;
  }

  console.log(`完了: 修正 ${fixed} / スキップ ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
