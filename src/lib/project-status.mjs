/**
 * 完成度パイプライン（表示順＝実行順）
 * 公開ゲート = ①〜④。100% = ①〜⑥。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkCasePageWithFiles, root } from "./page-ready.mjs";
import { filterPublishable, loadArticle } from "./articles.mjs";

/** @typedef {{ id: string, label: string, phase: number, preDeploy: boolean }} PipelineItemDef */

export const PIPELINE_ITEMS = [
  { id: "content", label: "①コンテンツ", phase: 1, preDeploy: true },
  { id: "matrix", label: "②〇×2党確定", phase: 2, preDeploy: true },
  { id: "x", label: "③X検証2件+", phase: 3, preDeploy: true },
  { id: "legal", label: "④法務OK", phase: 4, preDeploy: true },
  { id: "deployed", label: "⑤本番デプロイ", phase: 5, preDeploy: false },
  { id: "debug", label: "⑥デバッグOK", phase: 6, preDeploy: false },
];

/** 公開ゲート = デプロイ前4ステップすべてOK */
export function isPublishGate(gold) {
  return PIPELINE_ITEMS.filter((p) => p.preDeploy).every((p) => gold.find((g) => g.id === p.id)?.ok);
}

function contentOk(gate) {
  const ids = /^[A-F]/;
  const subset = gate.checks.filter((c) => ids.test(c.id));
  return subset.length > 0 && subset.every((c) => c.ok);
}

/** @param {unknown} article @param {Awaited<ReturnType<typeof checkCasePageWithFiles>>} gate @param {unknown} policyMatrix */
export function pipelineChecks(article, gate, policyMatrix) {
  const parties = policyMatrix?.parties ?? [];
  const symbolsOk = parties.filter(
    (p) => p.symbol && p.symbol !== "？" && p.symbol !== "?",
  ).length;
  const xOk = (article.xPosts ?? []).filter(
    (p) => p.post_url && p.post_text && p.status === "url_found",
  ).length;

  const content = contentOk(gate);
  const matrix = symbolsOk >= 2;
  const x = xOk >= 2;
  const legal = article.legalReview?.status === "ok";

  return PIPELINE_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    phase: item.phase,
    preDeploy: item.preDeploy,
    ok:
      item.id === "content"
        ? content
        : item.id === "matrix"
          ? matrix
          : item.id === "x"
            ? x
            : item.id === "legal"
              ? legal
              : item.id === "deployed"
                ? gate.ok
                : item.id === "debug"
                  ? article.qaReview?.status === "ok"
                  : false,
  }));
}

function pct(ok, total) {
  return total === 0 ? 0 : Math.round((ok / total) * 100);
}

export async function computeProjectStatus() {
  const index = JSON.parse(
    await readFile(path.join(root, "data/articles/index.json"), "utf8"),
  );
  let parkedCount = 0;
  try {
    const parked = JSON.parse(
      await readFile(path.join(root, "data/articles/parked.json"), "utf8"),
    );
    parkedCount = parked.slugs?.length ?? 0;
  } catch {
    /* optional */
  }

  const activeSlugs = index.slugs ?? [];
  const slugs = [];

  for (const slug of activeSlugs) {
    const article = await loadArticle(slug);
    const gate = await checkCasePageWithFiles(article);
    let policyMatrix = null;
    try {
      const sm = article.stanceMatrix;
      const matrixPath = sm?.dataPath
        ? path.join(root, sm.dataPath)
        : path.join(root, `data/policy-matrix/${sm?.policySlug || slug}.json`);
      policyMatrix = JSON.parse(await readFile(matrixPath, "utf8"));
    } catch {
      /* missing */
    }

    const pipeline = pipelineChecks(article, gate, policyMatrix);
    const publishGateOk = isPublishGate(pipeline);

    slugs.push({
      slug,
      shortTitle: article.title?.replace(/ — あの話どうなった？$/, "") ?? slug,
      gatePct: pct(
        pipeline.filter((p) => p.preDeploy && p.ok).length,
        pipeline.filter((p) => p.preDeploy).length,
      ),
      goldPct: pct(
        pipeline.filter((p) => p.ok).length,
        pipeline.length,
      ),
      published: gate.ok,
      publishGateOk,
      pipeline,
      gold: pipeline,
      blockers: gate.blockers.map((b) => ({ id: b.id, detail: b.detail })),
    });
  }

  const articles = await Promise.all(activeSlugs.map((s) => loadArticle(s)));
  const published = (await filterPublishable(articles)).length;

  const overallGoldPct = pct(
    slugs.reduce((sum, s) => sum + s.pipeline.filter((p) => p.ok).length, 0),
    slugs.length * PIPELINE_ITEMS.length,
  );
  const overallGatePct = pct(
    slugs.reduce((sum, s) => sum + s.gatePct, 0),
    slugs.length * 100,
  );

  return {
    generatedAt: new Date().toISOString(),
    strategy: index.strategy ?? "quality-first",
    activeCount: activeSlugs.length,
    parkedCount,
    publishedCount: published,
    overallGoldPct,
    overallGatePct,
    slugs,
  };
}

export async function loadProjectStatus() {
  const raw = await readFile(path.join(root, "data/project-status.json"), "utf8");
  return JSON.parse(raw);
}

export async function refreshProjectStatus() {
  const outPath = path.join(root, "data/project-status.json");
  let previousGold = null;
  let previousDeployedAt = null;
  try {
    const prev = JSON.parse(await readFile(outPath, "utf8"));
    previousGold = prev.overallGoldPct ?? null;
    previousDeployedAt = prev.deployedAt ?? null;
  } catch {
    /* first run */
  }

  const status = await computeProjectStatus();
  if (previousGold !== null) {
    status.deltaGoldPct = status.overallGoldPct - previousGold;
  }
  status.previousGoldPct = previousGold;
  status.deployedAt = previousDeployedAt;

  await writeFile(outPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}

/** @typedef {{ slug: string, shortTitle: string, gatePct: number, goldPct: number, published: boolean, publishGateOk: boolean, pipeline: { id: string, label: string, ok: boolean }[], gold: unknown[], blockers: { id: string, detail?: string }[] }} SlugStatus */
