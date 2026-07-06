#!/usr/bin/env node
/**
 * タイムライン・nowSummary の「国会で答弁・質疑した」等の空文案を議事録APIで具体化
 * node scripts/fix-vague-timeline.mjs [--slug nenkin] [--dry-run]
 */
import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSpeech, topicSpeechExcerpt } from "./lib/kokkai-api.mjs";
import {
  synthesizeNowSummary,
  buildFactBundle,
  finalizeNowBulletsForTitle,
} from "./lib/writer-synthesize.mjs";
import {
  isBoilerplateTopicLine,
  topicTerms,
  textStronglyMatchesTopic,
} from "../src/lib/topic-relevance.mjs";
import { normalizeFactPhrase } from "../src/lib/diet-voice.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const dryRun = process.argv.includes("--dry-run");

function isVague(text) {
  const t = String(text || "");
  return (
    isBoilerplateTopicLine(t) ||
    /に関する.*での論点/.test(t) ||
    t.length > 160
  );
}

function shortenExcerpt(excerpt, maxLen = 96) {
  const body = String(excerpt || "")
    .replace(/\s+/g, " ")
    .replace(/○[^　]+（[^）]+）\s*/g, "")
    .trim();
  const sentences = body
    .split(/。/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && !/^はい$|^そうです/.test(s));
  for (const s of sentences) {
    if (s.length <= maxLen) return `${s}。`;
  }
  const first = sentences[0] || body;
  if (first.length <= maxLen) return first.endsWith("。") ? first : `${first}。`;
  return `${first.slice(0, maxLen - 1)}…。`;
}

function formatBullet(date, speaker, group, body) {
  const grp = group ? `（${group}）` : "";
  const clean = String(body || "")
    .replace(/^\d{4}-\d{2}-\d{2}：/, "")
    .replace(/^[^—]+—\s*/, "")
    .trim();
  if (!clean) return null;
  const line = clean.endsWith("。") ? clean : `${clean}。`;
  return `${date}：${speaker}${grp}— ${line}`;
}

async function fetchRecord(speechID) {
  const data = await fetchSpeech({ speechID });
  return data.speechRecord?.[0] ?? null;
}

async function plainFromRecord(r, keyword) {
  const terms = topicTerms(keyword);
  const excerpt = normalizeFactPhrase(topicSpeechExcerpt(r.speech, terms, 240));
  if (!excerpt || excerpt.length < 16) return null;
  if (!textStronglyMatchesTopic(excerpt, keyword)) return null;
  return shortenExcerpt(excerpt);
}

async function fixArticle(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  const kw = article.searchKeyword || slug;
  let fixed = 0;

  for (const ev of article.timeline || []) {
    if (ev.type !== "speech" || !isVague(ev.summaryPlain)) continue;
    const speechID = ev.speech?.speechID;
    if (!speechID) continue;
    try {
      const r = await fetchRecord(speechID);
      if (!r) continue;
      const plain = await plainFromRecord(r, kw);
      if (!plain) continue;
      const bullet = formatBullet(
        ev.date || r.date,
        r.speaker || ev.speech?.speaker,
        r.speakerGroup || ev.speech?.speakerGroup,
        plain,
      );
      if (!bullet || isVague(bullet)) continue;
      ev.summaryPlain = `${r.speaker}${r.speakerGroup ? `（${r.speakerGroup}）` : ""}— ${plain}`;
      fixed++;
    } catch (err) {
      console.warn(`  skip ${speechID}: ${err.message}`);
    }
  }

  if (article.nowSummary?.bullets) {
    const newBullets = [];
    for (const b of article.nowSummary.bullets) {
      if (!isVague(b)) {
        newBullets.push(b);
        continue;
      }
      const dated = b.match(/^(\d{4}-\d{2}-\d{2})：(.+)$/);
      const date = dated?.[1];
      const rest = dated?.[2] || b;
      const speaker =
        rest.match(/^(.+?)が/)?.[1] ||
        rest.match(/^([^—（]+)/)?.[1]?.trim();
      const tl = (article.timeline || []).find(
        (e) =>
          e.type === "speech" &&
          e.date === date &&
          (!speaker || e.speech?.speaker === speaker || rest.startsWith(speaker)),
      );
      if (tl && !isVague(tl.summaryPlain)) {
        newBullets.push(`${tl.date}：${tl.summaryPlain}`);
        fixed++;
      } else {
        newBullets.push(b);
      }
    }
    if (newBullets.some((b, i) => b !== article.nowSummary.bullets[i])) {
      article.nowSummary.bullets = newBullets.slice(0, 3);
      article.nowSummary.updatedAt = new Date().toISOString();
    }
  }

  if (article.summaryBullets) {
    article.summaryBullets = (article.timeline || [])
      .filter((e) => e.type === "speech" && e.summaryPlain && !isVague(e.summaryPlain))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5)
      .map((e) => `${e.date}：${e.summaryPlain}（国会議事録）`);
  }

  const dietLines = (article.timeline || [])
    .filter((e) => e.type === "speech" && e.summaryPlain && !isVague(e.summaryPlain))
    .slice(0, 3)
    .map((e) => `${e.date}：${e.summaryPlain}`);
  if (dietLines.length && article.plainExplanation) {
    const house = article.primarySpeech?.nameOfHouse || "国会";
    const meeting = article.primarySpeech?.nameOfMeeting || "";
    article.plainExplanation = `${house}${meeting ? `（${meeting}）` : ""}の発言等をもとに整理しています。\n\n結論から言うと、${dietLines.join(" ")}\n\nここでの整理は国会議事録・公表資料に基づく事実の要約です。政府・与党・野党の主張の優劣は断定しません。数字・引用の正本は下の議事録リンクで確認できます。`;
  }

  if (fixed > 0 && !dryRun) {
    await writeFile(fp, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  }
  return fixed;
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");
  let total = 0;
  for (const slug of slugs) {
    const fp = path.join(articlesDir, `${slug}.json`);
    const raw = await readFile(fp, "utf8");
    const needsFix =
      /国会で答弁|が国会で論じた|を国会で論じた|に関する.*での論点/.test(raw);
    if (!needsFix) continue;
    const n = await fixArticle(slug);
    if (n > 0) {
      console.log(`${slug}: ${n} 件修正${dryRun ? " (dry-run)" : ""}`);
      total += n;
    }
  }
  console.log(`fix-vague-timeline: ${total} 件${dryRun ? " (dry-run)" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
