/**
 * 一般記事（国会以外）のソース取得・要約
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { AI_DISCLAIMER } from "./article-summary.mjs";
import {
  discoverSourceUrls as discoverUrls,
  pickReadableSources,
} from "../../functions/lib/article-prepare.js";

const JINA_HEADERS = {
  Accept: "text/plain",
  "User-Agent": "kokkai-voice-complete/1.0",
};

export async function fetchReadable(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, { headers: JINA_HEADERS });
  if (!res.ok) return null;
  const text = await res.text();
  return text.slice(0, 8000);
}

/** @returns {Promise<string[]>} */
export async function discoverSourceUrls(keyword, limit = 4) {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  return discoverUrls(keyword, { tavilyApiKey, limit });
}

function firstParagraph(md) {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("!") || line.startsWith("[")) continue;
    if (line.length < 20) continue;
    return line.replace(/\s+/g, " ").slice(0, 180);
  }
  return null;
}

function guessDate(md, url) {
  const m = md.match(/(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const u = url.match(/(20\d{2})(\d{2})(\d{2})/);
  if (u) return `${u[1]}-${u[2]}-${u[3]}`;
  return new Date().toISOString().slice(0, 10);
}

function titleFromMd(md, fallback) {
  const h1 = md.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim().slice(0, 80) : fallback;
}

/** 手動完成済みか（再エンリッチで上書きしない） */
export function isGeneralContentReady(article) {
  const tl = article.timeline ?? [];
  const linked = tl.filter((e) => e.sourceUrl || e.speech?.speechURL);
  const bullets = article.nowSummary?.bullets ?? [];
  const sb = article.summaryBullets ?? [];
  if (
    bullets.some((b) =>
      /ソースURL|追加してください|整理中|順次整理|整理します|登録済み/.test(String(b)),
    )
  ) {
    return false;
  }
  if (sb.length < 3) return false;
  const arc = article.arcSummary ?? [];
  if (arc.filter((x) => x.date && x.text).length < 3) return false;
  return linked.length >= 3 && bullets.length >= 3;
}

/** @param {Record<string, unknown>} article */
export async function enrichGeneralArticle(article, root) {
  const keyword = article.searchKeyword || article.title || "";
  let sourceUrls = [...(article.sourceUrls ?? [])];

  if (sourceUrls.length < 2) {
    const found = await discoverUrls(keyword, {
      limit: 8,
      title: article.title,
    });
    sourceUrls = [...new Set([...sourceUrls, ...found])].slice(0, 8);
  }

  if (sourceUrls.length >= 2) {
    const readable = await pickReadableSources(sourceUrls, 5);
    if (readable.length >= 2) {
      sourceUrls = readable;
    }
  }

  /** @type {{ url: string, md: string, date: string, snippet: string, title: string }[]} */
  const sources = [];
  for (const url of sourceUrls) {
    const md = await fetchReadable(url);
    if (!md) continue;
    sources.push({
      url,
      md,
      date: guessDate(md, url),
      snippet: firstParagraph(md) || titleFromMd(md, keyword),
      title: titleFromMd(md, url),
    });
    await sleep(800);
  }

  if (sources.length === 0) {
    throw new Error(
      "報道ソースを自動取得できませんでした。しばらく待ってから管理画面で再生成してください。",
    );
  }

  sources.sort((a, b) => b.date.localeCompare(a.date));

  const arcSummary = sources.slice(0, 5).map((s) => ({
    date: s.date,
    text: s.snippet,
  }));

  const timeline = sources.slice(0, 5).map((s, i) => ({
    id: `${article.slug}-src-${i}`,
    type: "source",
    date: s.date,
    summaryPlain: s.snippet,
    sourceUrl: s.url,
  }));

  const primary = sources[0];
  article.sourceUrls = sourceUrls;
  article.arcSummary = arcSummary;
  article.timeline = timeline;
  article.primarySpeech = {
    ...(article.primarySpeech ?? {}),
    date: primary.date,
    nameOfHouse: article.category || "公開ソース",
    nameOfMeeting: "報道・公開情報",
    speechURL: primary.url,
    meetingURL: sources[1]?.url ?? null,
    excerpt: primary.snippet,
    speechFull: null,
  };

  article.nowSummary = {
    label: "いまの結論",
    bullets: [
      arcSummary[0]?.text ?? `${keyword}について報道・公開情報を整理中`,
      arcSummary[1]?.text ?? `出典 ${sources.length} 件を登録`,
      `${sources[0].date} 時点の公開情報に基づく整理（最新の司法判断・選挙結果は各出典を確認）`,
    ].slice(0, 3),
    disclaimer: `${AI_DISCLAIMER} 国会議事録以外の案件です。正本は各出典リンクをご確認ください。`,
    updatedAt: new Date().toISOString(),
  };

  article.summaryBullets = arcSummary.slice(0, 3).map((a) => `${a.date}：${a.text}`);
  article.plainExplanation = `${keyword}について、公開されている報道・声明を時系列で整理しています。\n\n${sources.map((s) => `・${s.date}：${s.snippet}`).join("\n")}\n\nここでの要約は出典の見出し・リード文を平易に並べたものです。事実認定や有罪・無罪の判断はしていません。`;

  const kw = keyword.split(/[\s　]+/).filter(Boolean);
  article.glossary = [
    { term: kw[0] || "争点", definition: "この記事で追っているテーマの核心" },
    { term: "公選法", definition: "選挙の公正を守る法律。虚偽の経歴記載などが問題になることがある" },
  ].slice(0, 4);
  const { mergeInternalLinks } = await import("../../src/lib/internal-link-graph.mjs");
  mergeInternalLinks(article);

  article.fetchedAt = new Date().toISOString();
  return article;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function writePolicyMatrixGeneral(article, root, sources) {
  const slug = article.slug;
  const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
  const parties =
    sources.length >= 2
      ? [
          {
            partyLabel: "当事者・公表側",
            stance: {
              text: sources[0].snippet,
              sourceUrl: sources[0].url,
              sourceType: "報道",
              capturedAt: new Date().toISOString().slice(0, 10),
            },
            action: {
              text: "公開情報・報道に基づく立場（詳細は出典参照）",
              speechUrl: sources[0].url,
              capturedAt: new Date().toISOString().slice(0, 10),
            },
            symbol: "▲",
            symbolReason: "自動生成（報道ベース）。内容確認後に更新推奨",
          },
          {
            partyLabel: "当事者・追及側",
            stance: {
              text: sources[1].snippet,
              sourceUrl: sources[1].url,
              sourceType: "報道",
              capturedAt: new Date().toISOString().slice(0, 10),
            },
            action: {
              text: "公開情報・報道に基づく立場（詳細は出典参照）",
              speechUrl: sources[1].url,
              capturedAt: new Date().toISOString().slice(0, 10),
            },
            symbol: "▲",
            symbolReason: "自動生成（報道ベース）。内容確認後に更新推奨",
          },
        ]
      : [];

  if (parties.length < 2) return false;

  const matrix = {
    policySlug: slug,
    policyLabel: article.title?.replace(/ — あの話どうなった？$/, "") ?? slug,
    relatedArticleSlug: slug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v1-auto",
    disclaimer: "自動生成の整理表です。党・個人の公式評価ではありません。",
    excerpt: { parties: "報道ソースから自動選定（2件）", politicians: "" },
    parties,
  };

  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  article.stanceMatrix = {
    policySlug: slug,
    dataPath: `data/policy-matrix/${slug}.json`,
    disclaimer: "出典付きの事実整理です（自動生成）。",
  };
  return true;
}
