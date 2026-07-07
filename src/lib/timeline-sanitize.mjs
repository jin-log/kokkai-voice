/**
 * タイムライン summaryPlain の品質ガード（議事録生文・話題外Xを弾く）
 */
import { isDietVoice, isSpeechFragment, normalizeFactPhrase } from "./diet-voice.mjs";
import { textMatchesTopic } from "./topic-relevance.mjs";

/** 議事録の生切り出し（○国務大臣…） */
export function isRawDietDump(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  if (/○[^\r\n（]+（[^）]+君）/.test(t)) return true;
  if (/御質問にお答え|御答弁申し上げ|塩川委員におかれましては/.test(t)) return true;
  if (t.length > 110 && !/「[^」]{8,}」/.test(t)) return true;
  if (isDietVoice(t) && t.length > 72) return true;
  if (isSpeechFragment(t)) return true;
  return false;
}

function shorten(text, max = 88) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function summarizeSpeechRow(ev, article) {
  const sp = ev.speech || {};
  const speaker = sp.speaker || "国会";
  const group = sp.speakerGroup ? `（${sp.speakerGroup}）` : "";
  const meeting = [sp.nameOfHouse, sp.nameOfMeeting].filter(Boolean).join("・");
  const where = meeting ? `${meeting}で` : "国会で";
  const kw = article?.searchKeyword || article?.title || "";

  const raw = normalizeFactPhrase(String(ev.summaryPlain || "").replace(/^[^—]+—\s*/, ""));
  const sentences = raw
    .replace(/○[^\r\n（]+（[^）]+君）\s*/g, "")
    .split(/。/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && textMatchesTopic(s, article));

  let gist = sentences.find((s) => s.length <= 90);
  if (!gist && /最低賃金|地域別最低賃金|特定最低賃金/.test(raw)) {
    if (/特定最低賃金/.test(raw)) gist = "特定最低賃金は労使の上乗せ選択肢として機能すると説明";
    else if (/セーフティーネット|地域別最低賃金/.test(raw)) gist = "地域別最低賃金のセーフティーネット機能は変わらないと説明";
    else if (/千五百円|1500円|骨太方針/.test(raw)) gist = "骨太方針の全国平均1500円目標を継続する方針を表明";
    else gist = shorten(sentences[0] || raw, 80);
  }
  if (!gist) gist = `${kw || "本件"}に関する政府見解を表明`;

  return `${speaker}${group}— ${where}「${gist.replace(/^「|」$/g, "")}」と答弁。`;
}

function summarizeXRow(ev, article) {
  const label = ev.xPost?.account_label || "X";
  const text = ev.xPost?.post_text || ev.summaryPlain || "";
  return `${label}— 「${shorten(text, 72)}」`;
}

/**
 * @param {object} ev
 * @param {object} article
 * @returns {object|null} null = 削除
 */
export function sanitizeTimelineEntry(ev, article) {
  if (!ev) return null;

  if (ev.type === "x_post") {
    const text = ev.xPost?.post_text || ev.summaryPlain || "";
    if (!textMatchesTopic(text, article) && !/賃上げ|最低賃金|時給/.test(text)) {
      return null;
    }
    if (isRawDietDump(ev.summaryPlain)) {
      return { ...ev, summaryPlain: summarizeXRow(ev, article) };
    }
    return ev;
  }

  if (ev.type === "speech") {
    if (isRawDietDump(ev.summaryPlain)) {
      return { ...ev, summaryPlain: summarizeSpeechRow(ev, article) };
    }
    return ev;
  }

  return ev;
}

/** @param {object} article */
export function sanitizeArticleTimeline(article) {
  const timeline = (article.timeline ?? [])
    .map((ev) => sanitizeTimelineEntry(ev, article))
    .filter(Boolean);
  return { ...article, timeline };
}
