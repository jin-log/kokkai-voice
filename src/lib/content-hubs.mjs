import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articleShortTitle } from "./case-helpers.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @typedef {{ id: string, slug: string, title: string, tagline: string, intro: string, matchTags: string[], matchKeywords: string[], articleSlugs: string[] }} ContentHub */

let _cache = null;

export function loadContentHubs() {
  if (_cache) return _cache;
  const raw = JSON.parse(readFileSync(path.join(root, "data/content-hubs.json"), "utf8"));
  _cache = raw.hubs ?? [];
  return _cache;
}

/** @param {string} articleSlug */
export function findHubForArticle(articleSlug) {
  return loadContentHubs().find((h) => h.articleSlugs.includes(articleSlug)) ?? null;
}

/** @param {string} hubSlug */
export function getHubBySlug(hubSlug) {
  return loadContentHubs().find((h) => h.slug === hubSlug) ?? null;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {ContentHub} hub
 */
export function hubArticlesFor(article, hub, allArticles) {
  const bySlug = new Map(allArticles.map((a) => [a.slug, a]));
  return hub.articleSlugs
    .filter((slug) => slug !== article.slug)
    .map((slug) => bySlug.get(slug))
    .filter(Boolean);
}

/** @param {import('./articles.mjs').Article} article @param {ContentHub|null} hub */
export function hubMicrocopy(hub) {
  if (!hub) return "";
  return `${hub.title}のテーマ一覧 →`;
}
