#!/usr/bin/env node
/**
 * 内部リンクグラフを全記事 JSON に投入。
 *   node scripts/inject-internal-links.mjs
 *   node scripts/inject-internal-links.mjs --slug shussho-budget-seika
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERNAL_LINK_GRAPH, mergeInternalLinks } from "../src/lib/internal-link-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");

const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]
  || (process.argv.includes("--slug") ? process.argv[process.argv.indexOf("--slug") + 1] : null);

const slugs = slugArg
  ? [slugArg]
  : Object.keys(INTERNAL_LINK_GRAPH);

let updated = 0;
for (const slug of slugs) {
  const file = path.join(articlesDir, `${slug}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`skip: ${slug} (file missing)`);
    continue;
  }
  const article = JSON.parse(fs.readFileSync(file, "utf8"));
  const before = JSON.stringify(article.glossary);
  mergeInternalLinks(article);
  const after = JSON.stringify(article.glossary);
  if (before !== after || article.relatedArticles) {
    fs.writeFileSync(file, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    updated++;
    console.log(`updated: ${slug}`);
  } else {
    console.log(`unchanged: ${slug}`);
  }
}

console.log(`done: ${updated}/${slugs.length} articles`);
