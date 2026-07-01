/**
 * 品質巡回の実行中スラグ・チェックID（管理画面のくるくる表示用）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECK_LABELS } from "./page-ready.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = path.join(root, "docs/pipeline-autorun.log");
const patrolStatePath = path.join(root, "data/pipeline-patrol.json");

/** @returns {Promise<{ running: boolean, activeSlug: string|null, activeCheckId: string|null, activeAgent: string|null, activeLabel: string|null }>} */
export async function loadPatrolRuntime() {
  const base = {
    running: false,
    activeSlug: null,
    activeCheckId: null,
    activeAgent: null,
    activeLabel: null,
  };

  try {
    const patrol = JSON.parse(await readFile(patrolStatePath, "utf8"));
    base.running = patrol.running === true;
  } catch {
    /* optional */
  }

  try {
    const raw = await readFile(logPath, "utf8");
    const lines = raw.trim().split("\n").slice(-400);
    /** @type {Map<string, { checkId: string, agent: string }>} */
    const inFlight = new Map();

    for (const line of lines) {
      const round = line.match(/^\[[^\]]+\] ([^:]+): round \d+ — (\S+) \(([^)]+)\)/);
      if (round) {
        inFlight.set(round[1], { checkId: round[3], agent: round[2] });
        continue;
      }
      const done = line.match(/^\[[^\]]+\] ([^:]+): done /);
      if (done) inFlight.delete(done[1]);
    }

    const last = [...inFlight.entries()].pop();
    if (last) {
      const [slug, { checkId, agent }] = last;
      base.activeSlug = slug;
      base.activeCheckId = checkId;
      base.activeAgent = agent;
      base.activeLabel = CHECK_LABELS[checkId]?.label ?? checkId;
    }
  } catch {
    /* no log */
  }

  return base;
}

/**
 * 未完了チェックのみ（完了は含めない）
 * @param {string} slug
 * @param {{ blockers: { id: string }[] }} gate
 * @param {{ blockers: { id: string, message: string }[] }} quality
 * @param {{ activeSlug: string|null, activeCheckId: string|null, activeLabel: string|null }} runtime
 */
export function buildWorkItems(slug, gate, quality, runtime) {
  /** @type {{ id: string, label: string, state: 'active'|'blocked' }[]} */
  const items = [];
  const seen = new Set();

  const push = (id, label) => {
    if (seen.has(id)) return;
    seen.add(id);
    const isActive =
      runtime.activeSlug === slug &&
      (runtime.activeCheckId === id || items.length === 0 && runtime.activeSlug === slug);
    items.push({
      id,
      label: label || CHECK_LABELS[id]?.label || id,
      state: isActive ? "active" : "blocked",
    });
  };

  for (const b of quality.blockers) push(b.id, b.message?.slice(0, 24));
  for (const b of gate.blockers) push(b.id, CHECK_LABELS[b.id]?.label);

  if (runtime.activeSlug === slug && runtime.activeCheckId && !seen.has(runtime.activeCheckId)) {
    items.unshift({
      id: runtime.activeCheckId,
      label: runtime.activeLabel || runtime.activeCheckId,
      state: "active",
    });
  }

  if (items.length > 1 && runtime.activeSlug === slug) {
    for (const it of items) {
      if (it.state === "active") continue;
      it.state = "blocked";
    }
    const active = items.find((i) => i.id === runtime.activeCheckId);
    if (active) active.state = "active";
    else if (items[0]) items[0].state = "active";
  }

  return items;
}
