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
