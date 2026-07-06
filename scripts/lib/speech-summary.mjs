/**
 * 国会議事録 → 第三者目線の1〜2文要約（切り出し禁止）
 */
import { extractKeywordSpeechWindow } from "./kokkai-api.mjs";
import {
  normalizeFactPhrase,
  isDietVoice,
  isSpeechFragment,
  isIncompleteBullet,
} from "../../src/lib/diet-voice.mjs";
import {
  topicTerms,
  textStronglyMatchesTopic,
  isBoilerplateTopicLine,
} from "../../src/lib/topic-relevance.mjs";

const BAD_PATTERNS =
  /議事録要確認|判断材料になる|が高市内閣の政策方針を国会答弁|国会での方針・動き|法制化・法案審議の継続を表明|関連法案が可決・成立|関連法案の閣議決定を国会で説明|が国会で論じた|国会で答弁・質疑を行った|高市内閣が食料品消費税・減税策を国会答弁/;

const RAW_EXCERPT_START =
  /^(一方、|重ねて、|まず、|つて、|一般会計の|時間が限られ|発信者は|に該当しかねない|今、政治改革|平成三十一年|私の秘書)/;

/** 掲載不可の空文案・切り出し・システムメモ */
export function isBadSummaryLine(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 10) return true;
  if (BAD_PATTERNS.test(t)) return true;
  if (isBoilerplateTopicLine(t)) return true;
  if (/—\s*[^（]+（[^）]+・議事録要確認）/.test(t)) return true;
  const body = t.replace(/^\d{4}-\d{2}-\d{2}：/, "").replace(/^[^—]+—\s*/, "");
  if (RAW_EXCERPT_START.test(body)) return true;
  if (isDietVoice(body) || isSpeechFragment(body) || isIncompleteBullet(body)) return true;
  if (!/^\d{4}-\d{2}-\d{2}：/.test(t) && t.length > 96) return true;
  if (/が審議。?$/.test(t) && !/[０-９0-9]/.test(t)) return true;
  return false;
}

function splitSentences(text) {
  return String(text || "")
    .replace(/○[^\r\n（]+（[^）]+）\s*/g, "")
    .replace(/〔[^〕]+〕/g, "")
    .replace(/\r\n/g, "")
    .split(/。/)
    .map((s) => s.replace(/^[　\s]+/, "").trim())
    .filter((s) => s.length >= 8 && !/^はい$|^そうです/.test(s));
}

function extractTopicQuestion(speech) {
  const m = speech.match(
    /　([^　]{4,42})について(?:お尋ねがありました|お尋ねがございました|聞きます|伺います)/,
  );
  return m?.[1]?.trim() || "";
}

function extractNumbers(text, limit = 2) {
  const found = text.match(/\d[\d,\.]*(?:兆|億|万|％|%|円|人|件|倍|ポイント|世帯|年|カ月)/g);
  return found ? [...new Set(found.map((n) => n.replace(/,/g, "")))].slice(0, limit) : [];
}

function shorten(s, max = 52) {
  let t = normalizeFactPhrase(s)
    .replace(/^(私から|先ほど|この点|その上で|また、|さらに、|重ねて、|一方、|まず、|つて、)/, "")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const last = Math.max(cut.lastIndexOf("、"), cut.lastIndexOf("に"), cut.lastIndexOf("を"));
  return last > 18 ? `${cut.slice(0, last)}…` : `${cut}…`;
}

function describeAction(sentence) {
  if (/反対|慎重|懸念|批判|問題/.test(sentence)) return "懸念を表明";
  if (/賛成|支持|前向き|推進/.test(sentence)) return "推進を表明";
  if (/提出|発議/.test(sentence)) return "法案提出";
  if (/可決|成立/.test(sentence)) return "可決・成立";
  if (/答弁|説明|申し上げ|考えており|盛り込|実施/.test(sentence)) return "答弁";
  if (/質問|質疑|お尋ね|伺い/.test(sentence)) return "質疑";
  return "論点を表明";
}

