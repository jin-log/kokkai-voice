import { SITE } from "./site-config.mjs";
import { articleShortTitle, articleMetaDescription } from "./case-helpers.mjs";

/**
 * @param {import('./articles.mjs').Article} article
 */
export function buildSharePayload(article) {
  const slug = article.slug;
  const pageUrl = `${SITE.domain}/case/${slug}/`;
  const shortTitle = articleShortTitle(article);
  const hook =
    articleMetaDescription(article, 80).replace(/。$/, "") ||
    "";
  const tweetText = hook ? `${shortTitle}\n${hook}\n` : `${shortTitle}\n`;
  const params = new URLSearchParams({
    text: tweetText,
    url: pageUrl,
    related: "seiji1192site",
  });
  return {
    pageUrl,
    tweetText,
    xUrl: `https://twitter.com/intent/tweet?${params}`,
  };
}
