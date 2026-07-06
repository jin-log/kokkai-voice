import { articleShortTitle } from "./case-helpers.mjs";

/** @typedef {{ term: string, aliases?: string[], definition?: string, relatedSlug: string, relatedTitle?: string, relatedKicker?: string, relatedStat?: string, relatedStatLabel?: string }} GlossaryLink */

/** @typedef {{ glossaryLinks?: GlossaryLink[], relatedArticles?: string[] }} ArticleLinkConfig */

/** @type {Record<string, ArticleLinkConfig>} */
export const INTERNAL_LINK_GRAPH = {
  "fuhou-immin-trend": {
    glossaryLinks: [
      {
        term: "在留外国人数",
        aliases: ["在留外国人"],
        definition: "合法在留の総数。不法残留者数とは別の統計系列。",
        relatedSlug: "gaikokujin-seisaku",
        relatedTitle: "外国人政策の動向",
        relatedKicker: "不法残留とは別系列",
        relatedStat: "400万人超",
        relatedStatLabel: "2025年",
      },
      {
        term: "不法残留",
        aliases: ["不法残留者", "不法滞在"],
        definition: "在留期限を過ぎたまま国内にいる人数。在留外国人数とは別集計。",
        relatedSlug: "gaikokujin-seisaku",
        relatedTitle: "外国人政策の動向",
        relatedKicker: "在留外国人総数とは別",
        relatedStat: "約6.8万人",
        relatedStatLabel: "2025年7月",
      },
    ],
    relatedArticles: ["gaikokujin-seisaku"],
  },
  "gaikokujin-seisaku": {
    glossaryLinks: [
      {
        term: "不法就労",
        aliases: ["不法滞在", "不法残留"],
        definition: "在留資格を超えた就労や期限超過の残留。在留外国人数とは別の論点。",
        relatedSlug: "fuhou-immin-trend",
        relatedTitle: "不法滞在の動向",
        relatedKicker: "残留者数の推移",
        relatedStat: "2年連続減",
        relatedStatLabel: "2025年",
      },
    ],
    relatedArticles: ["fuhou-immin-trend", "senkyo-kaikaku"],
  },
  "shussho-budget-seika": {
    glossaryLinks: [
      {
        term: "少子化",
        aliases: ["少子化対策"],
        definition: "出生数の減少とそれに対する政策全体。",
        relatedSlug: "shoshika",
        relatedTitle: "少子化対策と出生率",
        relatedKicker: "国会での支援策議論",
        relatedStat: "1.14",
        relatedStatLabel: "2025年出生率",
      },
      {
        term: "無償化",
        aliases: ["大学無償化", "高校無償化"],
        definition: "授業料等の負担軽減。対象者と財源が争点。",
        relatedSlug: "kyoiku-mushoka",
        relatedTitle: "大学無償化の争点",
        relatedKicker: "対象・財源の国会論戦",
        relatedStat: "所得要件",
        relatedStatLabel: "争点",
      },
      {
        term: "定額給付",
        aliases: ["定額給付金"],
        definition: "世帯単位の一律給付。子育て支援とセットで議論されることがある。",
        relatedSlug: "teigaku-kyufu-2024",
        relatedTitle: "2024年定額給付3万円",
        relatedKicker: "支給対象と手続き",
        relatedStat: "3万円",
        relatedStatLabel: "2024年",
      },
    ],
    relatedArticles: ["shoshika", "kyoiku-mushoka", "teigaku-kyufu-2024"],
  },
  shoshika: {
    glossaryLinks: [
      {
        term: "出生率",
        aliases: ["合計特殊出生率"],
        definition: "1人の女性が生涯に産む子どもの数の推計。",
        relatedSlug: "shussho-budget-seika",
        relatedTitle: "出生率・子育て支援",
        relatedKicker: "予算と加速化プラン",
        relatedStat: "3.6兆円",
        relatedStatLabel: "加速化プラン",
      },
    ],
    relatedArticles: ["shussho-budget-seika", "kyoiku-mushoka"],
  },
  "kyoiku-mushoka": {
    glossaryLinks: [
      {
        term: "子育て支援",
        aliases: ["子ども・子育て支援"],
        definition: "教育費軽減とあわせて議論される家族支援の柱。",
        relatedSlug: "shussho-budget-seika",
        relatedTitle: "出生率・子育て支援",
        relatedKicker: "加速化プランの全体像",
        relatedStat: "3.6兆円",
        relatedStatLabel: "規模",
      },
    ],
    relatedArticles: ["shussho-budget-seika", "shoshika"],
  },
  "teigaku-kyufu-2024": {
    glossaryLinks: [
      {
        term: "子育て支援",
        aliases: ["子ども・子育て支援"],
        definition: "給付とセットで議論される家族支援政策。",
        relatedSlug: "shussho-budget-seika",
        relatedTitle: "出生率・子育て支援",
        relatedKicker: "中長期の予算枠",
        relatedStat: "3.6兆円",
        relatedStatLabel: "加速化プラン",
      },
    ],
    relatedArticles: ["shussho-budget-seika", "shohizei-genmen"],
  },
};

