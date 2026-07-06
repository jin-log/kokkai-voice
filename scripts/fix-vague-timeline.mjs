#!/usr/bin/env node
/**
 * タイムライン・nowSummary・merits の空文案・切り出しを議事録APIで具体化
 * node scripts/fix-vague-timeline.mjs [--slug nenkin] [--force] [--dry-run]
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSpeech } from "./lib/kokkai-api.mjs";
import { finalizeNowBulletsForTitle } from "./lib/writer-synthesize.mjs";
import {
  isBadSummaryLine,
  summarizeSpeechRecord,
  rebuildNowBullets,
  sanitizeMeritText,
  formatDatedBullet,
  isCompleteSummary,
} from "./lib/speech-summary.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const dryRun = process.argv.includes("--dry-run");
const forceAll = process.argv.includes("--force");

const TARGET_SLUGS = [
  "case-mqzxj4ro",
  "bouka-taisaku",
  "shohizei-genmen",
  "nenkin",
  "gaikokujin-seisaku",
  "senkyo-kaikaku",
  "casino-ir",
  "boeeihi",
];

async function fetchRecord(speechID) {
  const data = await fetchSpeech({ speechID });
  return data.speechRecord?.[0] ?? null;
}

function articleNeedsFix(article, raw) {
  if (forceAll) return true;
  if (TARGET_SLUGS.includes(article.slug)) return true;
  return (
    /議事録要確認|判断材料になる|が高市内閣の政策方針を国会答弁/.test(raw) ||
    /国会で答弁|が国会で論じた|を国会で論じた/.test(raw)
  );
}

function sanitizeMeritsDemerits(article) {
  let changed = false;
  for (const key of ["meritsDemerits", "prosCons"]) {
    const pc = article[key];
    if (!pc) continue;
    for (const role of ["merits", "demerits"]) {
      if (!Array.isArray(pc[role])) continue;
      const next = pc[role]
        .map((item) => {
          if (!item?.text) return item;
          const text = sanitizeMeritText(item.text);
          if (!text) return null;
          if (text !== item.text) changed = true;
          return { ...item, text };
        })
        .filter(Boolean);
      if (next.length !== pc[role].length) changed = true;
      pc[role] = next;
    }
  }
  return changed;
}

function rebuildArcSummary(article) {
  const lines = (article.timeline || [])
    .filter((e) => e.type === "speech" && e.summaryPlain && !isBadSummaryLine(e.summaryPlain))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 3)
    .map((e) => ({
      date: e.date,
      text: e.summaryPlain.endsWith("。") ? e.summaryPlain : `${e.summaryPlain}。`,
    }));
  if (!lines.length) return false;
  article.arcSummary = lines;
  return true;
}

function rebuildSummaryBullets(article) {
  const bullets = (article.timeline || [])
    .filter((e) => e.type === "speech" && e.summaryPlain && !isBadSummaryLine(e.summaryPlain))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5)
    .map((e) => {
      const dated = formatDatedBullet(e.date, e.summaryPlain);
      return dated ? `${dated}（国会議事録）` : null;
    })
    .filter(Boolean);
  if (!bullets.length) return false;
  article.summaryBullets = bullets;
  return true;
}

function rebuildPlainExplanation(article) {
  const nowLines = article.nowSummary?.bullets || [];
  if (!nowLines.length) return false;
  const house = article.primarySpeech?.nameOfHouse || "国会";
  const meeting = article.primarySpeech?.nameOfMeeting || "";
  article.plainExplanation = `${house}${meeting ? `（${meeting}）` : ""}の発言等をもとに整理しています。\n\n結論から言うと、${nowLines.join(" ")}\n\nここでの整理は国会議事録・公表資料に基づく事実の要約です。政府・与党・野党の主張の優劣は断定しません。数字・引用の正本は下の議事録リンクで確認できます。`;
  return true;
}

async function fixArticle(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const raw = await readFile(fp, "utf8");
  const article = JSON.parse(raw);
  if (!articleNeedsFix(article, raw)) return 0;

  const kw = article.searchKeyword || slug;
  let fixed = 0;

  for (const ev of article.timeline || []) {
    if (ev.type !== "speech") continue;
    if (!forceAll && ev.summaryPlain && !isBadSummaryLine(ev.summaryPlain)) continue;
    const speechID = ev.speech?.speechID;
    if (!speechID) continue;
    try {
      const r = await fetchRecord(speechID);
      if (!r) continue;
      const plain = summarizeSpeechRecord(r, kw);
      if (!plain || isBadSummaryLine(plain)) continue;
      if (plain !== ev.summaryPlain) {
        ev.summaryPlain = plain;
        fixed++;
      }
    } catch (err) {
      console.warn(`  skip ${speechID}: ${err.message}`);
    }
  }

  const rebuilt = rebuildNowBullets(article);
  const finalized = finalizeNowBulletsForTitle(
    rebuilt,
    article.title || "",
    kw,
    { arcSummary: article.arcSummary },
  );
  const [first, ...rest] = finalized;
  const goodRest = rest.filter((b) => !isBadSummaryLine(b, kw) && isCompleteSummary(b));
  const bullets = [first, ...goodRest]
    .filter(Boolean)
    .filter((b, i) => i === 0 || !isBadSummaryLine(b, kw))
    .slice(0, 3);
  if (bullets.length) {
    article.nowSummary = article.nowSummary || {
      label: "いまの結論（AI・平易語）",
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
    };
    article.nowSummary.bullets = bullets;
    article.nowSummary.updatedAt = new Date().toISOString();
    fixed++;
  }

  if (rebuildArcSummary(article)) fixed++;
  if (rebuildSummaryBullets(article)) fixed++;
  if (rebuildPlainExplanation(article)) fixed++;
  if (sanitizeMeritsDemerits(article)) fixed++;

  if (fixed > 0 && !dryRun) {
    await writeFile(fp, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  }
  return fixed;
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg
    ? [slugArg]
    : forceAll
      ? index.slugs.filter((s) => s !== "test")
      : [...new Set([...TARGET_SLUGS, ...index.slugs.filter((s) => s !== "test")])];

  let total = 0;
  for (const slug of slugs) {
    try {
      const fp = path.join(articlesDir, `${slug}.json`);
      const raw = await readFile(fp, "utf8");
      const article = JSON.parse(raw);
      if (!articleNeedsFix(article, raw)) continue;
      const n = await fixArticle(slug);
      if (n > 0) {
        console.log(`${slug}: ${n} 件修正${dryRun ? " (dry-run)" : ""}`);
        total += n;
      }
    } catch (err) {
      console.warn(`${slug}: ${err.message}`);
    }
  }
  console.log(`fix-vague-timeline: ${total} 件${dryRun ? " (dry-run)" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
