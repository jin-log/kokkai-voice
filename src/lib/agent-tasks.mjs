/**
 * ゲート・品質監査 → エージェント別タスク（正本）
 * ops-queue / 管理画面 / pipeline-autorun が参照
 */
import { auditArticleQuality } from "./article-quality.mjs";
import { CHECK_LABELS } from "./page-ready.mjs";

/** @type {Record<string, string>} */
export const AGENT_LABELS = {
  writer: "ライター",
  "x-researcher": "X調査",
  debugger: "デバッガー",
  "legal-check": "法務",
  ceo: "CEO",
};

/** チェックID → 担当エージェント */
export function agentForCheckId(id) {
  const k = String(id || "");
  if (k.startsWith("Q")) return "writer";
  if (k.startsWith("H1") || k.startsWith("H2")) return "x-researcher";
  if (k.startsWith("H3")) return "debugger";
  if (k.startsWith("I")) return "legal-check";
  if (k.startsWith("G")) return "writer";
  if (/^[A-FJ]/.test(k)) return "writer";
  return "ceo";
}

/** @param {string} agent */
export function commandForAgent(agent, slug) {
  switch (agent) {
    case "writer":
      return `npm run complete:article -- --slug ${slug} --force`;
    case "x-researcher":
      return `npm run x:research -- --slug ${slug}`;
    case "debugger":
      return `npm run x:capture -- --slug ${slug}`;
    case "legal-check":
      return `npm run legal:check -- --slug ${slug}`;
    default:
      return `node scripts/run-case-pipeline.mjs --slug ${slug}`;
  }
}

/**
 * @param {unknown} article
 * @param {{ blockers: { id: string, detail?: string }[] }} gate
 */
export function buildAgentTasksForArticle(article, gate) {
  const slug = article.slug;
  const quality = auditArticleQuality(article);
  /** @type {{ id: string, slug: string, agent: string, agentLabel: string, checkId: string, title: string, todo: string, command: string, priority: number }[]} */
  const tasks = [];

  for (const b of quality.blockers) {
    const agent = agentForCheckId(b.id);
    tasks.push({
      id: `${slug}:${b.id}`,
      slug,
      agent,
      agentLabel: AGENT_LABELS[agent] ?? agent,
      checkId: b.id,
      title: `[品質] ${b.message}`,
      todo: b.todo,
      command: commandForAgent(agent, slug),
      priority: 10,
    });
  }

  for (const b of gate.blockers ?? []) {
    const agent = agentForCheckId(b.id);
    const meta = CHECK_LABELS[b.id];
    tasks.push({
      id: `${slug}:${b.id}`,
      slug,
      agent,
      agentLabel: AGENT_LABELS[agent] ?? agent,
      checkId: b.id,
      title: `[ゲート] ${meta?.label ?? b.id}`,
      todo: meta?.todo ?? b.detail ?? "",
      command: commandForAgent(agent, slug),
      priority: b.id.startsWith("H") ? 20 : 30,
    });
  }

  const seen = new Set();
  return tasks
    .filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

/** @param {unknown[]} articlesWithGates — { article, gate }[] */
export function buildAllAgentTasks(articlesWithGates) {
  const all = [];
  for (const { article, gate } of articlesWithGates) {
    all.push(...buildAgentTasksForArticle(article, gate));
  }
  const byAgent = {};
  for (const t of all) {
    byAgent[t.agent] = (byAgent[t.agent] ?? 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    total: all.length,
    byAgent,
    tasks: all,
  };
}
