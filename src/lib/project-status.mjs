/**
 * 完成度パイプライン（表示順＝実行順）
 * 公開ゲート = ①〜④。100% = ①〜⑥。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditArticleQuality, isArticleFullyReady } from "./article-quality.mjs";
import { computeSpecialPublish } from "./special-publish.mjs";
import { assessTitleOpeningAnswer } from "./publish-policy.mjs";
import { buildAgentTasksForArticle, agentForCheckId } from "./agent-tasks.mjs";
import { checkCasePageWithFiles, root, blockerToHuman } from "./page-ready.mjs";
import { filterPublishable, loadArticle } from "./articles.mjs";
import { citizenTitle } from "./title-format.mjs";
import { buildPromoIntroMap } from "./promo-intro-status.mjs";
import { loadShortStatusMap } from "./short-status.mjs";
import { loadPatrolRuntime, buildWorkItems } from "./patrol-runtime.mjs";
import {
  backfillArticleActivity,
  getArticleActivity,
  formatActivityLine,
  activityWhenShort,
} from "./article-activity.mjs";
import {
  buildStatusExplain,
  buildDistributionRows,
  AUTOMATION_POLICY,
  STATUS_DEFINITIONS,
} from "./admin-status-guide.mjs";
import { analyzePatrolHealth, stallForSlug, loadPatrolHealthForAdmin } from "./patrol-stall.mjs";
import { isXUnavailable, X_UNAVAILABLE_ADMIN_MESSAGE } from "./x-research-policy.mjs";
import { waivedCheckIds, matrixPipelineOk, contentStatsOk } from "./case-gates.mjs";

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

function contentOk(gate, article, policyMatrix = null) {
  const waived = waivedCheckIds(article, { policyMatrix });
  const ids = /^[A-FJ]/;
  const subset = gate.checks.filter((c) => ids.test(c.id) && !waived.has(c.id));
  const formOk = subset.length > 0 && subset.every((c) => c.ok);
  const quality = auditArticleQuality(article);
  const qualityOk = quality.ok;
  return formOk && qualityOk;
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
  const xMin = article.xPostsMinRequired ?? 3;
  const xUnavailable = isXUnavailable(article);
  const xGateOk = xUnavailable || !gate.blockers.some((b) => String(b.id).startsWith("H"));
  const x = xUnavailable || (xOk >= xMin && xGateOk);
  const content = contentOk(gate, article, policyMatrix);
  const matrix = matrixPipelineOk(article, { policyMatrix });
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
                ? article.pageReady === true && isArticleFullyReady(article, gate)
                : item.id === "debug"
                  ? article.qaReview?.status === "ok" && isArticleFullyReady(article, gate)
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

  const titleAnswer = assessTitleOpeningAnswer(article);

  if (titleAnswer.ok && !article.pageReady) {
    return "📋 1行目OK — プレビュー確認後「公開する」を押してください";
  }
  if (titleAnswer.ok && article.pageReady) {
    const openPre = pipeline.filter((p) => p.preDeploy && !p.ok);
    if (openPre.length > 0 || gate.blockers.length > 0) {
      return "✅ 公開中 — 要対応あり（裏で修正中・URLは維持）";
    }
    return "✅ 公開中 — /case/ に表示されています";
  }
  if (!titleAnswer.ok && !article.pageReady) {
    return `✏️ 公開待ち — ${titleAnswer.detail}（①〜④は巡回が続行）`;
  }
  if (article.pageReady && !titleAnswer.ok) {
    return "⚠ 公開中だが1行目がタイトルに未回答 — 非表示または修正を推奨";
  }

  const hints = {
    A2_primarySpeech: "国会発言 or ソースURLを追加",
    B1_nowSummary: "いまの結論（1行以上）を入力",
    C1_summaryBullets: "要点リストを追加",
    D1_arcSummary: "経緯サマリ（日付付き）を追加",
    E1_timeline_count: "タイムライン6件以上（X3+国会3）",
    E2_timeline_x: "タイムラインにX3件",
    E3_timeline_diet: "タイムラインに国会3件",
    dietPending: "dietPending: true で国会待ち先行公開（X3+出来事）",
    J1_prosCons: "メリデメ（公表数値付き各2）",
    F1_glossary: "用語解説を追加",
    G2_policy_matrix_file: "公言と行動表（policy-matrix）を作成",
    G3_parties_min: "2党以上のスタンスを入力",
    G4_parties_source: "各党に出典URL",
    G5_parties_symbol: "◎▲❌ を確定",
    H1_xPosts: "X URL検索・post_text 補完（x-researcher）",
    H2_x_topic: "X本文を案件キーワードに合わせて差し替え",
    H3_x_screenshot: "npm run x:capture -- --slug <slug>（デバッガー）",
    I1_legal: "法務チェックを実行",
  };

  const parts = gate.blockers.slice(0, 3).map((b) => hints[b.id] || b.detail || b.id);

  const quality = auditArticleQuality(article);
  if (!quality.ok && quality.blockers[0]) {
    const q = quality.blockers[0];
    parts.unshift(`品質: ${q.message} — ${q.todo}`);
  }

  if (article.category && article.category !== "国会" && !article.sourceUrls?.length) {
    parts.unshift("📰 ソースURL（報道・会見）を管理画面で追加して再生成");
  }

  const xFailed = (article.xPosts ?? []).filter((p) => p.status === "search_failed").length;
  if (isXUnavailable(article)) {
    parts.push(X_UNAVAILABLE_ADMIN_MESSAGE);
  } else if (xFailed >= 3) {
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
  const patrolRuntime = await loadPatrolRuntime();

  for (const slug of activeSlugs) {
    let article;
    try {
      article = await loadArticle(slug);
    } catch {
      continue;
    }
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

    const pipeline = pipelineChecks(article, gate, policyMatrix).map((p) =>
      p.id === "x" && isXUnavailable(article)
        ? { ...p, label: "③X未発見（調査完了）" }
        : p,
    );
    const pipelinePreOk = isPublishGate(pipeline);
    const titleAnswer = assessTitleOpeningAnswer(article);
    const publishGateOk = titleAnswer.ok;
    const pageReady = article.pageReady === true;
    const nextAction = computeNextAction(article, gate, pipeline);

    const quality = auditArticleQuality(article);
    const agentTasks = buildAgentTasksForArticle(article, gate);
    const fullyReady = isArticleFullyReady(article, gate);
    const special = computeSpecialPublish(article, gate, quality, {
      titleAnswerOk: titleAnswer.ok,
      pipelinePreOk,
      fullyReady,
    });

    await backfillArticleActivity(slug, article);
    const activityRaw = await getArticleActivity(slug, 10);
    const activity = activityRaw.map((e) => ({
      at: e.at,
      when: activityWhenShort(e.at),
      type: e.type,
      actor: e.actor,
      line: formatActivityLine(e),
    }));

    let publishState = "wip";
    if (article.adminHidden) publishState = "hidden";
    else if (pageReady) publishState = "live";
    else if (publishGateOk) publishState = "draft";

    const workItems = buildWorkItems(slug, gate, quality, patrolRuntime, pipeline, article);
    const runState = patrolRuntime.activeSlug === slug ? "active" : "idle";

    slugs.push({
      slug,
      title: article.title ?? slug,
      shortTitle: citizenTitle(article),
      category: article.category ?? "",
      policyCategory: article.category ?? "",
      adminHidden: article.adminHidden === true,
      pageReady,
      publishState,
      previewUrl: `/dev/preview/${slug}/`,
      qualityOk: quality.ok,
      needsQualityFix: !quality.ok,
      qualityBlockerCount: quality.blockers.length,
      qualityBlockers: quality.blockers.slice(0, 6).map((q) => ({
        id: q.id,
        message: q.message,
        todo: q.todo,
        agent: agentForCheckId(q.id),
      })),
      agentTasks: agentTasks.slice(0, 8),
      gatePct: pct(
        pipeline.filter((p) => p.preDeploy && p.ok).length,
        pipeline.filter((p) => p.preDeploy).length,
      ),
      goldPct: pct(
        pipeline.filter((p) => p.ok).length,
        pipeline.length,
      ),
      published: pageReady && !article.adminHidden,
      specialPublish: special.specialPublish,
      specialPublishSummary: special.summary,
      publishGateOk,
      pipelinePreOk,
      titleAnswerOk: titleAnswer.ok,
      titleAnswerDetail: titleAnswer.detail,
      titleAnswerTodo: titleAnswer.todo || null,
      pipeline,
      gold: pipeline,
      blockers: gate.blockers.map((b) => blockerToHuman(b)),
      blockerCount: gate.blockers.length,
      runState,
      workItems,
      nextAction,
      promo: promoMap.get(slug) ?? { x: null, hatena: null, note: null },
      short: shortMap.get(slug) ?? { label: "未生成", generated: false, uploaded: false },
      xUnavailable: isXUnavailable(article),
      xResearchStatus: article.xResearch?.status ?? null,
      statusExplain: buildStatusExplain(
        {
          adminHidden: article.adminHidden === true,
          publishState,
          runState,
          workItems,
          needsQualityFix: !quality.ok,
          titleAnswerOk: titleAnswer.ok,
          specialPublish: special.specialPublish,
          specialPublishSummary: special.summary,
        },
        article,
      ),
      publishedBy: article.publishedBy ?? null,
      publishedAt: article.publishedAt ?? null,
      adminHiddenBy: article.adminHiddenBy ?? null,
      adminHiddenAt: article.adminHiddenAt ?? null,
      patrolFixing:
        patrolRuntime.activeSlug === slug ||
        (patrolRuntime.running && (patrolRuntime.batchSlugs ?? []).includes(slug)),
      activity,
      distribution: buildDistributionRows(
        promoMap.get(slug) ?? { x: null, hatena: null, note: null },
        shortMap.get(slug) ?? { label: "未生成", generated: false, uploaded: false },
      ),
    });
  }

  const articles = (
    await Promise.all(
      activeSlugs.map(async (slug) => {
        try {
          return await loadArticle(slug);
        } catch {
          return null;
        }
      }),
    )
  ).filter(Boolean);
  const published = (await filterPublishable(articles)).length;

  const overallGoldPct = pct(
    slugs.reduce((sum, s) => sum + s.pipeline.filter((p) => p.ok).length, 0),
    slugs.length * PIPELINE_ITEMS.length,
  );
  const overallGatePct = pct(
    slugs.reduce((sum, s) => sum + s.gatePct, 0),
    slugs.length * 100,
  );

  const qualityFailed = slugs.filter((s) => !s.qualityOk).length;
  const specialPublishCount = slugs.filter((s) => s.specialPublish).length;

  let patrolState = null;
  try {
    patrolState = JSON.parse(
      await readFile(path.join(root, "data/pipeline-patrol.json"), "utf8"),
    );
  } catch {
    /* optional */
  }

  const patrolHealth = await analyzePatrolHealth({
    slugs: slugs.map((s) => ({
      slug: s.slug,
      shortTitle: s.shortTitle,
      goldPct: s.goldPct,
      adminHidden: s.adminHidden,
    })),
    patrolState,
  });

  for (const s of slugs) {
    s.stall = stallForSlug(s.slug, patrolHealth);
  }

  return {
    generatedAt: new Date().toISOString(),
    strategy: index.strategy ?? "quality-first",
    activeCount: activeSlugs.length,
    parkedCount,
    publishedCount: published,
    overallGoldPct,
    overallGatePct,
    qualityFailed,
    specialPublishCount,
    automationPolicy: AUTOMATION_POLICY,
    statusDefinitions: STATUS_DEFINITIONS,
    patrolHealth,
    slugs,
  };
}

