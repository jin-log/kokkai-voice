/**
 * 特別公開 — 一般公開中だがゲート/品質の完全合格ではない記事
 * （ルール免除や手動公開で /case/ に載っている状態）
 */

/**
 * @param {unknown} article
 * @param {{ ok?: boolean, blockers?: unknown[] }} gate
 * @param {{ ok?: boolean, blockers?: unknown[] }} quality
 * @param {{ titleAnswerOk?: boolean, pipelinePreOk?: boolean, fullyReady?: boolean }} [opts]
 */
export function computeSpecialPublish(article, gate, quality, opts = {}) {
  const live = article?.pageReady === true && article?.adminHidden !== true;
  if (!live) {
    return { specialPublish: false, reasons: [], summary: "" };
  }

  const reasons = [];
  const gateBlockers = gate?.blockers?.length ?? 0;
  const qualityBlockers = quality?.blockers?.length ?? 0;

  if (gateBlockers > 0) {
    reasons.push({ kind: "gate", count: gateBlockers });
  }
  if (!quality?.ok && qualityBlockers > 0) {
    reasons.push({ kind: "quality", count: qualityBlockers });
  }
  if (opts.pipelinePreOk === false) {
    reasons.push({ kind: "pipeline" });
  }
  if (opts.titleAnswerOk === false) {
    reasons.push({ kind: "title" });
  }
  if (opts.fullyReady === false && reasons.length === 0) {
    reasons.push({ kind: "incomplete" });
  }

  const explicit =
    article?.publishMode === "special" || (article?.publishWaivers?.length ?? 0) > 0;
  const specialPublish = reasons.length > 0 || explicit;

  const parts = [];
  const gatePart = reasons.find((r) => r.kind === "gate");
  if (gatePart) parts.push(`ゲート${gatePart.count}件`);
  if (reasons.some((r) => r.kind === "quality")) parts.push("品質NG");
  if (reasons.some((r) => r.kind === "pipeline")) parts.push("①〜④未完了");
  if (reasons.some((r) => r.kind === "title")) parts.push("1行目未回答");
  if (reasons.some((r) => r.kind === "incomplete")) parts.push("未完成");
  if (explicit && parts.length === 0) parts.push("免除設定");

  return {
    specialPublish,
    reasons,
    summary: parts.join("・"),
  };
}