function summarizeWindow(win, keyword, meta = {}) {
  if (!win || win.length < 20) return null;
  if (!textStronglyMatchesTopic(win, keyword)) return null;

  const terms = topicTerms(keyword);
  const sentences = splitSentences(win);
  const topicQ = extractTopicQuestion(win);
  const nums = extractNumbers(win);

  const qIdx = sentences.findIndex(
    (s) =>
      /御質問|お尋ね|質問|お伺い|伺い|聞きます/.test(s) &&
      !/お答え|答弁を|申し上げ/.test(s),
  );

  const scored = sentences.map((s, i) => {
    let score = 0;
    if (i > qIdx && qIdx >= 0) score += 10;
    for (const t of terms) {
      if (t.length >= 2 && s.includes(t)) score += t.length * 3;
    }
    if (/[０-９0-9]/.test(s)) score += 8;
    if (/答弁|方針|実施|盛り込|表明|反対|懸念|提出|可決|成立|制度|法案|予算|税制|改正/.test(s)) {
      score += 6;
    }
    if (/御質問|お尋ね|拍手|ございます$/.test(s)) score -= 5;
    if (s.length < 12 || s.length > 90) score -= 3;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const best = scored.find((x) => x.score > 4)?.s;
  const question =
    qIdx >= 0 ? sentences[qIdx] : topicQ ? `${topicQ}について質疑` : "";

  if (!best && !question) return null;

  const speaker = meta.speaker || "議員";
  const group = meta.speakerGroup ? `（${meta.speakerGroup}）` : "";
  const meeting = meta.nameOfMeeting || meta.meeting || "";

  let core = "";
  if (question && best) {
    const qShort =
      shorten(question.replace(/について.*/, ""), 28) || topicQ?.slice(0, 28) || "本件";
    const aShort = shorten(best, 50);
    core = `${qShort}について${describeAction(best)}—${aShort}`;
  } else if (best) {
    core = shorten(best, 64);
  } else {
    core = shorten(question, 64);
  }

  if (nums.length) core += `（${nums.join("・")}）`;
  if (!core.endsWith("。")) core += "。";

  const line = meeting
    ? `${speaker}${group}— ${meeting}で${core}`
    : `${speaker}${group}— ${core}`;

  if (isBadSummaryLine(line)) {
    const simple = shorten(best || question, 68);
    if (!simple || isBadSummaryLine(simple)) return null;
    return `${speaker}${group}— ${simple}。`;
  }
  return line;
}

/** 国会APIレコード全文から要約 */
export function summarizeSpeechRecord(record, keyword) {
  const speech = record.speech || "";
  if (!speech) return null;
  const win = extractKeywordSpeechWindow(speech, keyword, 1400);
  return summarizeWindow(win, keyword, {
    speaker: record.speaker,
    speakerGroup: record.speakerGroup,
    nameOfMeeting: record.nameOfMeeting,
    meeting: record.nameOfMeeting,
  });
}

/** excerpt / speechFull から要約 */
export function summarizeFromExcerpt(excerpt, keyword, meta = {}) {
  if (!excerpt) return null;
  const win = extractKeywordSpeechWindow(excerpt, keyword, 900) || excerpt;
  return summarizeWindow(win, keyword, meta);
}

export function formatDatedBullet(date, summaryPlain) {
  const body = String(summaryPlain || "").trim();
  if (!body || isBadSummaryLine(body)) return null;
  const clean = body.replace(/^\d{4}-\d{2}-\d{2}：/, "");
  return `${date}：${clean}`;
}

/** merits/demerits からシステムメモを除去 */
export function sanitizeMeritText(text) {
  let t = String(text || "")
    .replace(/。国会での方針・動きが読者の判断材料になる。?/g, "。")
    .replace(/。国会での動きとして論点が具体化している。?/g, "。")
    .replace(/。法案の行方を追いやすい。?/g, "。")
    .trim();
  if (!t.endsWith("。")) t += "。";
  return isBadSummaryLine(t) ? null : t;
}

/** nowSummary.bullets をタイムライン・primary から再構築 */
export function rebuildNowBullets(article) {
  const kw = article.searchKeyword || article.slug;
  const lines = [];
  const seen = new Set();

  const push = (line) => {
    const t = String(line || "").trim();
    if (!t || isBadSummaryLine(t)) return;
    const key = t.replace(/[、。…\s]/g, "").slice(0, 24);
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(t.endsWith("。") ? t : `${t}。`);
  };

  if (article.primarySpeech?.speechFull || article.primarySpeech?.excerpt) {
    const s = summarizeFromExcerpt(
      article.primarySpeech.speechFull || article.primarySpeech.excerpt,
      kw,
      article.primarySpeech,
    );
    if (s) {
      const body = s.replace(/^[^—]+—\s*/, "");
      push(body);
    }
  }

  for (const ev of (article.timeline || [])
    .filter((e) => e.type === "speech" && e.summaryPlain && !isBadSummaryLine(e.summaryPlain))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))) {
    const body = ev.summaryPlain.replace(/^[^—]+—\s*/, "");
    push(body);
    if (lines.length >= 3) break;
  }

  return lines.slice(0, 3);
}
