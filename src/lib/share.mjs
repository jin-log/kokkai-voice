import { SITE } from "./site-config.mjs";
import { articleShortTitle } from "./case-helpers.mjs";

/**
 * @param {import('./articles.mjs').Article} article
 */
export function buildSharePayload(article) {
  const slug = article.slug;
  const pageUrl = `${SITE.domain}/case/${slug}/`;
  const shortTitle = articleShortTitle(article);
  const hook =
    article.nowSummary?.bullets?.[0]?.replace(/\s+/g, " ").trim().slice(0, 80) ||
    article.primarySpeech?.excerpt?.slice(0, 80) ||
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
