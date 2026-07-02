import { getGlossary } from "./case-helpers.mjs";

/**
 * @param {import('./articles.mjs').Article} article
 */
export function getTermCaseLinks(article) {
  return getGlossary(article)
    .filter((g) => g.relatedSlug)
    .map((g) => ({
      terms: [g.term, ...(g.aliases || [])].filter(Boolean),
      matchTerm: g.term,
      title: g.relatedTitle || g.term,
      kicker: g.relatedKicker || (g.definition || "").split("。")[0] || "",
      stat: g.relatedStat || "",
      statLabel: g.relatedStatLabel || "",
      href: `/case/${g.relatedSlug}/`,
    }));
}

/**
 * @param {string} text
 * @param {ReturnType<typeof getTermCaseLinks>} links
 * @param {Set<string>} usedTerms
 * @returns {({ type: 'text', value: string } | { type: 'link', value: string, link: object })[]}
 */
export function splitTextWithTermLinks(text, links, usedTerms = new Set()) {
  if (!text || !links.length) return [{ type: "text", value: text || "" }];

  let best = null;
  for (const link of links) {
    if (usedTerms.has(link.matchTerm)) continue;
    for (const term of link.terms) {
      const index = text.indexOf(term);
      if (index === -1) continue;
      if (!best || index < best.index || (index === best.index && term.length > best.term.length)) {
        best = { index, term, link: { ...link, displayTerm: term } };
      }
    }
  }

  if (!best) return [{ type: "text", value: text }];

  usedTerms.add(best.link.matchTerm);
  const before = text.slice(0, best.index);
  const after = text.slice(best.index + best.term.length);

  return [
    ...(before ? [{ type: "text", value: before }] : []),
    { type: "link", value: best.term, link: best.link },
    ...splitTextWithTermLinks(after, links, usedTerms),
  ];
}
