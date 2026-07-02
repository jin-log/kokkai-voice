/** Phase A: 国会議事録待ちの先行公開 UX */

export function countDietSpeeches(article) {
  const tl = article.timeline ?? [];
  return tl.filter(
    (e) =>
      e.type === "speech" &&
      e.speech?.speechURL?.includes("kokkai.ndl.go.jp"),
  ).length;
}

export function hasPrimaryDietSpeech(article) {
  return Boolean(article.primarySpeech?.speechURL?.includes("kokkai.ndl.go.jp"));
}

/** 国会原文が十分に揃った（通常表示） */
export function isDietDataComplete(article) {
  if (hasPrimaryDietSpeech(article) && countDietSpeeches(article) >= 1) {
    return true;
  }
  return countDietSpeeches(article) >= 3;
}

/** 「国会データが更新され次第掲載」UI を出す */
export function showsDietPendingUI(article) {
  if (isDietDataComplete(article)) return false;
  return article.dietPending === true;
}

/** 国会議事録（kokkai.ndl.go.jp）を根拠に含む案件 */
export function hasDietSourceContent(article) {
  if (hasPrimaryDietSpeech(article)) return true;
  return countDietSpeeches(article) >= 1;
}

const DIET_DISCLAIMER_RE = /国会議事録|国会で語られ|国会答弁|国会発言/;

/** disclaimer / plainExplanation が国会根拠を示すのに議事録が無い */
export function isDietDisclaimerMismatch(article) {
  if (hasDietSourceContent(article) || article.dietPending === true) {
    return false;
  }
  const texts = [
    article.nowSummary?.disclaimer,
    article.plainExplanation,
  ].filter(Boolean);
  return texts.some((t) => {
    const s = String(t);
    if (s.includes("国会議事録以外")) return false;
    return DIET_DISCLAIMER_RE.test(s);
  });
}

/** 公開ゲート緩和（国会なし先行公開） */
export function isPhaseAPublish(article) {
  return article.dietPending === true && !isDietDataComplete(article);
}

export function dietCheckedAtIso(article) {
  return (
    article.dietCheckedAt ||
    article.fetchedAt ||
    article.nowSummary?.updatedAt ||
    ""
  );
}

export function dietCheckedDateLabel(article) {
  const iso = dietCheckedAtIso(article);
  return iso ? iso.slice(0, 10) : "—";
}

export function dietPendingBadgeLabel(article) {
  if (!showsDietPendingUI(article)) return null;
  return "国会原文 追加予定";
}
