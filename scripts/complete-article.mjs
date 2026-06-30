#!/usr/bin/env node
/**
 * 記事を公開ゲート（①〜④）まで自動完成させる
 *
 * Usage:
 *   node scripts/complete-article.mjs --slug shohizei-genmen
 */
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import { isPublishGate, pipelineChecks, refreshProjectStatus } from "../src/lib/project-status.mjs";
import { loadArticle } from "../src/lib/articles.mjs";
import { fetchSpeechForKeyword, pickSpeech, excerptSpeech, scoreSpeechRelevance } from "./lib/kokkai-api.mjs";
import { buildArticleLayers } from "./lib/article-summary.mjs";
import { enrichGeneralArticle, writePolicyMatrixGeneral, fetchReadable, isGeneralContentReady } from "./lib/enrich-general.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const slug = arg("slug");
if (!slug) {
  console.error("必須: --slug");
  process.exit(1);
}

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function countVerifiedX(article) {
  return (article.xPosts ?? []).filter(
    (p) => p.post_url && p.post_text && p.status === "url_found",
  ).length;
}

function isKokkaiContentReady(article) {
  const bullets = article.nowSummary?.bullets ?? [];
  const placeholder =
    bullets.length === 1 && String(bullets[0]).includes("下記の議事録");
  if (placeholder) return false;
  const tl = article.timeline ?? [];
  const dietInTl = tl.filter(
    (e) =>
      e.type === "speech" &&
      e.speech?.speechURL?.includes("kokkai.ndl.go.jp"),
  );
  return Boolean(
    article.primarySpeech?.speechFull &&
    bullets.length >= 3 &&
    (article.summaryBullets?.length ?? 0) >= 3 &&
    (article.glossary?.length ?? 0) >= 2 &&
    dietInTl.length >= 3,
  );
}

async function enrichKokkai(article) {
  const keyword = article.searchKeyword;
  const from = "2023-01-01";
  const until = new Date().toISOString().slice(0, 10);
  console.log(`[国会] API再取得: ${keyword}`);
  const fetched = await fetchSpeechForKeyword(keyword, { from, until, maximumRecords: 100 });
  const records = fetched.records;
  article.apiHits = fetched.apiHits;
  const searchKeyword = fetched.resolvedKeyword;
  if (searchKeyword !== keyword) {
    console.log(`  キーワードフォールバック: "${keyword}" → "${searchKeyword}"`);
    article.searchKeyword = searchKeyword;
  }

  const best = pickSpeech(records, searchKeyword);
  if (!best?.speech) throw new Error("国会発言が見つかりません");

  const meta = {
    date: best.date,
    nameOfHouse: best.nameOfHouse,
    nameOfMeeting: best.nameOfMeeting,
    speaker: best.speaker,
    speakerGroup: best.speakerGroup,
  };
  const layers = buildArticleLayers(best.speech, searchKeyword.split(/\s+/), meta);

  article.nowSummary = layers.nowSummary;
  article.summaryBullets = layers.summaryBullets;
  article.plainExplanation = layers.plainExplanation;
  article.glossary = layers.glossary;
  article.primarySpeech = {
    speechID: best.speechID ?? null,
    issueID: best.issueID ?? null,
    date: best.date ?? null,
    nameOfHouse: best.nameOfHouse ?? null,
    nameOfMeeting: best.nameOfMeeting ?? null,
    session: best.session ?? null,
    issue: best.issue ?? null,
    speaker: best.speaker ?? null,
    speakerGroup: best.speakerGroup ?? null,
    speakerPosition: best.speakerPosition ?? null,
    speechURL: best.speechURL ?? null,
    meetingURL: best.meetingURL ?? null,
    excerpt: excerptSpeech(best.speech, 280),
    speechFull: best.speech ?? null,
  };

  const byDate = new Map();
  for (const r of records) {
    if (!r.date || !r.speech || !r.speechURL) continue;
    const score = scoreSpeechRelevance(r, searchKeyword);
    if (score < 5) continue;
    const prev = byDate.get(r.date);
    if (!prev || score > prev.score) byDate.set(r.date, { record: r, score });
  }

  article.arcSummary = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([date, { record }]) => ({
      date,
      text: excerptSpeech(record.speech, 100),
    }));

  article.timeline = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([date, { record }], i) => ({
      id: `${slug}-tl-${i}`,
      type: "speech",
      date,
      summaryPlain: excerptSpeech(record.speech, 120),
      speech: {
        speechID: record.speechID,
        issueID: record.issueID,
        date: record.date,
        nameOfHouse: record.nameOfHouse,
        nameOfMeeting: record.nameOfMeeting,
        session: record.session,
        issue: record.issue,
        speaker: record.speaker,
        speakerGroup: record.speakerGroup,
        speechURL: record.speechURL,
        meetingURL: record.meetingURL,
      },
    }));

  await writePolicyMatrixKokkai(article, records);
  return article;
}

