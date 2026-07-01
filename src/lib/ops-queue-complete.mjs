/**
 * オペキュー完了 — data/ops-queue.json 更新 + ログ追記
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const queuePath = path.join(root, "data/ops-queue.json");
const logPath = path.join(root, "data/ops-task-log.jsonl");

/**
 * @param {string} taskId
 * @param {{ by?: string }} opts
 */
export async function completeOpsTask(taskId, opts = {}) {
  const id = taskId?.trim();
  if (!id) throw new Error("taskId が必要です");

  const raw = await readFile(queuePath, "utf8");
  /** @type {{ tasks: { id: string, done?: boolean, title?: string }[], generatedAt?: string }} */
  const queue = JSON.parse(raw);
  const task = queue.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`タスクが見つかりません: ${id}`);
  if (task.done) {
    return { ok: true, already: true, taskId: id, title: task.title };
  }

  task.done = true;
  task.doneAt = new Date().toISOString();
  queue.generatedAt = new Date().toISOString();
  await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");

  const logLine = JSON.stringify({
    taskId: id,
    title: task.title ?? "",
    completedAt: task.doneAt,
    by: opts.by ?? "owner",
  });
  await appendFile(logPath, `${logLine}\n`, "utf8");

  return { ok: true, taskId: id, title: task.title, completedAt: task.doneAt };
}

/**
 * GitHub Contents API 用（CF Functions）
 * @param {object} queue
 * @param {string} taskId
 */
export function applyTaskComplete(queue, taskId) {
  const task = queue.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`タスクが見つかりません: ${taskId}`);
  const completedAt = new Date().toISOString();
  if (!task.done) {
    task.done = true;
    task.doneAt = completedAt;
    queue.generatedAt = completedAt;
  }
  return {
    queue,
    logLine: JSON.stringify({
      taskId,
      title: task.title ?? "",
      completedAt: task.doneAt ?? completedAt,
      by: "owner",
    }),
  };
}
