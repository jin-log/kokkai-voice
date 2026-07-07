/**
 * コンテンツブロック — 案件タイプ別の表示ON/OFF
 * プレビュー・本番で同一。contentBlocks / caseType / statsSeries があればブロックUI。
 */

/** @typedef {'policy_debate'|'statistical'|'narrative'|'mixed'|'policy_retrospective'} CaseType */

/** @type {Record<CaseType, { stance: boolean, impact: boolean, stats: boolean, legacyProsCons: boolean, narrativeArc: boolean }>} */
export const BLOCK_CONFIG = {
  policy_debate: {
    stance: true,
    impact: true,
    stats: false,
    legacyProsCons: false,
    narrativeArc: false,
  },
  statistical: {
    stance: false,
    impact: false,
    stats: true,
    legacyProsCons: false,
    narrativeArc: false,
  },
  narrative: {
    stance: false,
    impact: false,
    stats: false,
    legacyProsCons: false,
    narrativeArc: true,
  },
  mixed: {
    stance: true,
    impact: true,
    stats: true,
    legacyProsCons: false,
    narrativeArc: false,
  },
  policy_retrospective: {
    stance: false,
    impact: false,
    stats: true,
    legacyProsCons: false,
    narrativeArc: true,
  },
};

/** @type {Record<string, CaseType>} */
export const SLUG_CASE_TYPE = {
  "case-mqzxj4ro": "policy_debate",
  "case-mqzxgs3f": "policy_debate",
  "case-mr0jbdpc": "policy_debate",
  "bouka-taisaku": "mixed",
  "shohizei-genmen": "mixed",
  "kyoiku-mushoka": "policy_debate",
  "energy-policy": "mixed",
  "seiji-shikin": "policy_debate",
  "senkyo-kaikaku": "policy_debate",
  "hosei-yosan": "mixed",
  "nichigyo": "narrative",
  "kishida-resign": "narrative",
  "fukushuto-koso": "policy_debate",
  "osaka-to-metropolis": "policy_debate",
  "fuhou-immin-trend": "statistical",
  "tokyo-solar-panel": "policy_debate",
  "case-mqwdrley": "narrative",
  "chingin": "policy_debate",
  "komei-kokumin": "policy_debate",
  "zeihikaku-kojo": "policy_debate",
  "expo2025-kessan": "statistical",
  "minimum-wage-2026": "statistical",
  "pension-kuriage-70": "statistical",
  "denki-gas-genmen": "policy_debate",
  "gakushu-shien-75000": "statistical",
  "noto-fukko-budget": "mixed",
  "boei-tokubetsuzei": "statistical",
  "invoice-menzei-2026": "policy_debate",
  "teigaku-kyufu-2024": "statistical",
  "kishida-seiken-jisshi": "policy_retrospective",
};

/** @param {import('./articles.mjs').Article} article */
export function isLiveArticle(article) {
  return article.pageReady === true && !article.adminHidden;
}

/** @param {import('./articles.mjs').Article} article */
export function usesContentBlocks(article) {
  if (article.contentBlocks === true) return true;
  if (article.caseType && BLOCK_CONFIG[article.caseType]) return true;
  if (article.slug && SLUG_CASE_TYPE[article.slug]) return true;
  if (article.statsSeries?.chart?.points?.length) return true;
  return false;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {object} [stance]
 * @returns {CaseType}
 */
export function resolveCaseType(article, stance) {
  if (article.caseType && BLOCK_CONFIG[article.caseType]) return article.caseType;
  if (SLUG_CASE_TYPE[article.slug]) return SLUG_CASE_TYPE[article.slug];

  const hasStance =
    (stance?.matrix?.parties ?? []).filter((p) => p?.partyLabel).length > 0;
  const figures = [
    ...(article.prosCons?.merits ?? []),
    ...(article.prosCons?.demerits ?? []),
  ].map((i) => i.figure || "");
  const hasMoney = figures.some((f) => /[兆億万千%円]/.test(f));
  const narrativeSlug = /case-|resign|nichigyo|mqwdrley/i.test(article.slug || "");

  if (narrativeSlug && !hasStance) return "narrative";
  if (hasMoney && hasStance) return "mixed";
  if (hasMoney) return "statistical";
  if (hasStance) return "policy_debate";
  return "mixed";
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {object} [stance]
 */
export function blockFlags(article, stance) {
  const caseType = resolveCaseType(article, stance);
  return { caseType, ...BLOCK_CONFIG[caseType] };
}

/** @param {CaseType} caseType */
export function caseTypeLabel(caseType) {
  const labels = {
    policy_debate: "政策論争型",
    statistical: "数値統計型",
    narrative: "経過・結末型",
    mixed: "複合型",
    policy_retrospective: "政策振り返り型",
  };
  return labels[caseType] || caseType;
}

/** @param {CaseType} caseType */
export function caseTypeBadgeClass(caseType) {
  const map = {
    policy_debate: "cb-type-badge--debate",
    statistical: "cb-type-badge--stat",
    narrative: "cb-type-badge--narrative",
    mixed: "cb-type-badge--mixed",
    policy_retrospective: "cb-type-badge--narrative",
  };
  return map[caseType] || "";
}
