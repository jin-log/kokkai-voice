/**
 * ダッシュボード用サマリーデータ
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_NAV_GROUPS } from "./admin-nav.mjs";
import { loadProjectStatus, sortSlugsForAdminPanel, adminSlugFilter } from "./project-status.mjs";
import { loadPatrolRuntime } from "./patrol-runtime.mjs";
import { loadTrendingTopics } from "./trending-topics.mjs";
import { loadOpsQueue, countByTab } from "./ops-queue.mjs";
import { themeForGroup } from "./admin-theme.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

function shortsSummary(status) {
  const slugs = status?.slugs ?? [];
  let generated = 0;
  let uploaded = 0;
  let publicCount = 0;
  for (const s of slugs) {
    if (s.short?.generated) generated += 1;
    if (s.short?.uploaded) uploaded += 1;
    if (s.short?.label?.startsWith("YT公開")) publicCount += 1;
  }
  return { generated, uploaded, publicCount, total: slugs.length };
}

function formatJa(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function shortKeyword(item) {
  const kw = item?.keyword || item?.headline || "";
  return kw.length > 36 ? `${kw.slice(0, 36)}…` : kw;
}

/**
 * @param {Awaited<ReturnType<typeof loadProjectStatus>> | null} status
 * @param {Awaited<ReturnType<typeof loadPatrolRuntime>>} patrol
 * @param {{ total?: number, byAgent?: Record<string, number> } | null} agentTasks
 * @param {Awaited<ReturnType<typeof countByTab>> | null} opsCounts
 * @param {unknown[] | null} topTrends
 */
function buildCardMetrics(status, patrol, agentTasks, opsCounts, topTrends, shorts) {
  const slugs = status?.slugs ?? [];
  const actionSlugs = sortSlugsForAdminPanel(slugs).filter((s) => adminSlugFilter(s) === "action");
  const draftCount = slugs.filter((s) => s.publishState === "draft" && !s.adminHidden).length;
  const qualityNg = status?.qualityFailed ?? slugs.filter((s) => !s.qualityOk).length;

  /** @type {Record<string, { stat: string, lines: string[] }>} */
  const byId = {
    articles: {
      stat: String(draftCount),
      statLabel: "公開待ち",
      lines: [
        `要対応 ${actionSlugs.length} · 品質NG ${qualityNg}`,
        ...actionSlugs.slice(0, 2).map((s) => s.shortTitle),
      ],
    },
    tasks: {
      stat: String(opsCounts?.today ?? 0),
      statLabel: "今日のタスク",
      lines: [
        `CEOキュー ${agentTasks?.total ?? 0}件`,
        `オーナー ${opsCounts?.ownerToday ?? 0} · CEO ${opsCounts?.ceoToday ?? 0}`,
      ],
    },
    trends: {
      stat: topTrends?.length ? "TOP3" : "—",
      statLabel: "関心ワード",
      lines: (topTrends ?? []).map((t) => shortKeyword(t)),
    },
    buffer: {
      stat: "自動",
      statLabel: "X投稿",
      lines: ["1日3本まで", "手動操作は不要"],
    },
    promo: {
      stat: `${status?.publishedCount ?? 0}件`,
      statLabel: "公開中",
      lines: ["SNS・紹介文の生成"],
    },
    shorts: {
      stat: `${shorts.uploaded}本`,
      statLabel: "YTアップ済",
      lines: [
        `生成済 ${shorts.generated}本 · 公開 ${shorts.publicCount}本`,
        shorts.uploaded > 0 ? "再生数は YouTube Studio / GA4" : "素材は /dev/shorts/",
      ],
    },
    automation: {
      stat: patrolHealth?.status === "stalled"
        ? "停止気味"
        : patrolHealth?.status === "paused"
          ? "PAUSE"
          : patrol.running
            ? "ON"
            : "OFF",
      statLabel: "品質巡回",
      lines: patrolHealth?.status === "stalled"
        ? [
            `⚠ ${patrolHealth.stalledCount}記事ループ中`,
            patrolHealth.globalStall?.message ?? patrolHealth.message,
          ]
        : patrolHealth?.status === "paused"
          ? [patrolHealth.message]
          : patrol.activeSlug
            ? [`処理中: ${patrol.activeLabel ?? patrol.activeCheckId}`]
            : patrol.running
              ? ["サイクル待機中"]
              : ["停止中"],
    },
    agents: {
      stat: String(agentTasks?.total ?? 0),
      statLabel: "CEOキュー",
      lines: Object.entries(agentTasks?.byAgent ?? {})
        .slice(0, 3)
        .map(([k, v]) => `${k} ${v}`),
    },
    reports: {
      stat: "GA4",
      statLabel: "アクセス",
      lines: ["リアルタイム・記事別", "今後ダッシュボード統合"],
    },
  };

  return byId;
}

export async function loadDashboardData() {
  const [status, patrol, trends, opsQueue] = await Promise.all([
    loadProjectStatus().catch(() => null),
    loadPatrolRuntime(),
    loadTrendingTopics().catch(() => null),
    loadOpsQueue().catch(() => null),
  ]);

  let agentTasks = null;
  try {
    agentTasks = JSON.parse(await readFile(path.join(root, "data/agent-tasks.json"), "utf8"));
  } catch {
    /* optional */
  }

  const opsCounts = opsQueue ? countByTab(opsQueue) : null;
  const topTrends = trends?.trendCards?.slice(0, 3) ?? [];
  const shorts = shortsSummary(status);
  const metrics = buildCardMetrics(status, patrol, agentTasks, opsCounts, topTrends, shorts);

  const cards = [];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const m = metrics[item.id] ?? { stat: "", statLabel: "", lines: [item.desc] };
      const theme = themeForGroup(group.id);
      cards.push({
        id: item.id,
        groupId: group.id,
        groupLabel: group.label,
        groupIcon: group.icon,
        tone: theme.tone,
        gradient: theme.gradient,
        href: item.href,
        title: item.label,
        desc: item.desc,
        stat: m.stat,
        statLabel: m.statLabel ?? "",
        lines: m.lines.filter(Boolean),
      });
    }
  }

  const activeArticle = status?.slugs?.find((s) => s.runState === "active" || s.slug === patrol.activeSlug);

  return {
    status,
    patrol,
    patrolHealth: status?.patrolHealth ?? null,
    topTrends,
    opsCounts,
    agentTasksTotal: agentTasks?.total ?? 0,
    cards,
    activeArticle,
    generatedAt: status?.generatedAt ?? null,
    generatedAtLabel: formatJa(status?.generatedAt),
  };
}
