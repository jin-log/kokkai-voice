#!/usr/bin/env node
/**
 * タイトルを【大見出し】＋市民向け説明に一括更新
 *
 *   node scripts/brushup-titles.mjs           # dry-run
 *   node scripts/brushup-titles.mjs --apply
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brushupTitleForArticle } from "../src/lib/title-format.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.join(__dirname, "../data/articles");
const apply = process.argv.includes("--apply");

async function main() {
  const files = (await readdir(articlesDir)).filter(
    (f) => f.endsWith(".json") && f !== "index.json" && f !== "parked.json",
  );
  let changed = 0;
  for (const f of files.sort()) {
    const p = path.join(articlesDir, f);
    const article = JSON.parse(await readFile(p, "utf8"));
    if (!article.slug || article.slug === "test") continue;
    const next = brushupTitleForArticle(article);
    if (next === article.title) continue;
    console.log(`${article.slug}\n  × ${article.title}\n  ◎ ${next}\n`);
    if (apply) {
      article.title = next;
      await writeFile(p, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    }
    changed++;
  }
  console.log(apply ? `更新: ${changed} 件` : `変更予定: ${changed} 件（--apply で書き込み）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
