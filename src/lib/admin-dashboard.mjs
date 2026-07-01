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

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

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
function buildCardMetrics(status, patrol, agentTasks, opsCounts, topTrends) {
  const slugs = status?.slugs ?? [];
  const actionSlugs = sortSlugsForAdminPanel(slugs).filter((s) => adminSlugFilter(s) === "action");
  const draftCount = slugs.filter((s) => s.publishState === "draft" && !s.adminHidden).length;
  const qualityNg = status?.qualityFailed ?? slugs.filter((s) => !s.qualityOk).length;

  /** @type {Record<string, { stat: string, lines: string[] }>} */
  const byId = {
    articles: {
      stat: `${draftCount}件 公開待ち`,
      lines: [
        `要対応 ${actionSlugs.length}件 · 品質NG ${qualityNg}件`,
        ...actionSlugs.slice(0, 2).map((s) => s.shortTitle),
      ],
    },
    tasks: {
      stat: `${opsCounts?.today ?? 0}件 今日`,
      lines: [
        `CEOキュー ${agentTasks?.total ?? 0}件`,
        `オーナー今日 ${opsCounts?.ownerToday ?? 0} · CEO ${opsCounts?.ceoToday ?? 0}`,
      ],
    },
    trends: {
      stat: topTrends?.length ? `上位${topTrends.length}件` : "未取得",
      lines: (topTrends ?? []).map((t) => shortKeyword(t)),
    },
    buffer: {
      stat: "自動投稿",
      lines: ["deploy時にXへ投稿（1日3本まで）", "手動操作は不要"],
    },
    promo: {
      stat: `${status?.publishedCount ?? 0}件 公開中`,
      lines: ["SNS・紹介文の生成"],
    },
    automation: {
      stat: patrol.running ? "巡回 ON" : "巡回 OFF",
      lines: patrol.activeSlug
        ? [`処理中: ${patrol.activeLabel ?? patrol.activeCheckId}`]
        : patrol.running
          ? ["サイクル間隔中（未着手は×表示）"]
          : ["品質巡回は停止中"],
    },
    agents: {
      stat: `${agentTasks?.total ?? 0}件`,
      lines: Object.entries(agentTasks?.byAgent ?? {})
        .slice(0, 3)
        .map(([k, v]) => `${k} ${v}`),
    },
    reports: {
      stat: "GA4",
      lines: ["リアルタイム・記事別レポート", "今後ここに統合予定"],
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
  const metrics = buildCardMetrics(status, patrol, agentTasks, opsCounts, topTrends);

  const cards = [];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const m = metrics[item.id] ?? { stat: "", lines: [item.desc] };
      cards.push({
        id: item.id,
        groupId: group.id,
        groupLabel: group.label,
        groupIcon: group.icon,
        href: item.href,
        title: item.label,
        desc: item.desc,
        stat: m.stat,
        lines: m.lines.filter(Boolean),
      });
    }
  }

  const activeArticle = status?.slugs?.find((s) => s.runState === "active" || s.slug === patrol.activeSlug);

  return {
    status,
    patrol,
    topTrends,
    opsCounts,
    agentTasksTotal: agentTasks?.total ?? 0,
    cards,
    activeArticle,
    generatedAt: status?.generatedAt ?? null,
    generatedAtLabel: formatJa(status?.generatedAt),
  };
}
