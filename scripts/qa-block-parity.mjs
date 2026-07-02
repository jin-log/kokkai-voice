#!/usr/bin/env node
/**
 * プレビューと本番でブロックUIが一致するか検証
 *
 *   node scripts/qa-block-parity.mjs              # ローカル（JSON + 描画条件）
 *   node scripts/qa-block-parity.mjs --prod       # 本番 HTML に期待セクションがあるか
 *   node scripts/qa-block-parity.mjs --slug fuhou-immin-trend
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { usesContentBlocks, blockFlags } from "../src/lib/case-blocks.mjs";
import { loadArticle, loadStanceData } from "../src/lib/articles.mjs";
import { resolveStatsSeries } from "../src/lib/stats-series.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prodBase = "https://seiji1192.site";

const args = process.argv.slice(2);
const prod = args.includes("--prod");
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

/** @param {string} slug @param {string} marker */
async function prodHasMarker(slug, marker) {
  const res = await fetch(`${prodBase}/case/${slug}/`, { redirect: "follow" });
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
  const html = await res.text();
  return { ok: html.includes(marker), detail: html.includes(marker) ? "found" : `missing ${marker}` };
}

async function checkSlug(slug) {
  const article = await loadArticle(slug);
  const stance = await loadStanceData(article).catch(() => null);
  const expectsBlocks =
    article.contentBlocks === true ||
    Boolean(article.caseType) ||
    Boolean(article.statsSeries?.chart?.points?.length);
  const blocks = usesContentBlocks(article);
  const flags = blocks ? blockFlags(article, stance) : null;
  const issues = [];

  if (expectsBlocks && !blocks) {
    issues.push("contentBlocks 設定ありだが usesContentBlocks=false");
  }
  if (blocks && flags?.stats && flags.caseType === "statistical" && !resolveStatsSeries(article)) {
    issues.push("statistical だが statsSeries 不足");
  }

  if (prod && article.pageReady && !article.adminHidden && blocks && flags) {
    if (flags.stats) {
      const r = await prodHasMarker(slug, 'id="sec-stats"');
      if (!r.ok) issues.push(`本番: ${r.detail}`);
    }
    if (flags.impact) {
      const r = await prodHasMarker(slug, 'id="sec-impact"');
      if (!r.ok) issues.push(`本番: ${r.detail}`);
    }
    if (flags.caseType === "statistical" && !flags.stats) {
      issues.push("statistical だが stats フラグ off");
    }
  }

  return {
    slug,
    pageReady: article.pageReady === true,
    blocks,
    caseType: flags?.caseType ?? null,
    stats: Boolean(flags?.stats),
    issues,
  };
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(root, "data/articles/index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : (index.slugs ?? []);
  const results = [];
  for (const slug of slugs) {
    results.push(await checkSlug(slug));
  }

  const failed = results.filter((r) => r.issues.length > 0);
  const liveBlocks = results.filter((r) => r.pageReady && r.blocks);

  console.log(`qa-block-parity: ${results.length} 件 / 公開+blocks ${liveBlocks.length} 件`);
  for (const r of results.filter((x) => x.blocks)) {
    const mark = r.issues.length ? "NG" : "OK";
    console.log(
      `  [${mark}] ${r.slug} type=${r.caseType} stats=${r.stats ? "yes" : "no"} live=${r.pageReady ? "yes" : "no"}`,
    );
    for (const i of r.issues) console.log(`       → ${i}`);
  }

  if (failed.length) {
    console.error(`\nNG ${failed.length} 件`);
    process.exit(1);
  }
  console.log("\n全件 OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
