/** @typedef {{ date: string, text: string }} ArcSummaryItem */

/** @param {unknown} item */
export function normalizeArcItem(item) {
  if (typeof item === "string") {
    return { date: "", text: item };
  }
  if (item && typeof item === "object") {
    const o = /** @type {Record<string, string>} */ (item);
    return { date: o.date || "", text: o.text || "" };
  }
  return { date: "", text: "" };
}

/** @param {import('./timeline.mjs').TimelineEvent[] | unknown[]} raw */
export function normalizeArcSummary(raw = []) {
  return raw.map(normalizeArcItem).filter((x) => x.text);
}

export function formatArcDate(iso) {
  if (!iso) return "";
  const s = String(iso).trim();
  // 「2003年」「2028年7月頃」など既に日本語の日付ラベル
  if (/年/.test(s) && !/^\d{4}-\d{2}/.test(s)) return s;
  const [y, m, d] = s.split("-");
  if (!y) return "";
  if (!m) return `${y}年`;
  if (!d) return `${y}年${Number(m)}月`;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/** Newest first */
export function sortArcSummary(items) {
  return [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
