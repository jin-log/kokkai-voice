import { articleShortTitle } from "./case-helpers.mjs";

/**
 * 同タグ・同カテゴリで関連記事を最大 n 件（タイトル表示用）
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 * @param {number} [count]
 */
export function pickRelatedArticles(article, allArticles, count = 3) {
  const tags = new Set(article.tags || []);
  const ranked = allArticles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      let score = 0;
      for (const t of a.tags || []) {
        if (tags.has(t)) score += 12;
      }
      if (a.category && a.category === article.category) score += 8;
      if (a.publishedAt) {
        const hours = (Date.now() - new Date(a.publishedAt).getTime()) / 3600000;
        if (hours <= 168) score += 6;
      }
      return { article: a, score };
    })
    .sort((x, y) => y.score - x.score || x.article.slug.localeCompare(y.article.slug));

  const picked = [];
  for (const { article: a, score } of ranked) {
    if (picked.length >= count) break;
    if (score > 0 || picked.length < count) picked.push(a);
  }

  return picked.slice(0, count).map((a) => ({
    slug: a.slug,
    title: articleShortTitle(a),
  }));
}
