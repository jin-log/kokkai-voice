/**
 * Shorts コメント促し — 動画テロップ・ナレーション・YouTube文案で共通
 */

/** @returns {string[]} */
export function commentTelopLines() {
  return ["あなたはどう思う？", "コメントで教えて"];
}

/** @returns {string} */
export function commentNarration() {
  return "あなたはどう思う？コメント欄で教えてください。詳細は「日本の政治なう」概要欄からリンク。";
}

/**
 * @param {string} slug
 * @param {string} [category]
 * @deprecated ナレーションは固定フレーズ。ピン留めコメント用に残す。
 */
export function commentQuestion(slug, category = "この話") {
  return `${category}について、どう思いますか？`;
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