async function writePolicyMatrixKokkai(article, records) {
  const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
  try {
    await access(matrixPath);
    console.log("[matrix] 既存ファイルあり — スキップ");
    return;
  } catch {
    /* create */
  }

  const groups = new Map();
  for (const r of records) {
    const g = r.speakerGroup?.trim();
    if (!g || groups.has(g) || !r.speechURL) continue;
    groups.set(g, r);
    if (groups.size >= 2) break;
  }
  if (groups.size < 2) {
    console.warn("[matrix] 2党未満 — 自動生成スキップ");
    return;
  }

  const parties = [...groups.entries()].map(([label, r]) => ({
    partyLabel: label.split("・")[0].slice(0, 20),
    stance: {
      text: excerptSpeech(r.speech, 100),
      sourceUrl: r.speechURL,
      sourceType: "国会発言",
      capturedAt: new Date().toISOString().slice(0, 10),
    },
    action: {
      text: `${r.nameOfMeeting ?? "国会"}（${r.date}）での発言`,
      speechUrl: r.speechURL,
      capturedAt: new Date().toISOString().slice(0, 10),
    },
    symbol: "▲",
    symbolReason: "自動生成（国会発言ベース）。手動で更新推奨",
  }));

  const matrix = {
    policySlug: slug,
    policyLabel: article.title?.replace(/ — あの話どうなった？$/, "") ?? slug,
    relatedArticleSlug: slug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v1-auto",
    disclaimer: "党の公式評価ではなく、公言と行動の整理表です（自動生成）。",
    excerpt: { parties: "国会発言から2会派を自動選定", politicians: "" },
    parties,
  };
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  article.stanceMatrix = {
    policySlug: slug,
    dataPath: `data/policy-matrix/${slug}.json`,
    disclaimer: "出典付きの事実整理です（自動生成）。",
  };
  console.log("[matrix] 作成完了");
}

async function main() {
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  let article = JSON.parse(await readFile(articlePath, "utf8"));

  console.log(`\n=== complete-article: ${slug} (${article.category}) ===\n`);

  // ① コンテンツ
  if (article.category === "国会") {
    if (isKokkaiContentReady(article)) {
      console.log("[国会] 既にコンテンツあり — スキップ");
    } else {
      await enrichKokkai(article);
    }
  } else if (isGeneralContentReady(article)) {
    console.log("[一般] 既にコンテンツあり — スキップ");
  } else {
    console.log("[一般] ソース取得・要約");
    await enrichGeneralArticle(article, root);
    const sources = (article.timeline ?? [])
      .filter((t) => t.sourceUrl)
      .map((t) => ({ url: t.sourceUrl, snippet: t.summaryPlain, date: t.date }));
    if (sources.length >= 2) {
      await writePolicyMatrixGeneral(article, root, sources);
    }
  }

  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  console.log("[①] コンテンツ投入完了");

  console.log("[②] メリデメ自動生成");
  await runNode("generate-proscons-auto.mjs", ["--slug", slug]);

  // ③ X
  const xMin = article.xPostsMinRequired ?? 3;
  if (countVerifiedX(article) >= xMin) {
    console.log(`[③] X調査スキップ（検証済み ${countVerifiedX(article)} 件）`);
  } else {
    console.log("[③] X調査");
    await runNode("x-research-batch.mjs", [slug]);
  }

  console.log("[③b] タイムライン統合（X3+国会3）");
  await runNode("enrich-timeline-all.mjs", ["--slug", slug]);

  // ④ 法務
  console.log("[④] 法務");
  await runNode("legal-check.mjs", ["--slug", slug, "--fix"]);

  article = await loadArticle(slug);
  const gate = await checkCasePageWithFiles(article);
  let policyMatrix = null;
  try {
    policyMatrix = JSON.parse(
      await readFile(path.join(root, article.stanceMatrix.dataPath), "utf8"),
    );
  } catch {
    /* */
  }
  const pipeline = pipelineChecks(article, gate, policyMatrix);

  if (isPublishGate(pipeline)) {
    article.publishReady = true;
    article.pageReady = false;
    await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    console.log("\n✅ 公開ゲート（①〜④）OK — 非公開プレビュー可能。管理画面で「公開する」");
  } else {
    console.log("\n⚠️ 公開ゲート未達:");
    for (const b of gate.blockers) console.log(`  - ${b.id}: ${b.detail}`);
    await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    await refreshProjectStatus();
    process.exit(2);
  }

  await refreshProjectStatus();
  await runNode("check-case-page.mjs", ["--slug", slug]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
