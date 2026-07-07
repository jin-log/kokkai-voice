/**
 * 案件タイプ別 — page-ready / パイプラインで免除するチェック
 */
import { resolveCaseType } from "./case-blocks.mjs";
import { analyticalBlocksStatus } from "./analytical-blocks.mjs";

const G_CHECKS = [
  "G1_stanceMatrix_ref",
  "G2_policy_matrix_file",
  "G3_parties_min",
  "G4_parties_source",
  "G5_parties_symbol",
  "G6_matrix_topic",
];

/**
 * @param {import('./articles.mjs').Article} article
 * @param {object} [opts]
 * @param {object|null} [opts.policyMatrix]
 * @returns {Set<string>}
 */
export function waivedCheckIds(article, opts = {}) {
  const { policyMatrix = null } = opts;
  const caseType = resolveCaseType(article, policyMatrix);
  /** @type {Set<string>} */
  const waived = new Set();

  if (caseType === "statistical" || caseType === "policy_retrospective") {
    for (const id of G_CHECKS) waived.add(id);
    if (analyticalBlocksStatus(article).stats.valid) {
      waived.add("J1_prosCons");
    }
  }

  if (caseType === "narrative") {
    for (const id of ["G5_parties_symbol", "G6_matrix_topic"]) waived.add(id);
    if (!article.stanceMatrix) {
      for (const id of G_CHECKS) waived.add(id);
    }
  }

  if (article.xPostsPolicy === "unavailable" || article.xPostsPolicy === "deferred") {
    waived.add("E2_timeline_x");
  }

  if (article.category && article.category !== "国会") {
    waived.add("E3_timeline_diet");
    waived.add("E4_timeline_diet_topic");
    if (caseType === "statistical") {
      waived.add("E1_timeline_count");
    }
  }

  return waived;
}

/**
 * @param {import('./articles.mjs').Article} article
 * @param {object} [opts]
 */
export function matrixPipelineOk(article, opts = {}) {
  const caseType = resolveCaseType(article, opts.policyMatrix);
  if (caseType === "statistical" || caseType === "narrative" || caseType === "policy_retrospective") return true;
  const parties = opts.policyMatrix?.parties ?? [];
  const symbolsOk = parties.filter(
    (p) => p.symbol && p.symbol !== "？" && p.symbol !== "?",
  ).length;
  return symbolsOk >= 2;
}

/**
 * @param {import('./articles.mjs').Article} article
 */
export function contentStatsOk(article) {
  return analyticalBlocksStatus(article).ok;
}
