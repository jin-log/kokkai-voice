#!/usr/bin/env node
/**
 * note 週次ダイジェスト文案生成
 *
 * Usage:
 *   node scripts/generate-weekly-digest.mjs
 *   node scripts/generate-weekly-digest.mjs --days 7 --stdout
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articleWeekActivity, formatWeeklyDigestMarkdown } from "../src/lib/promo-generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");
const outDir = path.join(root, "content/promo");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const days = Number(arg("--days") || 7);
const stdout = args.includes("--stdout");

async function main() {
  const sinceMs = Date.now() - days * 86400000;
  const files = (await readdir(articlesDir)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  const articles = [];
  for (const f of files) {
    const a = JSON.parse(await readFile(path.join(articlesDir, f), "utf8"));
    if (articleWeekActivity(a, sinceMs)) articles.push(a);
  }
  articles.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  const today = new Date().toISOString().slice(0, 10);
  const weekLabel = `${today}（直近${days}日）`;
  const md = formatWeeklyDigestMarkdown(articles, weekLabel);

  if (stdout) {
    console.log(md);
    return;
  }

  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `weekly-${today}.md`);
  await writeFile(outPath, md, "utf8");
  console.log(`OK: ${outPath}（${articles.length} 案件）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
