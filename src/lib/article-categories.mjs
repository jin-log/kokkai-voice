/** 記事の政策カテゴリ（article.category の正本） */
export const POLICY_CATEGORIES = ["国会", "行政", "地方"];

/** @param {string | undefined | null} cat */
export function policyCategoryLabel(cat) {
  const c = (cat || "").trim();
  return c || "未設定";
}

/** @param {string} a @param {string} b */
export function sortPolicyCategories(a, b) {
  const order = [...POLICY_CATEGORIES, "未設定"];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b, "ja");
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
