#!/usr/bin/env node
/**
 * 週次プロモスプリント生成（月〜金ローテ + 文案バリエーション）
 *
 * Usage:
 *   node scripts/generate-promo-sprint.mjs
 *   node scripts/generate-promo-sprint.mjs --stdout
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "../src/lib/articles.mjs";
import { buildPromoSprint, formatPromoSprintMarkdown } from "../src/lib/promo-sprint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "content/promo");

const stdout = process.argv.includes("--stdout");

async function main() {
  const articles = await loadAllArticles();
  const sprint = buildPromoSprint(articles);
  const md = formatPromoSprintMarkdown(sprint);

  if (stdout) {
    console.log(md);
    return;
  }

  await mkdir(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const mdPath = path.join(outDir, `sprint-${sprint.weekStart}.md`);
  const jsonPath = path.join(outDir, `sprint-${sprint.weekStart}.json`);
  await writeFile(mdPath, md, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(sprint, null, 2)}\n`, "utf8");
  console.log(`OK: ${mdPath}（${sprint.poolSize} 案件 · 今日=${sprint.today?.title || "—"}）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
