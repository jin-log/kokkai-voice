#!/usr/bin/env node
/**
 * 非公開記事すべて — caseType / contentBlocks / statsSeries を整備
 * Usage: node scripts/review-nonpublic-blocks.mjs [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArticle, loadStanceData } from "../src/lib/articles.mjs";
import { isLiveArticle, resolveCaseType } from "../src/lib/case-blocks.mjs";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));

/** @param {string} text */
function extractCounts(text) {
  const hits = [];
  const re = /([０-９0-9][０-９0-9,．.]*)\s*(万人|万円|万人|人|件|%|％|円|兆|億|万)/g;
  let m;
  while ((m = re.exec(text))) {
    let raw = m[1].replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    raw = raw.replace(/,/g, "");
    let num = Number(raw);
    if (m[2] === "万" || m[2] === "万人" || m[2] === "万円") num *= 10000;
    if (m[2] === "億") num *= 100000000;
    if (m[2] === "兆") num *= 1000000000000;
    if (Number.isFinite(num) && num > 0) {
      hits.push({ value: num, unit: m[2], display: `${m[1]}${m[2]}` });
    }
  }
  return hits;
}

/** @param {import('../src/lib/articles.mjs').Article} article */
function buildStatsSeriesFromArticle(article) {
  const text = [
    ...(article.nowSummary?.bullets ?? []),
    ...(article.summaryBullets ?? []).map((b) => (typeof b === "string" ? b : b.text)),
    ...(article.arcSummary ?? []).map((a) => a.text),
    article.primarySpeech?.excerpt || "",
    article.primarySpeech?.speechFull?.slice(0, 800) || "",
    ...(article.prosCons?.merits ?? []).map((i) => `${i.headline} ${i.text} ${i.figure}`),
    ...(article.prosCons?.demerits ?? []).map((i) => `${i.headline} ${i.text} ${i.figure}`),
  ].join("\n");

  const counts = extractCounts(text);
  const arc = article.arcSummary ?? [];
  const points = arc
    .slice(0, 4)
    .map((row, i) => {
      const rowCounts = extractCounts(row.text || "");
      const val = rowCounts[0]?.value;
      if (!val) return null;
      const d = row.date ? new Date(row.date) : null;
      const label = d
        ? `${d.getFullYear()}\n${d.getMonth() + 1}月`
        : `P${i + 1}`;
      return { label, value: val, latest: i === 0 };
    })
    .filter(Boolean);

  if (points.length < 2 && counts.length >= 2) {
    points.length = 0;
    counts.slice(0, 3).forEach((c, i) => {
      points.push({
        label: `指標${i + 1}`,
        value: c.value,
        latest: i === 0,
      });
    });
  }

  if (points.length < 2) return null;

  const highlights = points.slice(0, 3).map((p, i) => ({
    label: p.label.replace("\n", " "),
    value: p.value.toLocaleString("ja-JP"),
    unit: counts[i]?.unit === "万人" ? "万人" : counts[i]?.unit || "",
    sub: arc[i]?.text?.slice(0, 40) || "",
  }));

  const sourceUrl =
    article.sourceUrls?.[0] ||
    article.primarySpeech?.speechURL ||
    article.primarySpeech?.meetingURL;

  return {
    title: "公表数値の推移",
    note: "記事本文・出典から抽出した数値。詳細は下表と出典リンクを確認してください。",
    highlights,
    chart: {
      ariaLabel: "公表数値の棒グラフ",
      points: points.map((p) => ({ ...p, latest: p.latest ?? false })),
    },
    table: {
      columns: ["時点", "値", "メモ", "出典"],
      rows: arc.slice(0, 3).map((row) => ({
        date: row.date || "—",
        value: extractCounts(row.text || "")[0]?.display || row.text?.slice(0, 24) || "—",
        delta: "—",
        sourceUrl,
        sourceLabel: "出典",
      })),
    },
  };
}

