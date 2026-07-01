import { kokkaiKeywordCandidates } from "../../functions/lib/kokkai-keyword.js";
import { topicTerms } from "../../src/lib/topic-relevance.mjs";

const BASE = "https://kokkai.ndl.go.jp/api";

export { kokkaiKeywordCandidates };

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildUrl(endpoint, params) {
  const q = new URLSearchParams({ recordPacking: "json", ...params });
  return `${BASE}/${endpoint}?${q}`;
}

export async function fetchSpeech(params, { delayMs = 1200 } = {}) {
  const url = buildUrl("speech", params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  const data = await res.json();
  await sleep(delayMs);
  return data;
}

/**
 * 記事の searchKeywords またはフォールバック候補
 * @param {string | { searchKeyword?: string, searchKeywords?: string[] }} input
 */
export function resolveSearchKeywords(input) {
  if (Array.isArray(input)) return input.map((k) => String(k).trim()).filter((k) => k.length >= 2);
  if (input && typeof input === "object") {
    if (Array.isArray(input.searchKeywords) && input.searchKeywords.length) {
      return resolveSearchKeywords(input.searchKeywords);
    }
    return kokkaiKeywordCandidates(input.searchKeyword || "");
  }
  return kokkaiKeywordCandidates(String(input ?? ""));
}

/**
 * 複数キーワードを順に叩き speechID で重複除去してマージ
 * @param {string[]} keywords
 */
export async function fetchSpeechMerged(keywords, params, opts = {}) {
  const list = [...new Set(resolveSearchKeywords(keywords))];
  const seen = new Set();
  const merged = [];
  let apiHits = 0;
  let resolvedKeyword = list[0] || "";

  for (const kw of list) {
    const data = await fetchSpeech({ ...params, any: kw }, opts);
    const records = data.speechRecord ?? [];
    apiHits += parseInt(data.numberOfRecords ?? "0", 10);
    for (const r of records) {
      if (!r.speechID || seen.has(r.speechID)) continue;
      seen.add(r.speechID);
      merged.push(r);
    }
    if (pickSpeech(records, kw)) resolvedKeyword = kw;
  }

  return { data: {}, records: merged, apiHits, resolvedKeyword, tried: list };
}

/**
 * 記事オブジェクトまたは単一キーワードで国会API取得
 * @param {string | { searchKeyword?: string, searchKeywords?: string[] }} articleOrKeyword
 */
export async function fetchSpeechForArticle(articleOrKeyword, params, opts = {}) {
  const keywords = resolveSearchKeywords(articleOrKeyword);
  const primary =
    typeof articleOrKeyword === "object" && articleOrKeyword?.searchKeyword
      ? articleOrKeyword.searchKeyword
      : keywords[0] || "";

  if (keywords.length <= 1) {
    return fetchSpeechForKeyword(primary || keywords[0] || "", params, opts);
  }

  const merged = await fetchSpeechMerged(keywords, params, opts);
  merged.resolvedKeyword = primary;
  if (!pickSpeech(merged.records, primary)) {
    for (const kw of keywords) {
      if (pickSpeech(merged.records, kw)) {
        merged.resolvedKeyword = kw;
        break;
      }
    }
  }
  return merged;
}

/**
 * 0件キーワード（例: 国旗損壊罪法案）を短縮候補で再試行
 * @param {string} keyword
 * @param {Record<string, string|number>} params
 * @param {{ delayMs?: number }} [opts]
 */
export async function fetchSpeechForKeyword(keyword, params, opts = {}) {
  const candidates = kokkaiKeywordCandidates(keyword);
  /** @type {{ data: object; records: object[]; apiHits: number; resolvedKeyword: string; tried: string[] } | null} */
  let last = null;

  for (const kw of candidates) {
    const data = await fetchSpeech({ ...params, any: kw }, opts);
    const records = data.speechRecord ?? [];
    const apiHits = parseInt(data.numberOfRecords ?? "0", 10);
    const best = pickSpeech(records, kw);
    const pack = { data, records, apiHits, resolvedKeyword: kw, tried: candidates };
    if (apiHits > 0 && best) return pack;
    last = pack;
  }

  return last ?? { data: {}, records: [], apiHits: 0, resolvedKeyword: keyword, tried: candidates };
}

/** 発言本文から冒頭の挨拶・呼びかけを軽く除去 */
export function stripSpeechPrefix(text) {
  if (!text) return "";
  return text
    .replace(/^[^\n]{0,40}君[　\s]/, "")
    .replace(/^[^\n]{0,60}(でございます|です|ます)[。．\n]/, "")
    .trim();
}

/** 長い答弁を「お尋ねがありました」単位で分割し、話題ブロックだけ返す */
function extractTopicQABlock(speech, terms) {
  if (!speech) return "";
  const blocks = speech.split(
    /(?=　[^　\n]{3,42}について(?:お尋ねがありました|聞きます|伺います))/,
  );
  let best = "";
  let bestScore = -1;
  for (const block of blocks) {
    if (!block.trim()) continue;
    let score = 0;
    for (const t of terms) {
      if (t.length < 2) continue;
      if (block.includes(t)) score += t.length * 12 + (block.split(t).length - 1) * 8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = block.trim();
    }
  }
  return bestScore > 0 ? best : "";
}

/** キーワード周辺の段落だけを要約ソースにする（長い総理答弁など） */
export function extractKeywordSpeechWindow(speech, keyword, windowSize = 900) {
  if (!speech || !keyword) return speech || "";
  const terms = (Array.isArray(keyword) ? keyword : keywordTerms(keyword))
    .flatMap((k) => keywordTerms(k))
    .filter((t, i, a) => a.indexOf(t) === i)
    .sort((a, b) => b.length - a.length);

  if (speech.length > 1200) {
    const block = extractTopicQABlock(speech, terms);
    if (block && block.length >= 40) {
      return block.length <= windowSize ? block : block.slice(0, windowSize).trim();
    }
  }

  let anchor = -1;
  for (const term of terms) {
    const idx = speech.indexOf(term);
    if (idx >= 0) {
      anchor = idx;
      break;
    }
  }
  if (anchor < 0) return speech;
  const start = Math.max(0, anchor - 40);
  let end = Math.min(speech.length, anchor + windowSize);
  const tail = speech.slice(anchor);
  const nextTopic = tail.search(
    /　[^　]{3,42}について(?:お尋ねがありました|聞きます|伺います)/,
  );
  if (nextTopic > 80 && nextTopic < windowSize) end = anchor + nextTopic;
  const tail2 = speech.slice(anchor, end);
  const nextTopic2 = tail2.slice(80).search(
    /　いわゆる|　外国人及び|　消費税の|　国民会議|　生徒の|　学校教育|　多様性に対する|　ウクライナ|　中東情勢|　旧氏使用|　成年後見|　子育て支援/,
  );
  if (nextTopic2 > 40) end = anchor + 80 + nextTopic2;
  return speech.slice(start, end).trim();
}

/** 話題ウィンドウから抜粋（冒頭切り取り禁止） */
export function topicSpeechExcerpt(speech, keyword, maxLen = 120) {
  const win = extractKeywordSpeechWindow(speech, keyword);
  return excerptSpeech(win || speech, maxLen);
}

/** 話題ウィンドウ内のキーワード出現でスコア（長い答弁の誤採用を防ぐ） */
export function scoreSpeechTopicRelevance(record, keyword) {
  if (!isUsableSpeech(record)) return -9999;
  const terms = topicTerms(keyword);
  const win = extractKeywordSpeechWindow(record.speech || "", terms);
  if (!win || win.length < 20) return -100;
  let hits = 0;
  for (const t of terms) {
    if (t.length < 2) continue;
    hits += (win.split(t).length - 1);
  }
  if (hits === 0) return -50;
  return hits * 20 + Math.min(win.length / 40, 15) + scoreSpeechRelevance(record, keyword) * 0.15;
}

/** 原文のみから抜粋（AI生成なし・数値捏造なし） */
export function excerptSpeech(text, maxLen = 280) {
  const body = stripSpeechPrefix(text).replace(/\s+/g, " ");
  if (body.length <= maxLen) return body;
  const cut = body.slice(0, maxLen);
  const last = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("、"));
  return (last > 80 ? cut.slice(0, last + 1) : cut) + "…";
}

