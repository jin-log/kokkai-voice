/**
 * 編集ルール — 自動修正 + 保存前ゲート
 */
import { lintArticle } from "./editorial-rules.mjs";
import { sanitizeArticleTimeline } from "./timeline-sanitize.mjs";

/** @param {object} article @param {{ applyFixes?: boolean }} [opts] */
export function enforceEditorialRules(article, opts = {}) {
  const applyFixes = opts.applyFixes !== false;
  let next = { ...article };
  if (applyFixes) next = sanitizeArticleTimeline(next);
  const lint = lintArticle(next);
  return { article: next, lint };
}

/**
 * ブロッカーが残る場合は例外（--force 時のみ通過）
 * @param {object} article
 * @param {{ force?: boolean }} [opts]
 */
export function assertEditorialRules(article, opts = {}) {
  const { article: fixed, lint } = enforceEditorialRules(article);
  if (!lint.ok && !opts.force) {
    const detail = lint.blockers
      .map((b) => `${b.ruleId} ${b.field}: ${b.line}`)
      .join(" | ");
    throw new Error(`editorial blockers (${lint.blockers.length}): ${detail}`);
  }
  return fixed;
}