/** 管理画面タブ: 公開状態ベース（品質NGはバッジ表示・タブは動かさない） */
export function sortSlugsForAdminPanel(slugs) {
  const rank = (s) => {
    if (s.publishState === "live" && !s.adminHidden) {
      if (s.specialPublish) return 38;
      return s.needsQualityFix ? 35 : 40;
    }
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
  if (s.adminHidden) return "hidden";
  if (s.publishState === "live") return "live";
  if (s.publishState === "draft") return "draft";
  return "action";
}

/** @param {ReturnType<typeof adminSlugFilter>} filter */
export function adminFilterLabel(filter) {
  const labels = {
    action: "要対応",
    draft: "公開待ち",
    live: "公開済み",
    hidden: "非表示",
  };
  return labels[filter] ?? filter;
}

export async function enrichProjectStatusForAdmin(status) {
  if (!status?.slugs?.length) return status;

  const patrolHealth = await loadPatrolHealthForAdmin(
    status.slugs.map((s) => ({
      slug: s.slug,
      shortTitle: s.shortTitle,
      goldPct: s.goldPct,
      adminHidden: s.adminHidden,
    })),
  );

  status.patrolHealth = patrolHealth;
  for (const s of status.slugs) {
    s.stall = stallForSlug(s.slug, patrolHealth);
  }
  return status;
}

export async function loadProjectStatus() {
  const raw = await readFile(path.join(root, "data/project-status.json"), "utf8");
  const status = JSON.parse(raw);
  return enrichProjectStatusForAdmin(status);
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
  const livePath = path.join(root, "public/status-live.json");
  await writeFile(livePath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}

/** @typedef {{ slug: string, shortTitle: string, gatePct: number, goldPct: number, published: boolean, publishGateOk: boolean, pipeline: { id: string, label: string, ok: boolean }[], gold: unknown[], blockers: { id: string, detail?: string }[] }} SlugStatus */
