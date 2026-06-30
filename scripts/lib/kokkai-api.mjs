import { kokkaiKeywordCandidates } from "../../functions/lib/kokkai-keyword.js";

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
          return b.r.speech.length - a.r.speech.length;
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
