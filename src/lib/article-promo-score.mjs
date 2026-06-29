/**
 * 日次X「3選」用 — 関心度・新しさスコア
 */
const INTEREST_TAGS = new Set([
  "政局",
  "経済",
  "物価",
  "防衛",
  "社会保障",
  "税制",
  "労働",
  "外交",
  "選挙",
  "行政",
]);

/** @param {import('./articles.mjs').Article} article */
export function promoScore(article, now = Date.now()) {
  let score = 0;

  const published = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
  if (published) {
    const hours = (now - published) / 3600000;
    if (hours <= 24) score += 100;
    else if (hours <= 48) score += 70;
    else if (hours <= 168) score += 40;
    else if (hours <= 720) score += 15;
  }

  const updated = article.nowSummary?.updatedAt
    ? new Date(article.nowSummary.updatedAt).getTime()
    : 0;
  if (updated && now - updated <= 48 * 3600000) score += 25;

  for (const tag of article.tags || []) {
    if (INTEREST_TAGS.has(tag)) score += 12;
  }
  if (INTEREST_TAGS.has(article.category)) score += 8;

  const heat =
    (article.reactions?.good ?? 0) +
    (article.reactions?.bad ?? 0) +
    (article.reactions?.neutral ?? 0) * 0.5;
  score += Math.min(heat * 2, 30);

  return score;
}

/** @param {import('./articles.mjs').Article[]} articles @param {Set<string>} recentlyFeatured */
export function pickTopForDigest(articles, recentlyFeatured, count = 3, now = Date.now()) {
  const ranked = articles
    .map((a) => ({
      article: a,
      score: promoScore(a, now) - (recentlyFeatured.has(a.slug) ? 50 : 0),
    }))
    .sort((x, y) => y.score - x.score);

  const picked = [];
  for (const { article, score } of ranked) {
    if (picked.length >= count) break;
    if (score < 10) continue;
    picked.push(article);
  }

  if (picked.length < count) {
    for (const { article } of ranked) {
      if (picked.length >= count) break;
      if (!picked.find((p) => p.slug === article.slug)) picked.push(article);
    }
  }

  return picked.slice(0, count);
}
