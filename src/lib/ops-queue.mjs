import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootFromModule = path.join(__dirname, "../..");

function opsQueuePaths() {
  const cwd = process.cwd();
  return [
    path.join(cwd, "data/ops-queue.json"),
    path.join(cwd, "public/data/ops-queue.json"),
    path.join(rootFromModule, "data/ops-queue.json"),
  ];
}

export async function loadOpsQueue() {
  let lastErr;
  for (const p of opsQueuePaths()) {
    try {
      const raw = await readFile(p, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("ops-queue.json not found");
}
/** @typedef {{ label: string; weight: number; color: string }} OpsProjectMeta */
/** @typedef {{ id: string; project: string; title: string; assignee: 'owner'|'ceo'; horizon: string; priority: number; score: number; etaMin?: number; blocker?: boolean; slug?: string; tags?: string[]; content?: object; links?: { label: string; href: string }[]; done?: boolean }} OpsTask */

/**
 * @param {OpsTask[]} tasks
 * @param {'owner'|'ceo'|null} assignee
 */
function byAssignee(tasks, assignee) {
  if (!assignee) return tasks;
  return tasks.filter((t) => t.assignee === assignee);
}

/**
 * @param {OpsTask[]} tasks
 * @param {string} horizon
 */
function byHorizon(tasks, horizon) {
  if (horizon === "all") return tasks.filter((t) => !t.done);
  if (horizon === "daily") {
    return tasks.filter(
      (t) => !t.done && (t.horizon === "daily" || t.horizon === "today"),
    );
  }
  return tasks.filter((t) => !t.done && t.horizon === horizon);
}

/** @param {OpsTask[]} tasks */
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => b.score - a.score || a.priority - b.priority);
}

/**
 * @param {Awaited<ReturnType<typeof loadOpsQueue>>} queue
 * @param {{ tab?: string; assignee?: string|null }} opts
 */
export function sliceQueue(queue, opts = {}) {
  const tab = opts.tab || "today";
  const assignee = opts.assignee ?? null;
  let tasks = queue.tasks.filter((t) => !t.done);

  if (tab === "today") {
    tasks = sortTasks(byHorizon(tasks, "daily"));
    if (assignee === "owner") tasks = tasks.slice(0, queue.ownerDailyCap ?? 7);
  } else if (tab === "week") {
    tasks = sortTasks(tasks.filter((t) => t.horizon === "weekly" || t.horizon === "daily"));
  } else {
    tasks = sortTasks(tasks);
  }

  if (assignee) tasks = byAssignee(tasks, assignee);

  return tasks;
}

export function countByTab(queue) {
  const active = queue.tasks.filter((t) => !t.done);
  return {
    today: byHorizon(active, "daily").length,
    week: active.filter(
      (t) => t.horizon === "weekly" || t.horizon === "daily" || t.horizon === "today",
    ).length,
    all: active.length,
    ownerToday: sortTasks(byHorizon(active, "daily").filter((t) => t.assignee === "owner")).slice(
      0,
      queue.ownerDailyCap ?? 7,
    ).length,
    ceoToday: byHorizon(active, "daily").filter((t) => t.assignee === "ceo").length,
  };
}

export function assigneeLabel(a) {
  return a === "owner" ? "オーナー" : "CEO";
}

export function priorityLabel(p) {
  return `P${p}`;
}