const METADATA_SPEAKERS = new Set(["会議録情報"]);

function isRollCall(speech) {
  const flat = speech.replace(/[\s\r\n　]/g, "");
  return flat.includes("出席委員") && flat.includes("開議");
}

function isUsableSpeech(r) {
  return (
    r.speech &&
    !METADATA_SPEAKERS.has(r.speaker) &&
    !isRollCall(r.speech)
  );
}

const PROCEDURAL_PATTERNS = [
  /出席委員/,
  /議事日程/,
  /採決いたしまして/,
  /本会議の所要/,
  /御異議ありませんか/,
  /緊急上程の申出があります/,
  /討論通告/,
  /〔「異議なし」/,
  /委員長　これより会議を開きます/,
];

function isProceduralSpeech(speech) {
  return PROCEDURAL_PATTERNS.some((re) => re.test(speech));
}

function keywordTerms(keyword) {
  return (keyword || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** キーワードとの関連度で発言をスコアリング */
export function scoreSpeechRelevance(record, keyword) {
  if (!isUsableSpeech(record)) return -9999;
  const speech = record.speech || "";
  if (isProceduralSpeech(speech)) return -5000;

  const terms = keywordTerms(keyword);
  let score = 0;

  for (const term of terms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (speech.match(re) || []).length;
    score += count * 12;
  }

  const early = speech.slice(0, 600);
  const earlyHits = terms.reduce((n, t) => n + (early.includes(t) ? 1 : 0), 0);
  if (terms.length > 0 && earlyHits === 0) score *= 0.35;

  const late = speech.slice(Math.floor(speech.length * 0.6));
  const earlyPart = speech.slice(0, Math.floor(speech.length * 0.35));
  const onlyLate = terms.some((t) => late.includes(t)) && !terms.some((t) => earlyPart.includes(t));
  if (onlyLate) score *= 0.2;

  const density = score / Math.max(speech.length / 200, 1);
  score += density;

  if (record.speakerGroup) score += 4;
  if (speech.length > 400) score += 2;
  if (speech.length > 1200) score += 3;
  if (speech.length < 280) score *= 0.45;

  const meeting = record.nameOfMeeting || "";
  for (const term of terms) {
    if (meeting.includes(term)) score += 8;
  }

  return score;
}

/** 要約に使える発言を選ぶ（キーワード周辺の文脈量で判定） */
export function pickSpeechForSummary(records, keyword) {
  if (!records?.length) return null;
  const terms = topicTerms(keyword);
  let best = null;
  let bestHits = -1;
  let bestScore = -Infinity;

  for (const r of records) {
    if (!isUsableSpeech(r)) continue;
    const win = extractKeywordSpeechWindow(r.speech, terms);
    const hits = terms.reduce((n, t) => n + Math.max(0, win.split(t).length - 1), 0);
    if (hits === 0) continue;
    const score = scoreSpeechRelevance(r, keyword);
    if (hits > bestHits || (hits === bestHits && score > bestScore)) {
      bestHits = hits;
      bestScore = score;
      best = r;
    }
  }

  return best || pickSpeech(records, keyword);
}

export function pickSpeech(records, keyword) {
  if (!records?.length) return null;
  if (keyword) {
    const ranked = records
      .filter((r) => isUsableSpeech(r))
      .map((r) => ({ r, score: scoreSpeechRelevance(r, keyword) }))
      .filter((x) => x.score > 5)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) < 18) {
          const density = (x) => x.score / Math.max(x.r.speech?.length || 1, 1);
          return density(b) - density(a);
        }
        return scoreDiff;
      });
    if (ranked[0]) return ranked[0].r;
  }
  return (
    records.find((r) => isUsableSpeech(r) && r.speech.length > 120) ||
    records.find((r) => isUsableSpeech(r) && r.speech.length > 80) ||
    records.find((r) => isUsableSpeech(r)) ||
    records[0]
  );
}

export function pickSpeechByKeyword(records, keywords) {
  const list = Array.isArray(keywords) ? keywords : [keywords];
  let best = null;
  let bestScore = -Infinity;
  for (const kw of list) {
    const candidate = pickSpeech(records, kw);
    if (!candidate) continue;
    const score = scoreSpeechRelevance(candidate, kw);
    if (score > bestScore) {
      bestScore = score;
      best = { speech: candidate, keyword: kw, score };
    }
  }
  return best;
}