const FUHOU_STATS = {
  title: "人数の推移（公表値）",
  note: "不法残留者（オーバーステイ）の入管庁推計。合法在留外国人とは別の指標です。",
  highlights: [
    { label: "2026年7月1日", value: "71,229", unit: "人", sub: "半年前比 −3,634人", subTone: "good" },
    { label: "2026年1月1日", value: "74,863", unit: "人", sub: "前年比 −6,375人", subTone: "good" },
    { label: "合法在留（別指標）", value: "412", unit: "万人超", valueTone: "up", sub: "2025年末・過去最多", subTone: "bad" },
  ],
  chart: {
    ariaLabel: "不法残留者数の棒グラフ",
    points: [
      { label: "2025\n7月", value: 77754 },
      { label: "2026\n1月", value: 74863 },
      { label: "2026\n7月", value: 71229, latest: true },
    ],
  },
  table: {
    columns: ["時点", "不法残留者", "前回比", "出典"],
    rows: [
      {
        date: "2026-07-01",
        value: "71,229人",
        delta: "−3,634人",
        deltaTone: "down",
        sourceUrl: "https://www.sankei.com/article/20260327-RTIGC3KW2ZCOTNQXGYWQYP72QQ",
        sourceLabel: "産経新聞",
      },
      {
        date: "2026-01-01",
        value: "74,863人",
        delta: "−6,375人",
        deltaTone: "down",
        sourceUrl: "https://www.moj.go.jp/isa/publications/press/13_00058.html",
        sourceLabel: "入管庁",
      },
      {
        date: "2025-07-01",
        value: "77,754人",
        delta: "—",
        sourceUrl: "https://www.moj.go.jp/isa/publications/press/13_00058.html",
        sourceLabel: "入管庁",
      },
    ],
  },
  footnote:
    '参考：合法在留外国人 2025年末 <strong>412万人超</strong>（別系列・<a href="https://www.jiji.com/jc/article?k=2026032700900&amp;g=pol" target="_blank" rel="noopener">時事通信 ↗</a>）',
  matrix: {
    title: "政府の説明 ↔ 公表数値（簡易）",
    tag: "任意",
    rows: [
      {
        party: "政府",
        say: "ゼロプランで送還・審査を強化",
        do: "2026年 半年で3,634人減を公表",
        sym: "▲",
        symClass: "partial",
      },
    ],
  },
};

let updated = 0;

for (const slug of index.slugs ?? []) {
  const article = await loadArticle(slug);
  if (isLiveArticle(article)) continue;

  const stance = await loadStanceData(article).catch(() => null);
  const caseType = resolveCaseType(article, stance);
  let changed = false;

  if (article.caseType !== caseType) {
    article.caseType = caseType;
    changed = true;
  }
  if (article.contentBlocks !== true) {
    article.contentBlocks = true;
    changed = true;
  }

  if (caseType === "statistical" && !article.statsSeries?.chart?.points?.length) {
    const built =
      slug === "fuhou-immin-trend"
        ? FUHOU_STATS
        : buildStatsSeriesFromArticle(article);
    if (built) {
      article.statsSeries = built;
      changed = true;
    }
  }

  if (article.caseType === "policy_debate" && article.statsSeries) {
    delete article.statsSeries;
    changed = true;
  }

  if (slug === "fuhou-immin-trend") {
    const bullets = article.nowSummary?.bullets ?? [];
    const fixed = bullets.map((b) =>
      String(b).replace("6万8488人", "7万4863人").replace("68488人", "74863人"),
    );
    if (JSON.stringify(fixed) !== JSON.stringify(bullets)) {
      article.nowSummary = { ...article.nowSummary, bullets: fixed };
      changed = true;
    }
  }

  if (!changed) continue;

  console.log(`OK ${slug} → ${caseType}${article.statsSeries ? " +stats" : ""}`);
  if (!dryRun) {
    await writeFile(
      path.join(root, "data/articles", `${slug}.json`),
      `${JSON.stringify(article, null, 2)}\n`,
      "utf8",
    );
    updated++;
  }
}

if (!dryRun) {
  await refreshProjectStatus();
  console.log(`\n更新 ${updated} 件`);
} else {
  console.log("\n(dry-run)");
}
