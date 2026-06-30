#!/usr/bin/env node
/**
 * 全記事の意味品質監査（形式ゲートとは別）
 *
 * Usage:
 *   npm run audit:articles
 *   node scripts/audit-article-quality.mjs --slug case-mqzxj4ro
 *   node scripts/audit-article-quality.mjs --fail-on-blocker   # CI用
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditArticleQuality, auditAllArticles } from "../src/lib/article-quality.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const args = process.argv.slice(2);
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const failOnBlocker = args.includes("--fail-on-blocker");
const publishedOnly = args.includes("--published-only");
const jsonOut = args.includes("--json");

async function loadArticles() {
  const files = (await readdir(articlesDir)).filter(
    (f) => f.endsWith(".json") && f !== "test.json" && f !== "index.json",
  );
  const out = [];
  for (const f of files) {
    const article = JSON.parse(await readFile(path.join(articlesDir, f), "utf8"));
    if (slugArg && article.slug !== slugArg) continue;
    out.push(article);
  }
  return out.sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

const articles = await loadArticles();
let results = auditAllArticles(articles);
if (publishedOnly) {
  results = results.filter((r) => r.pageReady === true);
}
const failed = results.filter((r) => !r.ok);
const warned = results.filter((r) => r.ok && r.warnings.length > 0);

const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failed.length,
  warned: warned.length,
  slugs: results,
};

if (!slugArg) {
  await mkdir(path.join(root, "data"), { recursive: true });
  await writeFile(
    path.join(root, "data/article-quality-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
}

for (const r of results) {
  if (r.ok && r.warnings.length === 0) continue;
  const mark = r.ok ? "WARN" : "NG";
  console.log(`\n[${mark}] ${r.slug} — ${r.title}`);
  for (const i of [...r.blockers, ...r.warnings]) {
    console.log(`  ${i.severity === "blocker" ? "✗" : "△"} ${i.id}: ${i.message}`);
    console.log(`    → ${i.todo}`);
  }
}

console.log(
  `\n--- 品質監査: ${report.passed}/${report.total} 合格, ${report.failed} 要修正, ${report.warned} 警告のみ`,
);
if (!slugArg) console.log("report: data/article-quality-report.json");

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
}

if (failOnBlocker && failed.length > 0) {
  process.exit(1);
}
