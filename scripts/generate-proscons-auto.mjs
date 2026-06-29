#!/usr/bin/env node
/**
 * 記事JSONから prosCons を生成（nowSummary・sourceUrls ベース）
 * 手動上書き: scripts/data/proscons-overrides.mjs
 *
 * node scripts/generate-proscons-auto.mjs [--slug X] [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OVERRIDES } from "./data/proscons-overrides.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const DISCLAIMER =
  "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。";

const dryRun = process.argv.includes("--dry-run");
const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

/** @param {string} text */
function extractFigures(text) {
  if (!text) return [];
  const re =
    /(\d[\d,\.]*(?:兆|億|万|％|%|円|人|件|カ月|年|倍|ポイント|世帯|世帯|党|議席)?)/g;
  const found = [];
  let m;
  while ((m = re.exec(text))) {
    const f = m[1].replace(/,/g, "");
    if (f.length >= 2 && !found.includes(f)) found.push(f);
  }
  return found;
}

function pickSource(urls, i = 0) {
  const u = urls?.[i] || urls?.[0] || "https://seiji1192.site/";
  const label = u.includes("kokkai.ndl.go.jp")
    ? "国会議事録"
    : u.includes("mhlw.go.jp")
      ? "厚生労働省"
      : u.includes("cao.go.jp")
        ? "内閣府"
        : u.includes("kantei.go.jp")
          ? "首相官邸"
          : u.includes("cfa.go.jp")
            ? "こども家庭庁"
            : "公式出典";
  return { sourceUrl: u, sourceLabel: label };
}

/** @param {object} article */
function autoProsCons(article) {
  if (OVERRIDES[article.slug]) return OVERRIDES[article.slug];

  const urls = [
    article.primarySpeech?.speechURL,
    article.primarySpeech?.meetingURL,
    ...(article.sourceUrls || []),
  ].filter(Boolean);
  const uniqueUrls = [...new Set(urls)];

  const bullets = [
    ...(article.nowSummary?.bullets || []),
    ...(article.summaryBullets || []),
  ];
  const plain = article.plainExplanation || "";

  const merits = [];
  const demerits = [];

  for (const b of bullets) {
    const figs = extractFigures(b);
    if (!figs.length) continue;
    const isNegative =
      /低下|減少|減|未確認|未実施|ない|不足|遅れ|見送|反対|批判|問題|懸念|逆行|足りない|未提出|停滞/.test(
        b,
      );
    const item = {
      headline: b.slice(0, 36).replace(/。.*$/, ""),
      text: b.replace(/。$/, "") + "。",
      figure: figs[0],
      ...pickSource(uniqueUrls, isNegative ? 1 : 0),
      sourceDate: article.nowSummary?.updatedAt?.slice(0, 10) || article.fetchedAt?.slice(0, 10),
    };
    if (isNegative && demerits.length < 3) demerits.push(item);
    else if (!isNegative && merits.length < 3) merits.push(item);
    if (merits.length >= 2 && demerits.length >= 2) break;
  }

  if (merits.length < 2 && plain) {
    const figs = extractFigures(plain);
    if (figs[0]) {
      merits.push({
        headline: "制度・予算の公表",
        text: plain.split("\n\n")[0].slice(0, 120),
        figure: figs[0],
        ...pickSource(uniqueUrls, 0),
      });
    }
  }

  if (demerits.length < 2) {
    for (const b of bullets) {
      if (demerits.length >= 2) break;
      const figs = extractFigures(b);
      if (!figs.length) continue;
      if (demerits.some((d) => d.figure === figs[0])) continue;
      demerits.push({
        headline: "公表統計・結果",
        text: b,
        figure: figs[0],
        ...pickSource(uniqueUrls, 1),
      });
    }
  }

  return {
    disclaimer: DISCLAIMER,
    merits: merits.slice(0, 3),
    demerits: demerits.slice(0, 3),
  };
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

  let ok = 0;
  let ng = [];

  for (const slug of slugs) {
    const fp = path.join(articlesDir, `${slug}.json`);
    const article = JSON.parse(await readFile(fp, "utf8"));
    const pc = autoProsCons(article);
    const valid =
      pc.merits.length >= 2 &&
      pc.demerits.length >= 2 &&
      pc.merits.every((m) => m.figure && m.sourceUrl) &&
      pc.demerits.every((m) => m.figure && m.sourceUrl);

    if (!valid) {
      ng.push(slug);
      console.log(`NG ${slug}: メリ${pc.merits.length} デメ${pc.demerits.length}`);
      continue;
    }

    article.prosCons = pc;
    if (!dryRun) {
      await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
    }
    ok++;
    console.log(`OK ${slug}: メリ${pc.merits.length} デメ${pc.demerits.length}`);
  }

  console.log(`\n完了 OK ${ok} / NG ${ng.length}`);
  if (ng.length) console.log("要 overrides:", ng.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
