/** タイムライン summaryPlain サニタイズ（Functions — src/lib/timeline-sanitize.mjs と同期） */

const RAW_DIET_DUMP_RE =
  /○[^\r\n（]+（[^）]+君）|御質問にお答え|御答弁申し上げ|塩川委員におかれましては/;

const DIET_VOICE =
  /お尋ねがありました|ございました|ございます|であります|いたします|おります|御質問|御答弁/;

const TOPIC_ALIASES = {
  賃金: ["最低賃金", "賃上げ", "実質賃金", "春闘"],
  最低賃金: ["賃上げ", "時給", "地域別最低賃金", "審議会"],
  "最低賃金 2026 全国平均": ["最低賃金", "賃上げ", "時給", "全国平均"],
};

function topicTerms(keyword) {
  const base = String(keyword || "").trim();
  const parts = base.split(/[\s　]+/).filter((p) => p.length >= 2);
  const aliases = TOPIC_ALIASES[base] || [];
  return [...new Set([base, ...parts, ...aliases])].filter(Boolean);
}

function articleTopicTerms(article) {
  const base = topicTerms(article?.searchKeyword);
  const extras = (article?.searchKeywords || []).flatMap((k) => topicTerms(k));
  return [...new Set([...base, ...extras])].filter(Boolean);
}

function textMatchesTopic(text, terms) {
  const t = String(text || "");
  return terms.some((term) => term.length >= 2 && t.includes(term));
}

export function isXPostOnTopic(article, text) {
  return textMatchesTopic(text, articleTopicTerms(article));
}

export function isRawDietDump(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  if (RAW_DIET_DUMP_RE.test(t)) return true;
  if (t.length > 110 && !/「[^」]{8,}」/.test(t)) return true;
  if (DIET_VOICE.test(t) && t.length > 72) return true;
  return false;
}

function shorten(text, max = 88) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function summarizeSpeech(ev, article) {
  const sp = ev?.speech || {};
  const speaker = sp.speaker || "国会";
  const group = sp.speakerGroup ? `（${sp.speakerGroup}）` : "";
  const meeting = [sp.nameOfHouse, sp.nameOfMeeting].filter(Boolean).join("・");
  const where = meeting ? `${meeting}で` : "国会で";
  const raw = String(ev?.summaryPlain || "").replace(/^[^—]+—\s*/, "");

  let gist = "";
  if (/特定最低賃金/.test(raw)) gist = "特定最低賃金は労使の上乗せ選択肢として機能すると説明";
  else if (/地域別最低賃金|セーフティーネット/.test(raw)) gist = "地域別最低賃金のセーフティーネット機能は変わらないと説明";
  else if (/千五百円|1500円|骨太方針/.test(raw)) gist = "骨太方針の全国平均1500円目標を継続する方針を表明";
  else {
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
    gist = sentences.find((s) => s.length <= 90) || shorten(sentences[0] || raw, 80);
  }
  if (/御質問|おかれましては/.test(gist) || isRawDietDump(gist)) {
    gist = /最低賃金/.test(raw) ? "最低賃金に関する政府方針を説明" : "本件に関する政府方針を説明";
  }

  return `${speaker}${group}— ${where}「${gist.replace(/^「|」$/g, "")}」と答弁。`;
}

export function sanitizeTimelineArticle(article, opts = {}) {
  const next = JSON.parse(JSON.stringify(article));
  next.timeline = (next.timeline || [])
    .map((ev) => {
      if (ev.type === "x_post") {
        const text = ev.xPost?.post_text || ev.summaryPlain || "";
        if (!isXPostOnTopic(article, text)) return null;
        return ev;
      }
      if (ev.type === "speech" && isRawDietDump(ev.summaryPlain)) {
        return { ...ev, summaryPlain: summarizeSpeech(ev, article) };
      }
      return ev;
    })
    .filter(Boolean);
  next.xPosts = (next.xPosts || []).filter((p) => {
    if (!p?.post_url) return false;
    return isXPostOnTopic(article, p.post_text || "");
  });
  if (opts.markApplied !== false) {
    next.editorialRulesAppliedAt = new Date().toISOString();
  }
  return next;
}

export function formatTimelineReviseText(article) {
  return (article.timeline ?? [])
    .map((row) => {
      const kind = row.type === "x_post" ? "x_post" : row.type === "speech" ? "国会" : row.type || "?";
      return `${row.date} [${kind}] ${row.summaryPlain || ""}`;
    })
    .join("\n");
}
