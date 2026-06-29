#!/usr/bin/env node
/**
 * 記事公開時プロモパック生成（X / はてブ / note / SEO / PNGメモ）
 *
 * Usage:
 *   node scripts/generate-promo-pack.mjs --slug shohizei-genmen
 *   node scripts/generate-promo-pack.mjs --slug shohizei-genmen --stdout
 *   node scripts/generate-promo-pack.mjs --recent 7
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllArticles } from "../src/lib/articles.mjs";
import { formatPromoPackMarkdown, buildPromoPack } from "../src/lib/promo-generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");
const outDir = path.join(root, "content/promo");

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const slug = arg("--slug");
const recentDays = arg("--recent");
const allLive = args.includes("--live");
const stdout = args.includes("--stdout");

async function loadArticle(s) {
  const p = path.join(articlesDir, `${s}.json`);
  return JSON.parse(await readFile(p, "utf8"));
}

async function allSlugs() {
  const files = await readdir(articlesDir);
  return files.filter((f) => f.endsWith(".json") && f !== "index.json").map((f) => f.replace(/\.json$/, ""));
}

async function pickRelated(currentSlug, n = 3) {
  const slugs = (await allSlugs()).filter((s) => s !== currentSlug);
  return slugs.slice(0, n);
}

async function writePack(s) {
  const article = await loadArticle(s);
  const related = await pickRelated(s);
  const md = formatPromoPackMarkdown(article);
  const json = buildPromoPack(article, { relatedSlugs: related });

  if (stdout) {
    console.log(md);
    return s;
  }

  await mkdir(outDir, { recursive: true });
  const mdPath = path.join(outDir, `${s}.md`);
  const jsonPath = path.join(outDir, `${s}.json`);
  await writeFile(mdPath, md, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`OK: ${mdPath}`);
  return s;
}

async function main() {
  if (slug) {
    await writePack(slug);
    return;
  }

  if (recentDays) {
    const days = Number(recentDays);
    const sinceMs = Date.now() - days * 86400000;
    const slugs = await allSlugs();
    let count = 0;
    for (const s of slugs) {
      const a = await loadArticle(s);
      const stamps = [a.publishedAt, a.nowSummary?.updatedAt].filter(Boolean);
      const active = stamps.some((iso) => new Date(iso).getTime() >= sinceMs);
      if (active) {
        await writePack(s);
        count++;
      }
    }
    console.log(`完了: ${count} 件（直近${days}日）`);
    return;
  }

  if (allLive) {
    const articles = await loadAllArticles();
    let count = 0;
    for (const a of articles) {
      await writePack(a.slug);
      count++;
    }
    console.log(`完了: ${count} 件（公開中全件）`);
    return;
  }

  console.error("Usage: --slug SLUG | --recent DAYS | --live [--stdout]");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
