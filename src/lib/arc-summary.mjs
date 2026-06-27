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
  const [y, m, d] = iso.split("-");
  if (!y) return "";
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/** Newest first */
export function sortArcSummary(items) {
  return [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
