/**
 * Shorts コメント促し — 動画テロップ・ナレーション・YouTube文案で共通
 */

/** @type {Record<string, string>} */
export const COMMENT_QUESTIONS = {
  "shussho-budget-seika": "3.6兆円の少子化対策、効果が出ていると思いますか？",
  shoshika: "結婚したいのに進まない——一番の原因は何だと思いますか？",
};

/**
 * @param {string} slug
 * @param {string} [category]
 */
export function commentQuestion(slug, category = "この話") {
  return COMMENT_QUESTIONS[slug] ?? `${category}について、どう思いますか？`;
}

/** @returns {string[]} */
export function commentTelopLines() {
  return ["あなたはどう思う？", "コメントで教えて"];
}

/**
 * @param {string} question
 */
export function commentNarration(question) {
  return `${question} コメント欄で教えてください。出典付きの整理は、概要欄のリンクからどうぞ。`;
}

/**
 * @param {string} question
 * @param {string} caseUrl
 */
export function buildPinnedComment(question, caseUrl) {
  return [question, "", "▼ 出典付きの全文・タイムライン", caseUrl].join("\n");
}

/**
 * @param {string} question
 */
export function buildDescriptionCommentBlock(question) {
  return ["💬 あなたの意見をコメントで教えてください", question].join("\n");
}
