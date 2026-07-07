#!/usr/bin/env node
/**
 * 記事を公開ゲート（①〜④）まで自動完成させる
 *
 * Usage:
 *   node scripts/complete-article.mjs --slug shohizei-genmen
 */
import { readFile, writeFile, access, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import { pipelineChecks, refreshProjectStatus } from "../src/lib/project-status.mjs";
import { isTitleAnsweredInOpeningLine, assessTitleOpeningAnswer } from "../src/lib/publish-policy.mjs";
import { recordArticleActivity } from "../src/lib/article-activity.mjs";
import { loadArticle } from "../src/lib/articles.mjs";
import { enforceLivePublishLock, isLiveOnSite } from "../src/lib/publish-lock.mjs";
import { fetchSpeechForArticle, fetchSpeechForKeyword, pickSpeechForSummary, excerptSpeech, scoreSpeechRelevance, extractKeywordSpeechWindow, topicSpeechExcerpt, scoreSpeechTopicRelevance } from "./lib/kokkai-api.mjs";
import { buildArticleLayers } from "./lib/article-summary.mjs";
import {
  buildFactBundle,
  synthesizeNowSummary,
  synthesizeEvidence,
  synthesizeArcSummary,
  composeAllFallback,
  synthesizePlainExplanation,
  synthesizePartyMatrix,
  synthesizeProsCons,
  synthesizeProsConsFromArticle,
  synthesizeTimelinePlain,
  finalizeNowBulletsForTitle,
} from "./lib/writer-synthesize.mjs";
import { enrichGeneralArticle, writePolicyMatrixGeneral, fetchReadable, isGeneralContentReady } from "./lib/enrich-general.mjs";
import {
  generalSummaryIsBad,
  hasGeneralMeritPool,
  rebuildGeneralSummaryFromMerits,
} from "../src/lib/general-article.mjs";
import { citizenTitle } from "../src/lib/title-format.mjs";
import { isTopicRelevant, textMatchesTopic, topicTerms, isConclusionQuality, countTopicArcLines, countTopicDietTimeline, isDietTimelineTopicOk, isMatrixTopicRelevant, isMatrixTopicConsistent, textStronglyMatchesTopic, ensureTopicInLines, isBoilerplateTopicLine } from "../src/lib/topic-relevance.mjs";
import { normalizeFactPhrase, isDietVoice, isSpeechFragment, isIncompleteBullet, isWriterReadyLine } from "../src/lib/diet-voice.mjs";
import { isBadSummaryLine } from "./lib/speech-summary.mjs";
import { scorePartySymbol, SYMBOL_METHODOLOGY } from "../src/lib/symbol-rules.mjs";
import { mergeInternalLinks } from "../src/lib/internal-link-graph.mjs";
import { assertEditorialRules } from "../src/lib/editorial-enforce.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const slug = arg("slug");
const force = process.argv.includes("--force");
const contentOnly = process.argv.includes("--content-only");
const matrixOnly = process.argv.includes("--matrix-only");
const xOnly = process.argv.includes("--x-only");
const legalOnly = process.argv.includes("--legal-only");
const allWip = process.argv.includes("--all-wip");
if (!slug && !allWip) {
  console.error("必須: --slug SLUG または --all-wip");
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

function countTopicVerifiedX(article) {
  return (article.xPosts ?? []).filter(
    (p) =>
      p.post_url &&
      p.post_text &&
      p.status === "url_found" &&
      textStronglyMatchesTopic(String(p.post_text), article.searchKeyword),
  ).length;
}

function isKokkaiContentReady(article, policyMatrix = null) {
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
    isConclusionQuality(bullets) &&
    (article.summaryBullets?.length ?? 0) >= 3 &&
    (article.glossary?.length ?? 0) >= 2 &&
    dietInTl.length >= 3 &&
    countTopicArcLines(article) >= 3 &&
    isDietTimelineTopicOk(article) &&
    isTopicRelevant(article) &&
    isMatrixTopicRelevant(policyMatrix, article.searchKeyword) &&
    isMatrixTopicConsistent(article, policyMatrix),
  );
}

const EXTRA_KEYWORDS = {
  "case-mr0jbdpc": ["国旗損壊罪", "国旗"],
  "case-mqzxj4ro": ["歳費", "期末手当", "特別職給与", "議員報酬"],
  "case-mqzxgs3f": ["国家情報会議", "スパイ防止法制"],
  "bouka-taisaku": ["物価高対策", "物価高騰対策", "予備費"],
};

/** タイトル【】から追加検索語（全国会記事） */
function extraKeywordsFromTitle(article) {
  const m = String(article.title || "").match(/【([^】]+)】/);
  if (!m) return [];
  return m[1]
    .split(/[｜|・]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

function isTopicContentPreserved(article, policyMatrix = null) {
  return (
    countTopicArcLines(article) >= 3 &&
    isDietTimelineTopicOk(article) &&
    isTopicRelevant(article) &&
    isMatrixTopicRelevant(policyMatrix, article.searchKeyword) &&
    isMatrixTopicConsistent(article, policyMatrix)
  );
}

function mergeUniqueBullets(target, source, max = 3) {
  const seen = new Set(target.map((b) => String(b).replace(/[、。…\s]/g, "").slice(0, 20)));
  for (const raw of source) {
    if (target.length >= max) break;
    const b = String(raw || "").trim();
    if (!b || isBoilerplateTopicLine(b)) continue;
    const plain = b.endsWith("。") ? b : `${b}。`;
    const key = plain.replace(/[、。…\s]/g, "").slice(0, 20);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(plain);
  }
  return target;
}

function isGoodNowBullet(text) {
  const b = String(text || "").trim();
  if (!b || b.length < 12 || isBoilerplateTopicLine(b) || isBadSummaryLine(b)) return false;
  if (/お尋ねがございました|についてお尋ね|受け止めとジェンダー/.test(b)) return false;
  if (isSpeechFragment(b) || isIncompleteBullet(b)) return false;
  if (isDietVoice(b) && !/閣議|発足|予算|法案|賃上げ|投資|歳出|消費税|高市内閣/.test(b)) {
    return false;
  }
  return isWriterReadyLine(b) || /閣議|発足|予算|法案|連立|追及|答弁|賃上げ|投資|歳出|消費税|兆円|高市内閣/.test(b);
}

/** speechFull 要約（buildArticleLayers）を primary に、不足時のみライター層で補完 */
function buildNowBulletsPrimary(records, keyword, best, factBundle, meta) {
  const topicKw = topicTerms(keyword);
  const layers = buildArticleLayers(best.speech, topicKw, meta);
  let nowBullets = [];

  mergeUniqueBullets(
    nowBullets,
    synthesizeNowSummary(factBundle, meta).filter(isGoodNowBullet),
    3,
  );
  mergeUniqueBullets(
    nowBullets,
    composeAllFallback(factBundle, meta).filter(isGoodNowBullet),
    3,
  );

  const layerCandidates = [
    ...(layers.nowSummary?.bullets ?? []),
  ];
  const ranked = records
    .filter((r) => r.speech && r.speechID !== best.speechID)
    .map((r) => ({ r, score: scoreSpeechTopicRelevance(r, keyword) }))
    .filter((x) => x.score > 8)
    .sort((a, b) => b.score - a.score);

  for (const { r } of ranked.slice(0, 6)) {
    const subMeta = {
      date: r.date,
      nameOfHouse: r.nameOfHouse,
      nameOfMeeting: r.nameOfMeeting,
      speaker: r.speaker,
      speakerGroup: r.speakerGroup,
      speechURL: r.speechURL,
    };
    layerCandidates.push(...(buildArticleLayers(r.speech, topicKw, subMeta).nowSummary?.bullets ?? []));
  }
  mergeUniqueBullets(nowBullets, layerCandidates.filter(isGoodNowBullet), 3);

  return { nowBullets, layers };
}

/** @param {string} slug */
async function loadArticleJson(slug) {
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  return JSON.parse(await readFile(articlePath, "utf8"));
}

async function enrichKokkai(article, articleSlug) {
  const keyword = article.searchKeyword;
  const from = "2023-01-01";
  const until = new Date().toISOString().slice(0, 10);
  console.log(`[国会] API再取得: ${keyword}${article.searchKeywords?.length ? ` (+${article.searchKeywords.length}語)` : ""}`);
  const fetched = await fetchSpeechForArticle(article, { from, until, maximumRecords: 100 });
  let records = fetched.records;
  article.apiHits = fetched.apiHits;
  let searchKeyword = article.searchKeyword || fetched.resolvedKeyword;
  if (!article.searchKeywords?.length && fetched.resolvedKeyword !== keyword) {
    console.log(`  キーワードフォールバック: "${keyword}" → "${fetched.resolvedKeyword}"`);
    article.searchKeyword = fetched.resolvedKeyword;
    searchKeyword = fetched.resolvedKeyword;
  }

  for (const extra of [
    ...new Set([...(EXTRA_KEYWORDS[articleSlug] || []), ...extraKeywordsFromTitle(article)]),
  ]) {
    const more = await fetchSpeechForKeyword(extra, { from, until, maximumRecords: 50 });
    for (const r of more.records) {
      if (!records.some((x) => x.speechID === r.speechID)) records.push(r);
    }
    article.apiHits = Math.max(article.apiHits, more.apiHits);
  }

  const best = pickSpeechForSummary(records, searchKeyword);
  if (!best?.speech) throw new Error("国会発言が見つかりません");

  const topicKw = topicTerms(searchKeyword);
  const summarySource = extractKeywordSpeechWindow(best.speech, topicKw);
  const meta = {
    date: best.date,
    nameOfHouse: best.nameOfHouse,
    nameOfMeeting: best.nameOfMeeting,
    speaker: best.speaker,
    speakerGroup: best.speakerGroup,
    speechURL: best.speechURL,
  };

  const factBundle = buildFactBundle(records, searchKeyword);
  const { nowBullets: primaryBullets, layers } = buildNowBulletsPrimary(
    records,
    searchKeyword,
    best,
    factBundle,
    meta,
  );
  let nowBullets = primaryBullets;
  if (nowBullets.length < 1) {
    throw new Error(`[writer] 結論が空 — 原材料不足または変換失敗`);
  }
  nowBullets = ensureTopicInLines(nowBullets, searchKeyword);
  if (nowBullets.length < 1) {
    throw new Error(`[writer] 結論が空 — 話題語のある行が足りない`);
  }
  let arcFromWriter = synthesizeArcSummary(factBundle);
  if (arcFromWriter.length < 3) {
    const seenDates = new Set(arcFromWriter.map((x) => x.date));
    for (const sn of factBundle.snippets) {
      if (arcFromWriter.length >= 3) break;
      if (!sn.date || seenDates.has(sn.date)) continue;
      const plain = synthesizeTimelinePlain(sn, searchKeyword);
      if (!plain || isBoilerplateTopicLine(plain) || !textStronglyMatchesTopic(plain, searchKeyword)) {
        continue;
      }
      const text = plain.endsWith("。") ? plain : `${plain}。`;
      seenDates.add(sn.date);
      arcFromWriter.push({ date: sn.date, text });
    }
    arcFromWriter.sort((a, b) => b.date.localeCompare(a.date));
  }
  if (arcFromWriter.length < 3) {
    const existingArc = (article.arcSummary ?? []).filter((x) => x?.text && !isBoilerplateTopicLine(x.text));
    if (existingArc.length >= 3) {
      arcFromWriter = existingArc;
      console.log(`[writer] 経緯フォールバック: 既存 ${arcFromWriter.length} 行`);
    }
  }

  article.title = citizenTitle({ ...article, slug: articleSlug });
  nowBullets = finalizeNowBulletsForTitle(nowBullets, article.title, searchKeyword, {
    arcSummary: arcFromWriter,
  });

  const summaryTexts = synthesizeEvidence(factBundle, nowBullets, meta, arcFromWriter).slice(0, 5);

  const glossary = layers.glossary;

  article.nowSummary = {
    label: layers.nowSummary.label,
    bullets: nowBullets,
    disclaimer: layers.nowSummary.disclaimer,
    updatedAt: new Date().toISOString(),
  };
  article.summaryBullets =
    summaryTexts.length >= 3
      ? summaryTexts.slice(0, 5)
      : (() => {
          throw new Error(`[writer] 根拠が3点未満 (${summaryTexts.length})`);
        })();
  article.plainExplanation = synthesizePlainExplanation(article.nowSummary.bullets, article.title, meta);
  article.glossary = glossary;
  mergeInternalLinks(article);
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
    excerpt: excerptSpeech(summarySource, 280),
    speechFull: best.speech ?? null,
  };

  const minSpeechScore = 8;
  const topicTermList = topicTerms(searchKeyword);
  const byDate = new Map();
  for (const r of records) {
    if (!r.date || !r.speech || !r.speechURL) continue;
    const score = scoreSpeechTopicRelevance(r, searchKeyword);
    if (score < minSpeechScore) continue;
    const excerpt = topicSpeechExcerpt(r.speech, topicTermList, 100);
    if (!textStronglyMatchesTopic(excerpt, searchKeyword)) continue;
    const prev = byDate.get(r.date);
    if (!prev || score > prev.score) {
      const plain = normalizeFactPhrase(excerpt);
      byDate.set(r.date, { record: r, score, excerpt: plain });
    }
  }

  article.arcSummary =
    arcFromWriter.length >= 3
      ? arcFromWriter
      : (() => {
          throw new Error(`[writer] 経緯が3行未満 (${arcFromWriter.length}) — 抜粋フォールバック禁止`);
        })();

  article.prosCons = synthesizeProsCons(factBundle, article.arcSummary, nowBullets, meta);

  article.timeline = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([date, { record, excerpt }], i) => {
      const sn = {
        date,
        speaker: record.speaker,
        speakerGroup: record.speakerGroup,
        speakerPosition: record.speakerPosition,
        meeting: record.nameOfMeeting,
        house: record.nameOfHouse,
        excerpt,
      };
      return {
        id: `${articleSlug}-tl-${i}`,
        type: "speech",
        date,
        summaryPlain: synthesizeTimelinePlain(sn, searchKeyword),
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
      };
    });

  await writePolicyMatrixKokkai(article, records, { force, articleSlug });
  return article;
}

async function writePolicyMatrixKokkai(article, records, { force = false, articleSlug } = {}) {
  const matrixPath = path.join(root, "data/policy-matrix", `${articleSlug}.json`);
  let existing = null;
  try {
    existing = JSON.parse(await readFile(matrixPath, "utf8"));
    if (!force && isMatrixTopicRelevant(existing, article.searchKeyword)) {
      console.log("[matrix] 話題一致済み — スキップ");
      return;
    }
    if (force || !isMatrixTopicRelevant(existing, article.searchKeyword)) {
      console.log("[matrix] 話題不一致または --force — 再生成");
      await unlink(matrixPath).catch(() => {});
    }
  } catch {
    /* create */
  }

  const groups = new Map();
  const topicTermList = topicTerms(article.searchKeyword);
  const rankedRecords = records
    .map((r) => ({ r, score: scoreSpeechTopicRelevance(r, article.searchKeyword) }))
    .filter((x) => x.score > 8)
    .sort((a, b) => b.score - a.score);
  for (const { r } of rankedRecords) {
    const g = r.speakerGroup?.trim();
    const stanceText = normalizeFactPhrase(topicSpeechExcerpt(r.speech, topicTermList, 100));
    if (!g || groups.has(g) || !r.speechURL) continue;
    if (!textStronglyMatchesTopic(stanceText, article.searchKeyword)) continue;
    groups.set(g, { r, stanceText });
    if (groups.size >= 2) break;
  }
  if (groups.size < 2) {
    console.warn("[matrix] 話題一致2党未満 — 自動生成スキップ");
    return;
  }

  const factBundle = buildFactBundle(records, article.searchKeyword);
  const matrixParties = synthesizePartyMatrix(factBundle);
  const parties = matrixParties.length >= 2
    ? matrixParties
    : [...groups.entries()].map(([label, { r, stanceText }]) => ({
        partyLabel: label.split("・")[0].slice(0, 20),
        stance: {
          text: stanceText,
          sourceUrl: r.speechURL,
          sourceType: "国会発言",
          capturedAt: r.date,
        },
        action: {
          text: `${r.nameOfMeeting ?? "国会"}（${r.date}）での発言`,
          speechUrl: r.speechURL,
          capturedAt: r.date,
        },
        symbol: "▲",
        symbolReason: "自動生成（国会発言ベース）。手動で更新推奨",
      }));

  const matrix = {
    policySlug: articleSlug,
    policyLabel: article.title?.replace(/ — あの話どうなった？$/, "") ?? articleSlug,
    relatedArticleSlug: articleSlug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v1-auto",
    disclaimer: "党の公式評価ではなく、公言と行動の整理表です（自動生成）。",
    excerpt: { parties: "国会発言から2会派を自動選定", politicians: "" },
    parties,
  };
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  article.stanceMatrix = {
    policySlug: articleSlug,
    dataPath: `data/policy-matrix/${articleSlug}.json`,
    disclaimer: "出典付きの事実整理です（自動生成）。",
  };
  console.log("[matrix] 作成完了");
}

async function rescorePolicyMatrix(slug) {
  const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
  try {
    const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
    let changed = 0;
    for (const p of matrix.parties ?? []) {
      const { symbol, symbolReason } = scorePartySymbol(p);
      if (p.symbol !== symbol || p.symbolReason !== symbolReason) {
        p.symbol = symbol;
        p.symbolReason = symbolReason;
        changed++;
      }
    }
    if (changed > 0) {
      matrix.methodologyVersion = SYMBOL_METHODOLOGY;
      matrix.updatedAt = new Date().toISOString();
      await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
      console.log(`[matrix] 記号再採点（${changed}党）`);
    }
  } catch {
    /* matrix なし */
  }
}

async function completeOneSlug(targetSlug) {
  const articlePath = path.join(root, "data/articles", `${targetSlug}.json`);
  let article = JSON.parse(await readFile(articlePath, "utf8"));
  const liveLock = isLiveOnSite(article);

  async function saveArticleJson(art) {
    enforceLivePublishLock(art, liveLock);
    let fixed;
    try {
      fixed = assertEditorialRules(art, { force });
    } catch (err) {
      console.error(`[editorial] 保存拒否: ${err.message}`);
      throw err;
    }
    await writeFile(articlePath, `${JSON.stringify(fixed, null, 2)}\n`, "utf8");
  }

  if (!force && (article.editorialRulesAppliedAt || article.contentLocked) && contentOnly) {
    console.log("[skip] editorial/content ロック — content-only 上書き禁止（--force で解除）");
    await refreshProjectStatus();
    return;
  }

  const modeTag = [
    contentOnly ? "content-only" : "",
    matrixOnly ? "matrix-only" : "",
    xOnly ? "x-only" : "",
    legalOnly ? "legal-only" : "",
  ]
    .filter(Boolean)
    .join(",");
  console.log(
    `\n=== complete-article: ${targetSlug} (${article.category})${modeTag ? ` [${modeTag}]` : ""}${liveLock ? " [公開維持]" : ""} ===\n`,
  );

  if (legalOnly) {
    console.log("[④] 法務のみ");
    await runNode("legal-check.mjs", ["--slug", targetSlug, "--fix"]);
    await refreshProjectStatus();
    await runNode("check-case-page.mjs", ["--slug", targetSlug]);
    return;
  }

  if (xOnly) {
    article = JSON.parse(await readFile(articlePath, "utf8"));
    const xMin = article.xPostsMinRequired ?? 3;
    const topicXMin = Math.min(3, xMin);
    if (force || countTopicVerifiedX(article) < topicXMin) {
      console.log("[③] Xリセット");
      await runNode("reset-xposts.mjs", [targetSlug]);
    }
    console.log("[③] X調査");
    await runNode("x-research-batch.mjs", [targetSlug]);
    console.log("[③b] タイムライン統合");
    await runNode("enrich-timeline-all.mjs", ["--slug", targetSlug]);
    await refreshProjectStatus();
    await runNode("check-case-page.mjs", ["--slug", targetSlug]);
    return;
  }

  if (matrixOnly) {
    await rescorePolicyMatrix(targetSlug);
    article = await loadArticle(targetSlug);
    let gate = await checkCasePageWithFiles(article);
    const gOpen = (gate.blockers ?? []).some((b) => String(b.id).startsWith("G"));
    if (gOpen && article.category === "国会") {
      console.log("[matrix] 〇×未達 — 再生成");
      const from = "2023-01-01";
      const until = new Date().toISOString().slice(0, 10);
      const fetched = await fetchSpeechForArticle(article, { from, until, maximumRecords: 100 });
      await writePolicyMatrixKokkai(article, fetched.records, { force: true, articleSlug: targetSlug });
      await saveArticleJson(article);
      await rescorePolicyMatrix(targetSlug);
    }
    await refreshProjectStatus();
    await runNode("check-case-page.mjs", ["--slug", targetSlug]);
    return;
  }

  // ① コンテンツ
  if (article.category === "国会") {
    let policyMatrix = null;
    try {
      policyMatrix = JSON.parse(
        await readFile(path.join(root, `data/policy-matrix/${targetSlug}.json`), "utf8"),
      );
    } catch {
      /* */
    }
    const shouldEnrich =
      contentOnly ||
      force ||
      (!isKokkaiContentReady(article, policyMatrix) && !isTopicContentPreserved(article, policyMatrix));
    if (!shouldEnrich) {
      console.log("[国会] 既にコンテンツあり — スキップ");
    } else if (!contentOnly && !force && isTopicContentPreserved(article, policyMatrix)) {
      console.log("[国会] 話題一致済み — 本文上書きスキップ");
    } else {
      await enrichKokkai(article, targetSlug);
    }
  } else if (hasGeneralMeritPool(article)) {
    const needsRebuild = generalSummaryIsBad(article) || !isGeneralContentReady(article);
    if (!needsRebuild) {
      console.log("[一般] メリデメ済み・要約良好 — スキップ");
    } else {
      console.log("[一般] メリデメ・出典から要約を再構成（Jina禁止）");
      rebuildGeneralSummaryFromMerits(article);
    }
    const sources = (article.timeline ?? [])
      .filter((t) => t.sourceUrl)
      .map((t) => ({ url: t.sourceUrl, snippet: t.summaryPlain, date: t.date }));
    await writePolicyMatrixGeneral(article, root, sources);
  } else if (!generalSummaryIsBad(article) && isGeneralContentReady(article)) {
    console.log("[一般] 要約良好 — スキップ");
  } else {
    console.log("[一般] ソース取得・要約");
    await enrichGeneralArticle(article, root);
    const sources = (article.timeline ?? [])
      .filter((t) => t.sourceUrl)
      .map((t) => ({ url: t.sourceUrl, snippet: t.summaryPlain, date: t.date }));
    await writePolicyMatrixGeneral(article, root, sources);
    article.title = citizenTitle({ ...article, slug: targetSlug });
  }

  await saveArticleJson(article);
  console.log("[①] コンテンツ投入完了");

  if (contentOnly) {
    await refreshProjectStatus();
    return;
  }

  console.log("[②] メリデメ自動生成");
  await runNode("generate-proscons-auto.mjs", ["--slug", targetSlug]);

  // ③ X（話題一致が足りなければ再調査）
  article = JSON.parse(await readFile(articlePath, "utf8"));
  const xMin = article.xPostsMinRequired ?? 3;
  const topicXMin = Math.min(3, xMin);
  const xOk = countVerifiedX(article) >= xMin && countTopicVerifiedX(article) >= topicXMin;
  if (!force && xOk) {
    console.log(
      `[③] X調査スキップ（検証済み ${countVerifiedX(article)} 件・話題一致 ${countTopicVerifiedX(article)} 件）`,
    );
  } else {
    if (force || countTopicVerifiedX(article) < topicXMin) {
      console.log("[③] Xリセット（話題不一致または --force）");
      await runNode("reset-xposts.mjs", [targetSlug]);
    }
    console.log("[③] X調査");
    await runNode("x-research-batch.mjs", [targetSlug]);
  }

  console.log("[③b] タイムライン統合（X3+国会3）");
  await runNode("enrich-timeline-all.mjs", ["--slug", targetSlug]);

  // ④ 法務
  console.log("[④] 法務");
  await runNode("legal-check.mjs", ["--slug", targetSlug, "--fix"]);

  await rescorePolicyMatrix(targetSlug);

  article = await loadArticle(targetSlug);
  const gate = await checkCasePageWithFiles(article);
  let policyMatrix = null;
  try {
    policyMatrix = JSON.parse(
      await readFile(path.join(root, article.stanceMatrix.dataPath), "utf8"),
    );
  } catch {
    /* */
  }
  const titleAnswer = assessTitleOpeningAnswer(article);

  if (titleAnswer.ok) {
    article.publishReady = true;
    if (!liveLock) {
      article.pageReady = false;
    }
    await saveArticleJson(article);
    await recordArticleActivity({
      slug: targetSlug,
      type: liveLock ? "content.updated" : "gate.ready",
      actor: "patrol",
      detail: liveLock
        ? "巡回でコンテンツ更新（公開は維持）"
        : "1行目がタイトルに回答済み。一般公開は手動のみ",
    });
    console.log(
      liveLock
        ? "\n✅ 公開維持のまま更新完了"
        : "\n✅ 1行目OK — 非公開プレビュー可。管理画面で「公開する」",
    );
  } else {
    console.log(`\n⚠️ 1行目がタイトルに未回答: ${titleAnswer.detail}`);
    if (titleAnswer.todo) console.log(`  → ${titleAnswer.todo}`);
    await saveArticleJson(article);
    await refreshProjectStatus();
    process.exit(2);
  }

  await refreshProjectStatus();
  await runNode("check-case-page.mjs", ["--slug", targetSlug]);
}

async function main() {
  if (allWip) {
    const ps = JSON.parse(await readFile(path.join(root, "data/project-status.json"), "utf8"));
    const targets = ps.slugs
      .filter((s) => !s.adminHidden && s.publishState !== "live")
      .map((s) => s.slug);
    console.log(`\n=== rewrite non-public: ${targets.length} 件 ===\n`);
    let ok = 0;
    let fail = 0;
    for (const s of targets) {
      try {
        await completeOneSlug(s);
        ok++;
      } catch (e) {
        fail++;
        console.error(`[FAIL] ${s}:`, e.message);
      }
    }
    await refreshProjectStatus();
    console.log(`\n完了: OK ${ok} / FAIL ${fail}`);
    if (fail > 0) process.exit(1);
    return;
  }
  await completeOneSlug(slug);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
