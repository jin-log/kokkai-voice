/**
 * タイムライン summaryPlain の品質ガード（議事録生文・話題外Xを弾く）
 */
import { isDietVoice, isSpeechFragment, normalizeFactPhrase } from "./diet-voice.mjs";
import { articleTopicTerms, textMatchesTopic } from "./topic-relevance.mjs";

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

/** X投稿が記事話題と一致するか（表示マージ含む） */
export function isXPostOnTopic(article, text) {
  return textMatchesTopic(String(text || ""), articleTopicTerms(article));
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
  const raw = normalizeFactPhrase(String(ev.summaryPlain || "").replace(/^[^—]+—\s*/, ""));
  const terms = articleTopicTerms(article);
  const sentences = raw
    .replace(/○[^\r\n（]+（[^）]+君）\s*/g, "")
    .split(/。/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 12 &&
        textMatchesTopic(s, terms) &&
        !/御質問|おかれましては|ありがとうございます|お答えします/.test(s),
    );

  let gist = "";
  if (/特定最低賃金/.test(raw)) gist = "特定最低賃金は労使の上乗せ選択肢として機能すると説明";
  else if (/地域別最低賃金|セーフティーネット/.test(raw)) gist = "地域別最低賃金のセーフティーネット機能は変わらないと説明";
  else if (/千五百円|1500円|骨太方針/.test(raw)) gist = "骨太方針の全国平均1500円目標を継続する方針を表明";
  else gist = sentences.find((s) => s.length <= 90) || "";
  if (!gist) gist = shorten(sentences[0] || raw, 80);
  if (/御質問|おかれましては/.test(gist) || isRawDietDump(gist)) {
    gist = /最低賃金/.test(raw) ? "最低賃金に関する政府方針を説明" : "本件に関する政府方針を説明";
  }

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
    if (!isXPostOnTopic(article, text)) return null;
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
function sanitizeXPostsArray(article) {
  const xPosts = (article.xPosts ?? []).filter((p) => {
    if (!p?.post_url) return false;
    return isXPostOnTopic(article, p.post_text || "");
  });
  return xPosts;
}

/** @param {object} article @param {{ markApplied?: boolean }} [opts] */
export function sanitizeArticleTimeline(article, opts = {}) {
  const timeline = (article.timeline ?? [])
    .map((ev) => sanitizeTimelineEntry(ev, article))
    .filter(Boolean);
  const xPosts = sanitizeXPostsArray(article);
  const next = { ...article, timeline, xPosts };
  if (opts.markApplied !== false) {
    next.editorialRulesAppliedAt = new Date().toISOString();
  }
  return next;
}
