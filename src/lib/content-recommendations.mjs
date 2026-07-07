import { articleShortTitle } from "./case-helpers.mjs";
import { resolveRelatedArticles } from "./internal-link-graph.mjs";
import { findHubForArticle, loadContentHubs } from "./content-hubs.mjs";

/** @typedef {{ slug: string, title: string, headline: string, kicker: string, stat: string, statLabel: string, href: string }} ReadCard */

const HEADLINE_TEMPLATES = [
  (t) => `${t}の全貌はこちら`,
  (t) => `続編：${t}`,
  (t) => `あわせて読む：${t}`,
  (t) => `背景から読む：${t}`,
];

function headlineFor(target, fromSlug, index = 0) {
  const short = articleShortTitle(target);
  const tpl = HEADLINE_TEMPLATES[index % HEADLINE_TEMPLATES.length];
  return tpl(short);
}

function scoreArticlePair(from, to, hub) {
  let score = 0;
  const fromTags = new Set(from.tags || []);
  for (const t of to.tags || []) {
    if (fromTags.has(t)) score += 14;
  }
  if (from.category && from.category === to.category) score += 10;
  if (hub?.articleSlugs.includes(to.slug)) score += 20;
  for (const kw of hub?.matchKeywords || []) {
    const blob = `${to.title} ${to.searchKeyword} ${(to.tags || []).join(" ")}`;
    if (blob.includes(kw)) score += 6;
  }
  const explicit = (from.relatedArticles || []).indexOf(to.slug);
  if (explicit >= 0) score += 30 - explicit * 3;
  return score;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 * @param {number} count
 * @param {Set<string>} [exclude]
 */
function autoRankArticles(article, allArticles, count, exclude = new Set()) {
  const hub = findHubForArticle(article.slug);
  exclude.add(article.slug);

  return allArticles
    .filter((a) => !exclude.has(a.slug) && a.pageReady && !a.adminHidden)
    .map((a) => ({ article: a, score: scoreArticlePair(article, a, hub) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.article.slug.localeCompare(b.article.slug))
    .slice(0, count);
}

/** @param {import('./articles.mjs').Article} target @param {{ headline?: string, kicker?: string }} [override] */
function toReadCard(target, fromSlug, index, override = {}) {
  const graphItem = resolveRelatedArticles({ slug: fromSlug, relatedArticles: [target.slug] }, [target], 1)[0];
  const short = articleShortTitle(target);
  const autoHeadline = graphItem?.kicker
    ? `${graphItem.kicker}：${short}`
    : headlineFor(target, fromSlug, index);
  return {
    slug: target.slug,
    title: short,
    headline: override.headline || autoHeadline,
    kicker: override.kicker || graphItem?.kicker || "",
    stat: graphItem?.stat || "",
    statLabel: graphItem?.statLabel || "",
    href: `/case/${target.slug}/`,
  };
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 * @param {number} [count]
 */
export function resolveNextReads(article, allArticles, count = 3) {
  const bySlug = new Map(allArticles.map((a) => [a.slug, a]));
  const override = Array.isArray(article.nextReads) ? article.nextReads : [];
  /** @type {ReadCard[]} */
  const out = [];
  const used = new Set([article.slug]);

  for (let i = 0; i < override.length && out.length < count; i++) {
    const row = override[i];
    const target = bySlug.get(row?.slug);
    if (!target || used.has(target.slug)) continue;
    used.add(target.slug);
    out.push(toReadCard(target, article.slug, i, row));
  }

  if (out.length >= count) return out.slice(0, count);

  for (const { article: a } of autoRankArticles(article, allArticles, count - out.length, used)) {
    used.add(a.slug);
    out.push(toReadCard(a, article.slug, out.length));
  }

  return out.slice(0, count);
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 */
export function resolveMidReads(article, allArticles) {
  const override = Array.isArray(article.midReads) ? article.midReads : [];
  const bySlug = new Map(allArticles.map((a) => [a.slug, a]));
  const nextSlugs = new Set((article.nextReads || []).map((r) => r.slug));
  /** @type {ReadCard[]} */
  const out = [];
  const used = new Set([article.slug, ...nextSlugs]);

  for (const row of override) {
    if (out.length >= 2) break;
    const target = bySlug.get(row?.slug);
    if (!target || used.has(target.slug)) continue;
    used.add(target.slug);
    out.push({
      ...toReadCard(target, article.slug, out.length, row),
      headline: row.headline || `この記事も読まれています：${articleShortTitle(target)}`,
    });
  }

  if (out.length >= 2) return out;

  for (const { article: a } of autoRankArticles(article, allArticles, 2 - out.length, used)) {
    out.push({
      ...toReadCard(a, article.slug, out.length),
      headline: `この記事も読まれています：${articleShortTitle(a)}`,
    });
  }

  return out.slice(0, 2);
}

/** @param {import('./articles.mjs').Article} article @param {import('./articles.mjs').Article[]} allArticles */
export function resolvePrerequisite(article, allArticles) {
  const manual = article.prerequisiteRead;
  const bySlug = new Map(allArticles.map((a) => [a.slug, a]));

  if (manual?.slug && bySlug.has(manual.slug)) {
    const target = bySlug.get(manual.slug);
    return {
      slug: target.slug,
      label: manual.label || "前提知識",
      headline: manual.headline || `先に読む：${articleShortTitle(target)}`,
      href: `/case/${target.slug}/`,
    };
  }

  const gloss = (article.glossary || []).find((g) => g.relatedSlug && bySlug.has(g.relatedSlug));
  if (gloss) {
    const target = bySlug.get(gloss.relatedSlug);
    return {
      slug: target.slug,
      label: "前提知識",
      headline: gloss.relatedTitle
        ? `先に読む：${gloss.relatedTitle}`
        : `「${gloss.term}」の背景：${articleShortTitle(target)}`,
      href: `/case/${target.slug}/`,
    };
  }

  const hub = findHubForArticle(article.slug);
  if (hub) {
    return {
      slug: hub.slug,
      label: "テーマまとめ",
      headline: `${hub.title}の全体像はこちら`,
      href: `/theme/${hub.slug}/`,
      isHub: true,
    };
  }

  return null;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 */
export function buildRecommendationBundle(article, allArticles) {
  const hub = findHubForArticle(article.slug);
  return {
    hub,
    hubHref: hub ? `/theme/${hub.slug}/` : null,
    prerequisite: resolvePrerequisite(article, allArticles),
    nextReads: resolveNextReads(article, allArticles, 3),
    midReads: resolveMidReads(article, allArticles),
    relatedItems: resolveRelatedArticles(article, allArticles, 3),
    hubs: loadContentHubs(),
  };
}
