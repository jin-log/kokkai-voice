#!/usr/bin/env node
/** CF Functions 用 — 記事サマリと投稿ログを public/data/ に出力 */
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "../src/lib/articles.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/data");

await mkdir(outDir, { recursive: true });

const articles = await loadAllArticles();
const marketing = articles.map((a) => ({
  slug: a.slug,
  title: a.title,
  category: a.category,
  tags: a.tags ?? [],
  publishedAt: a.publishedAt ?? null,
  adminHidden: a.adminHidden === true,
  pageReady: a.pageReady === true,
  promoHot: a.promoHot === true,
  nowSummary: a.nowSummary ?? null,
  summaryBullets: a.summaryBullets ?? [],
}));

await writeFile(
  path.join(outDir, "marketing-articles.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), articles: marketing }, null, 2)}\n`,
);

const logSrc = path.join(root, "data/x-post-log.json");
const logDest = path.join(outDir, "x-post-log.json");
try {
  await copyFile(logSrc, logDest);
} catch {
  await writeFile(logDest, '{"digest":[],"hot":[]}\n');
}

const queueSrc = path.join(root, "data/ops-queue.json");
const queueDest = path.join(outDir, "ops-queue.json");
try {
  await copyFile(queueSrc, queueDest);
} catch {
  /* optional */
}

const shortsSrc = path.join(root, "data/shorts-benchmarks.json");
const shortsDest = path.join(outDir, "shorts-benchmarks.json");
try {
  await copyFile(shortsSrc, shortsDest);
} catch {
  /* optional */
}

console.log(`OK marketing-data → public/data (${marketing.length} articles)`);
