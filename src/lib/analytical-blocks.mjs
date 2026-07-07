/**
 * 分析ブロック — メリデメ / 利害 / 数値統計（1〜3種必須・0種NG）
 */

/** @param {object|null|undefined} prosCons */
export function assessProsConsBlock(prosCons) {
  const merits = prosCons?.merits ?? [];
  const demerits = prosCons?.demerits ?? [];
  const present = merits.length > 0 || demerits.length > 0;
  const valid =
    merits.length >= 2 &&
    demerits.length >= 2 &&
    merits.every((m) => m.text && m.figure && m.sourceUrl) &&
    demerits.every((m) => m.text && m.figure && m.sourceUrl);
  return { present, valid, merits: merits.length, demerits: demerits.length };
}

/** @param {object|null|undefined} meritsDemerits */
export function assessImpactBlock(meritsDemerits) {
  const merits = meritsDemerits?.merits ?? [];
  const demerits = meritsDemerits?.demerits ?? [];
  const items = [...merits, ...demerits];
  const present = items.length > 0;
  const valid =
    merits.length >= 1 &&
    demerits.length >= 1 &&
    items.length >= 2 &&
    items.every((m) => m.text && m.sourceUrl);
  return { present, valid, count: items.length };
}

/** @param {object|null|undefined} statsSeries */
export function assessStatsBlock(statsSeries) {
  const points = statsSeries?.chart?.points ?? [];
  const present = points.length > 0 || (statsSeries?.highlights?.length ?? 0) > 0;
  const valid = points.length >= 2 && points.every((p) => p.label && Number.isFinite(Number(p.value)));
  return { present, valid, points: points.length };
}

/** @param {import('./articles.mjs').Article} article */
export function analyticalBlocksStatus(article) {
  const pros = assessProsConsBlock(article.prosCons);
  const impact = assessImpactBlock(article.meritsDemerits);
  const stats = assessStatsBlock(article.statsSeries);

  const labels = [];
  if (pros.present) labels.push("メリデメ");
  if (impact.present) labels.push("利害");
  if (stats.present) labels.push("数値統計");

  const validCount = [pros.valid, impact.valid, stats.valid].filter(Boolean).length;
  const ok = validCount >= 1;

  return {
    ok,
    validCount,
    labels,
    pros,
    impact,
    stats,
    detail: ok
      ? `${labels.join("・")}（有効${validCount}種）`
      : labels.length
        ? `${labels.join("・")} — 内容不足（有効0種・1種以上必要）`
        : "分析ブロックなし（メリデメ・利害・数値統計のいずれか1〜3種必須）",
  };
}

/** @param {import('./articles.mjs').Article} article */
export function hasDisplayableProsCons(article) {
  const m = article.prosCons?.merits ?? [];
  const d = article.prosCons?.demerits ?? [];
  return m.length > 0 || d.length > 0;
}

/** @param {import('./articles.mjs').Article} article */
export function hasDisplayableImpact(article) {
  return assessImpactBlock(article.meritsDemerits).present;
}

/** @param {import('./articles.mjs').Article} article */
export function hasDisplayableStats(article) {
  return (article.statsSeries?.chart?.points?.length ?? 0) >= 2;
}

/** @param {import('./articles.mjs').Article} article */
export function resolveImpact(article) {
  const md = article.meritsDemerits;
  if (!md) return null;
  const merits = md.merits ?? [];
  const demerits = md.demerits ?? [];
  if (!merits.length && !demerits.length) return null;
  return {
    disclaimer: md.disclaimer || "",
    merits,
    demerits,
  };
}
