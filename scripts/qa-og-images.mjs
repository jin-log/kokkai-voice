#!/usr/bin/env node
/**
 * 公開記事の OGP 画像が存在するか検証（X Card 用）
 *   node scripts/qa-og-images.mjs
 *   node scripts/qa-og-images.mjs --slug fuhou-immin-trend
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles, loadArticle } from "../src/lib/articles.mjs";
import { ASSET_V } from "../src/lib/case-helpers.mjs";
import { buildOgAssetBrief } from "../src/lib/og-image.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function exists(rel) {
  try {
    await access(path.join(root, "public", rel.replace(/^\//, "").split("?")[0]));
    return true;
  } catch {
    return false;
  }
}

async function checkArticle(article) {
  const brief = buildOgAssetBrief(article, ASSET_V);
  const rel = brief.ogImageMeta;
  const ok = await exists(rel);
  return { slug: article.slug, pattern: brief.primaryPattern, rel, ok };
}

async function main() {
  const articles = slugArg
    ? [await loadArticle(slugArg)]
    : await loadAllArticles();

  const results = [];
  for (const a of articles) {
    results.push(await checkArticle(a));
  }

  const missing = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "OK" : "NG"} ${r.slug} [${r.pattern}] ${r.rel}`);
  }

  if (missing.length) {
    console.error(`\nNG ${missing.length}件 — npm run build で OGP 再生成`);
    process.exit(1);
  }
  console.log(`\nOK ${results.length}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
