/**
 * 完成度パイプライン（表示順＝実行順）
 * 公開ゲート = ①〜④。100% = ①〜⑥。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkCasePageWithFiles, root, blockerToHuman } from "./page-ready.mjs";
import { filterPublishable, loadArticle } from "./articles.mjs";
import { citizenTitle } from "./title-format.mjs";
import { buildPromoIntroMap } from "./promo-intro-status.mjs";
import { loadShortStatusMap } from "./short-status.mjs";

/** @typedef {{ id: string, label: string, phase: number, preDeploy: boolean }} PipelineItemDef */

export const PIPELINE_ITEMS = [
  { id: "content", label: "①コンテンツ", phase: 1, preDeploy: true },
  { id: "matrix", label: "②〇×2党確定", phase: 2, preDeploy: true },
  { id: "x", label: "③X検証1件+", phase: 3, preDeploy: true },
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
  const xMin = article.xPostsMinRequired ?? 1;
  const x = xOk >= xMin;
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
                ? article.pageReady === true && gate.ok
                : item.id === "debug"
                  ? article.qaReview?.status === "ok"
                  : false,
  }));
}

function pct(ok, total) {
  return total === 0 ? 0 : Math.round((ok / total) * 100);
}

/** @param {unknown} article @param {Awaited<ReturnType<typeof checkCasePageWithFiles>>} gate @param {{ id: string, ok: boolean }[]} pipeline */
export function computeNextAction(article, gate, pipeline) {
  if (article.adminHidden) {
    return "👁️ 非表示中 — 「表示に戻す」でトップに出せます";
  }

  const preDeploy = pipeline.filter((p) => p.preDeploy);
  const preOk = preDeploy.filter((p) => p.ok).length;
  if (preOk === preDeploy.length && !article.pageReady) {
    return "📋 完成・非公開 — プレビューで確認して「公開する」を押してください";
  }
  if (preOk === preDeploy.length && article.pageReady && gate.ok) {
    return "✅ 公開中 — /case/ に表示されています";
  }
  if (preOk === preDeploy.length && !gate.ok) {
    return "🚀 ①〜④完了 — デプロイ後にプレビューを確認";
  }
  if (article.pageReady && gate.ok) {
    return "✅ 公開中";
  }

  const hints = {
    A2_primarySpeech: "国会発言 or ソースURLを追加",
    B1_nowSummary: "いまの結論（3行）を入力",
    C1_summaryBullets: "要点リストを追加",
    D1_arcSummary: "経緯サマリ（日付付き）を追加",
    E1_timeline_count: "タイムライン6件以上（X3+国会3）",
    E2_timeline_x: "タイムラインにX3件",
    E3_timeline_diet: "タイムラインに国会3件",
    J1_prosCons: "メリデメ（公表数値付き各2）",
    F1_glossary: "用語解説を追加",
    G2_policy_matrix_file: "公言と行動表（policy-matrix）を作成",
    G3_parties_min: "2党以上のスタンスを入力",
    G4_parties_source: "各党に出典URL",
    G5_parties_symbol: "◎▲❌ を確定",
    H1_xPosts: "X投稿URLを検索・登録",
    I1_legal: "法務チェックを実行",
  };

  const parts = gate.blockers.slice(0, 3).map((b) => hints[b.id] || b.detail || b.id);

  if (article.category && article.category !== "国会" && !article.sourceUrls?.length) {
    parts.unshift("📰 ソースURL（報道・会見）を管理画面で追加して再生成");
  }

  const xFailed = (article.xPosts ?? []).filter((p) => p.status === "search_failed").length;
  if (xFailed >= 3) {
    parts.push(`X調査: ${xFailed}枠が未特定 — キーワード見直し or 手動URL`);
  }

  if (parts.length === 0) {
    return "CEO/ライター作業待ち — ブロッカーを確認";
  }
  return parts.join(" → ");
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
  const promoMap = await buildPromoIntroMap();
  const shortMap = await loadShortStatusMap(activeSlugs);

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
    const pageReady = article.pageReady === true;
    const nextAction = computeNextAction(article, gate, pipeline);

    let publishState = "wip";
    if (article.adminHidden) publishState = "hidden";
    else if (pageReady && gate.ok) publishState = "live";
    else if (publishGateOk) publishState = "draft";

    slugs.push({
      slug,
      title: article.title ?? slug,
      shortTitle: citizenTitle(article),
      adminHidden: article.adminHidden === true,
      pageReady,
      publishState,
      previewUrl: publishGateOk ? `/dev/preview/${slug}/` : null,
      gatePct: pct(
        pipeline.filter((p) => p.preDeploy && p.ok).length,
        pipeline.filter((p) => p.preDeploy).length,
      ),
      goldPct: pct(
        pipeline.filter((p) => p.ok).length,
        pipeline.length,
      ),
      published: pageReady && gate.ok,
      publishGateOk,
      pipeline,
      gold: pipeline,
      blockers: gate.blockers.map((b) => blockerToHuman(b)),
      blockerCount: gate.blockers.length,
      runState: "idle",
      nextAction,
      promo: promoMap.get(slug) ?? { x: null, hatena: null, note: null },
      short: shortMap.get(slug) ?? { label: "未生成", generated: false, uploaded: false },
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

/** 管理画面: 要対応→公開待ち→非表示→公開済み（公開済みは末尾） */
export function sortSlugsForAdminPanel(slugs) {
  const rank = (s) => {
    if (s.publishState === "live" && !s.adminHidden) return 40;
    if (s.adminHidden) return 30;
    if (s.publishState === "draft") return 20;
    return 10;
  };
  return [...slugs].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 40) return (b.goldPct ?? 0) - (a.goldPct ?? 0);
    if (ra === 20) return (b.gatePct ?? 0) - (a.gatePct ?? 0);
    return (a.gatePct ?? 0) - (b.gatePct ?? 0);
  });
}

/** @param {ReturnType<typeof sortSlugsForAdminPanel>[number]} s */
export function adminSlugFilter(s) {
  if (s.publishState === "live" && !s.adminHidden) return "live";
  if (s.publishState === "draft") return "draft";
  return "action";
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
