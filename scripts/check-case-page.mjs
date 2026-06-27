#!/usr/bin/env node
/**
 * 1案件ページ完成チェック
 * Usage:
 *   node scripts/check-case-page.mjs --slug bouka-taisaku
 *   node scripts/check-case-page.mjs --all
 *   node scripts/check-case-page.mjs --all --json
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";

const articleDir = path.join(root, "data/articles");

function parseArgs(argv) {
  const slugIdx = argv.indexOf("--slug");
  return {
    slug: slugIdx >= 0 ? argv[slugIdx + 1] : null,
    all: argv.includes("--all"),
    json: argv.includes("--json"),
  };
}

async function loadArticles() {
  const files = (await readdir(articleDir)).filter(
    (f) =>
      f.endsWith(".json") &&
      f !== "index.json" &&
      f !== "parked.json",
  );
  const out = [];
  for (const file of files) {
    const article = JSON.parse(await readFile(path.join(articleDir, file), "utf8"));
    if (article.slug) out.push(article);
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function printReport(result) {
  const icon = result.ok ? "✅" : "❌";
  console.log(`\n${icon} ${result.slug}`);
  for (const c of result.checks) {
    const mark = c.ok ? "  ✓" : c.blocker === false ? "  ⚠" : "  ✗";
    console.log(`${mark} ${c.id}: ${c.detail ?? ""}`);
  }
}

const { slug, all, json } = parseArgs(process.argv.slice(2));
const articles = await loadArticles();
const targets = slug ? articles.filter((a) => a.slug === slug) : articles;

if (slug && !targets.length) {
  console.error(`記事なし: ${slug}`);
  process.exit(1);
}

const results = [];
for (const article of targets) {
  results.push(await checkCasePageWithFiles(article));
}

if (json) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

for (const r of results) printReport(r);

const okCount = results.filter((r) => r.ok).length;
const oldGateCount = targets.filter(
  (a) => (a.timeline?.length ?? 0) >= 2 || a.publishReady === true,
).length;
const badSlugs = targets
  .filter((a, i) => ((a.timeline?.length ?? 0) >= 2 || a.publishReady) && !results[i].ok)
  .map((a) => a.slug);

console.log(`\n--- サマリ ---`);
console.log(`完成（全必須OK）: ${okCount}/${results.length}`);
console.log(`旧ゲート（timeline>=2）で出る件数: ${oldGateCount}/${results.length}`);
if (badSlugs.length) {
  console.log(`⚠ 旧ゲートで公開中だが未完成: ${badSlugs.join(", ")}`);
}

if (slug && results.some((r) => !r.ok)) process.exit(1);
if (all && badSlugs.length) process.exit(1);
process.exit(0);
