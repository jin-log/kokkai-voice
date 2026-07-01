#!/usr/bin/env node
/**
 * タイムライン強化 — X3 + 国会3（計6以上）
 * - xPosts（url_found）→ timeline の x_post へ同期
 * - 不足分は国会APIから speech を追加
 * - 既存 timeline 行の文言は書き換えない（追記・xPosts 同期のみ）
 *
 * 用法:
 *   node scripts/enrich-timeline-all.mjs
 *   node scripts/enrich-timeline-all.mjs --slug shussho-budget-seika
 *   node scripts/enrich-timeline-all.mjs --dry-run
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchSpeech,
  topicSpeechExcerpt,
  scoreSpeechTopicRelevance,
} from "./lib/kokkai-api.mjs";
import { textMatchesTopic, topicTerms, textStronglyMatchesTopic } from "../src/lib/topic-relevance.mjs";
import { normalizeFactPhrase } from "../src/lib/diet-voice.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "data/articles");

const dryRun = process.argv.includes("--dry-run");
const slugArg = (() => {
  const i = process.argv.indexOf("--slug");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const MIN_X = 3;
const MIN_DIET = 3;
const MIN_TOTAL = 6;

function speechMeta(r) {
  return {
    speechID: r.speechID,
    issueID: r.issueID,
    date: r.date,
    nameOfHouse: r.nameOfHouse,
    nameOfMeeting: r.nameOfMeeting,
    session: r.session,
    issue: r.issue,
    speaker: r.speaker,
    speakerGroup: r.speakerGroup,
    speakerPosition: r.speakerPosition ?? null,
    speechURL: r.speechURL,
    meetingURL: r.meetingURL,
  };
}

function xPostToEntry(p) {
  const date =
    p.posted_at?.slice(0, 10) ||
    p.captured_at?.slice(0, 10) ||
    p.researched_at?.slice(0, 10) ||
    null;
  return {
    id: `x-slot-${p.slot}`,
    type: "x_post",
    date,
    summaryPlain: p.post_text || null,
    xPost: p,
  };
}

function isDietSpeech(e) {
  return (
    e.type === "speech" &&
    e.speech?.speechURL?.includes("kokkai.ndl.go.jp")
  );
}

function isXPost(e) {
  return e.type === "x_post" && e.xPost?.post_url;
}

function keywordFor(article) {
  return (
    article.searchKeyword ||
    article.tags?.join(" ") ||
    article.title?.replace(/\s*—.*$/, "") ||
    article.slug
  );
}

function searchTerms(article) {
  if (Array.isArray(article.searchKeywords) && article.searchKeywords.length) {
    return [...new Set(article.searchKeywords)].slice(0, 8);
  }
  const kw = keywordFor(article);
  const parts = kw.split(/\s+/).filter(Boolean);
  const terms = [kw, ...parts];
  if (article.tags?.length) terms.push(...article.tags);
  return [...new Set(terms)].slice(0, 6);
}

async function fetchDietSpeeches(article, need) {
  if (need <= 0) return [];
  const until = new Date().toISOString().slice(0, 10);
  const from = "2023-01-01";
  const terms = searchTerms(article);
  const collected = [];
  const seen = new Set();

  for (const term of terms) {
    if (collected.length >= need) break;
    try {
      const data = await fetchSpeech({
        any: term,
        from,
        until,
        maximumRecords: 40,
      });
      const records = data.speechRecord || [];
      const terms = topicTerms(keywordFor(article));
      const ranked = records
        .map((r) => ({ r, score: scoreSpeechTopicRelevance(r, keywordFor(article)) }))
        .filter((x) => x.score > 8)
        .sort((a, b) => b.score - a.score);

      for (const { r } of ranked) {
        if (collected.length >= need) break;
        if (!r.speechID || seen.has(r.speechID)) continue;
        const plain = normalizeFactPhrase(topicSpeechExcerpt(r.speech, terms, 180));
        if (!plain || plain.length < 30) continue;
        if (!textMatchesTopic(plain, terms)) continue;
        seen.add(r.speechID);
        collected.push({
          id: `speech-${r.speechID}`,
          type: "speech",
          date: r.date,
          summaryPlain: `${r.speaker}（${r.speakerGroup || ""}）— ${plain}`,
          speech: speechMeta(r),
        });
      }
    } catch (err) {
      console.warn(`  API skip "${term}": ${err.message}`);
    }
  }
  return collected;
}

function mergeTimeline(article, newSpeeches) {
  let timeline = [...(article.timeline || [])];
  const ids = new Set(timeline.map((e) => e.id));

  for (const p of (article.xPosts || []).filter(
    (x) =>
      x.post_url &&
      x.post_text &&
      x.status === "url_found" &&
      textStronglyMatchesTopic(String(x.post_text), keywordFor(article)),
  )) {
    const entry = xPostToEntry(p);
    if (!ids.has(entry.id)) {
      timeline.push(entry);
      ids.add(entry.id);
    } else {
      timeline = timeline.map((e) =>
        e.id === entry.id ? { ...entry, ...e, xPost: p } : e,
      );
    }
  }

  for (const s of newSpeeches) {
    if (!ids.has(s.id)) {
      timeline.push(s);
      ids.add(s.id);
    }
  }

  timeline.sort((a, b) => {
    const da = a.date || "0000-01-01";
    const db = b.date || "0000-01-01";
    return da.localeCompare(db);
  });

  return timeline;
}

async function enrichArticle(slug) {
  const fp = path.join(articlesDir, `${slug}.json`);
  const article = JSON.parse(await readFile(fp, "utf8"));
  if (article.adminHidden && slug !== slugArg) return null;

  const before = {
    total: (article.timeline || []).length,
    x: (article.timeline || []).filter(isXPost).length,
    diet: (article.timeline || []).filter(isDietSpeech).length,
  };

  let timeline = [...(article.timeline || [])];
  const terms = topicTerms(keywordFor(article));
  timeline = timeline.filter((e) => {
    if (isXPost(e)) {
      return textStronglyMatchesTopic(String(e.summaryPlain || e.xPost?.post_text || ""), keywordFor(article));
    }
    if (!isDietSpeech(e)) return true;
    return textMatchesTopic(String(e.summaryPlain || ""), terms);
  });
  timeline = mergeTimeline(article, []);

  let xCount = timeline.filter(isXPost).length;
  let dietCount = timeline.filter(isDietSpeech).length;

  if (dietCount < MIN_DIET) {
    const fetched = await fetchDietSpeeches(article, MIN_DIET - dietCount);
    timeline = mergeTimeline({ ...article, timeline }, fetched);
    dietCount = timeline.filter(isDietSpeech).length;
  }

  xCount = timeline.filter(isXPost).length;
  dietCount = timeline.filter(isDietSpeech).length;
  const total = timeline.length;

  const changed =
    total !== before.total ||
    xCount !== before.x ||
    dietCount !== before.diet;

  if (changed && !dryRun) {
    article.timeline = timeline;
    article.enrichedAt = new Date().toISOString();
    await writeFile(fp, JSON.stringify(article, null, 2) + "\n", "utf8");
  }

  const status =
    total >= MIN_TOTAL && xCount >= MIN_X && dietCount >= MIN_DIET ? "OK" : "NG";
  console.log(
    `${status} ${slug}: total ${before.total}→${total} (X ${before.x}→${xCount}, 国会 ${before.diet}→${dietCount})`,
  );

  if (xCount < MIN_X) {
    console.log(`  ⚠ X不足 ${xCount}/${MIN_X} — x-research-batch を実行`);
  }

  return { slug, status, xCount, dietCount, total };
}

async function main() {
  const index = JSON.parse(
    await readFile(path.join(articlesDir, "index.json"), "utf8"),
  );
  const slugs = slugArg ? [slugArg] : index.slugs.filter((s) => s !== "test");

  console.log(`enrich-timeline ${dryRun ? "(dry-run) " : ""}— ${slugs.length} 件\n`);

  const results = [];
  for (const slug of slugs) {
    results.push(await enrichArticle(slug));
  }

  const ng = results.filter((r) => r && r.status === "NG");
  console.log(`\n--- 完了: OK ${results.filter((r) => r?.status === "OK").length} / NG ${ng.length} ---`);
  if (ng.length) {
    console.log("NG slugs:", ng.map((r) => r.slug).join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
