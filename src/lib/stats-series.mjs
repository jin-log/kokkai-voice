/**
 * 数値統計ブロック — statsSeries の正規化とグラフ用計算
 */

/** @typedef {{ label: string, value: string, unit?: string, sub?: string, subTone?: string, valueTone?: string }} StatHighlight */
/** @typedef {{ label: string, value: number, latest?: boolean }} ChartPoint */
/** @typedef {{ date: string, value: string, delta?: string, deltaTone?: string, sourceUrl?: string, sourceLabel?: string }} StatTableRow */

/**
 * @param {{ unit?: string, ariaLabel?: string, points?: ChartPoint[], valueUnit?: string }|null|undefined} rawChart
 * @param {string} [fallbackAria]
 */
function normalizeChart(rawChart, fallbackAria = "推移の棒グラフ") {
  if (!rawChart?.points?.length) return null;
  const points = rawChart.points.map((p) => ({
    label: p.label || "",
    value: Number(p.value),
    latest: Boolean(p.latest),
  }));
  const max = Math.max(...points.map((p) => p.value), 1);
  const valueUnit = rawChart.valueUnit || "";
  return {
    unit: rawChart.unit || "",
    ariaLabel: rawChart.ariaLabel || fallbackAria,
    points: points.map((p) => ({
      ...p,
      heightPct: Math.max(12, Math.round((p.value / max) * 100)),
      display: formatCount(p.value) + valueUnit,
    })),
  };
}

/**
 * @param {import('./articles.mjs').Article} article
 * @returns {object|null}
 */
export function resolveStatsSeries(article) {
  const raw = article.statsSeries;
  const chart = normalizeChart(raw?.chart);
  if (!chart) return null;

  return {
    title: raw.title || "人数の推移（公表値）",
    note: raw.note || "",
    highlights: raw.highlights ?? [],
    chart,
    chart2Title: raw.chart2Title || "",
    chart2Note: raw.chart2Note || "",
    chart2: normalizeChart(raw.chart2, "将来推計の棒グラフ"),
    table: {
      columns: raw.table?.columns ?? ["時点", "値", "前回比", "出典"],
      rows: raw.table?.rows ?? [],
    },
    footnote: raw.footnote || "",
    matrix: raw.matrix || null,
  };
}

/** @param {number} n */
export function formatCount(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString("ja-JP");
}

/** @param {string} [tone] */
export function deltaClass(tone) {
  if (tone === "down" || tone === "good") return "cb-trend-delta--down";
  if (tone === "up" || tone === "bad") return "cb-trend-delta--up";
  return "";
}

/** @param {string} [tone] */
export function subClass(tone) {
  if (tone === "good") return "cb-big-num__sub--good";
  if (tone === "bad") return "cb-big-num__sub--bad";
  return "";
}

/** @param {string} [tone] */
export function valueClass(tone) {
  if (tone === "up") return "cb-big-num__value--up";
  if (tone === "down") return "cb-big-num__value--down";
  return "";
}