const LINK_FIELDS = [
  "relatedSlug",
  "relatedTitle",
  "relatedKicker",
  "relatedStat",
  "relatedStatLabel",
  "aliases",
];

/**
 * @param {Record<string, unknown>} target
 * @param {GlossaryLink} link
 */
function applyLinkFields(target, link) {
  for (const key of LINK_FIELDS) {
    if (link[key] != null && link[key] !== "") target[key] = link[key];
  }
  if (link.definition && !target.definition) target.definition = link.definition;
}

/**
 * glossary に内部リンク定義をマージ（patrol 上書き後も再適用可）
 * @param {import('./articles.mjs').Article} article
 * @returns {import('./articles.mjs').Article}
 */
export function mergeInternalLinks(article) {
  const config = INTERNAL_LINK_GRAPH[article.slug];
  if (!config) return article;

  const glossary = [...(article.glossary || [])];

  for (const link of config.glossaryLinks || []) {
    const idx = glossary.findIndex((g) => g.term === link.term);
    if (idx >= 0) {
      applyLinkFields(glossary[idx], link);
    } else {
      glossary.push({
        term: link.term,
        definition: link.definition || "",
        ...Object.fromEntries(LINK_FIELDS.filter((k) => link[k] != null).map((k) => [k, link[k]])),
      });
    }
  }

  article.glossary = glossary;
  if (config.relatedArticles?.length) {
    article.relatedArticles = config.relatedArticles;
  }
  return article;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {import('./articles.mjs').Article[]} allArticles
 * @param {number} [count]
 */
export function resolveRelatedArticles(article, allArticles, count = 3) {
  const bySlug = new Map(allArticles.map((a) => [a.slug, a]));
  const explicit = (article.relatedArticles || [])
    .map((slug) => bySlug.get(slug))
    .filter(Boolean);

  if (explicit.length >= count) {
    return explicit.slice(0, count).map((a) => toRelatedItem(a, article.slug));
  }

  const tags = new Set(article.tags || []);
  const picked = [...explicit];
  const pickedSlugs = new Set(picked.map((a) => a.slug));

  const ranked = allArticles
    .filter((a) => a.slug !== article.slug && !pickedSlugs.has(a.slug))
    .map((a) => {
      let score = 0;
      for (const t of a.tags || []) {
        if (tags.has(t)) score += 12;
      }
      if (a.category && a.category === article.category) score += 8;
      return { article: a, score };
    })
    .sort((x, y) => y.score - x.score || x.article.slug.localeCompare(y.article.slug));

  for (const { article: a, score } of ranked) {
    if (picked.length >= count) break;
    if (score > 0 || picked.length < count) picked.push(a);
  }

  return picked.slice(0, count).map((a) => toRelatedItem(a, article.slug));
}

/**
 * @param {import('./articles.mjs').Article} target
 * @param {string} fromSlug
 */
function toRelatedItem(target, fromSlug) {
  const graph = INTERNAL_LINK_GRAPH[fromSlug];
  const edge = graph?.glossaryLinks?.find((g) => g.relatedSlug === target.slug);
  return {
    slug: target.slug,
    title: edge?.relatedTitle || articleShortTitle(target),
    kicker: edge?.relatedKicker || "",
    stat: edge?.relatedStat || "",
    statLabel: edge?.relatedStatLabel || "",
  };
}
