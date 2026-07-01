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
const patrolDaemonPath = path.join(root, "data/pipeline-patrol-daemon.json");
const xCaptureDaemonPath = path.join(root, "data/x-capture-daemon.json");

function trimLabel(text, max = 40) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** @returns {Promise<{ running: boolean, activeSlug: string|null, activeCheckId: string|null, activeAgent: string|null, activeLabel: string|null, batchSlugs: string[], xCaptureRunning: boolean }>} */
export async function loadPatrolRuntime() {
  const base = {
    running: false,
    activeSlug: null,
    activeCheckId: null,
    activeAgent: null,
    activeLabel: null,
    batchSlugs: [],
    xCaptureRunning: false,
  };

  try {
    const patrol = JSON.parse(await readFile(patrolStatePath, "utf8"));
    base.running = patrol.running === true;
    const incomplete = patrol.lastCycle?.incompleteSlugs ?? [];
    const batchSize = patrol.batchSize ?? 3;
    base.batchSlugs = incomplete.slice(0, batchSize);
  } catch {
    /* optional */
  }

  try {
    const daemon = JSON.parse(await readFile(patrolDaemonPath, "utf8"));
    if (daemon.childRunning || daemon.running) base.running = true;
  } catch {
    /* optional */
  }

  try {
    const xc = JSON.parse(await readFile(xCaptureDaemonPath, "utf8"));
    base.xCaptureRunning = xc.running === true && xc.lastAction === "capture";
  } catch {
    /* optional */
  }

  try {
    const raw = await readFile(logPath, "utf8");
    const lines = raw.trim().split("\n").slice(-500);
    /** @type {Map<string, { checkId: string, agent: string }>} */
    const inFlight = new Map();

    for (const line of lines) {
      const round = line.match(/^\[[^\]]+\] ([^:]+): round \d+ — (\S+) \(([^)]+)\)/);
      if (round) {
        inFlight.set(round[1], { checkId: round[3], agent: round[2] });
        continue;
      }
      const sweep = line.match(/^\[[^\]]+\] \[x-capture\] capture start/);
      if (sweep) {
        inFlight.set("__x_capture__", { checkId: "H3_x_screenshot", agent: "debugger" });
        continue;
      }
      const sweepDone = line.match(/^\[[^\]]+\] \[x-capture\] capture done/);
      if (sweepDone) inFlight.delete("__x_capture__");
      const done = line.match(/^\[[^\]]+\] ([^:]+): done /);
      if (done) inFlight.delete(done[1]);
    }

    const last = [...inFlight.entries()].pop();
    if (last && last[0] !== "__x_capture__") {
      const [slug, { checkId, agent }] = last;
      base.activeSlug = slug;
      base.activeCheckId = checkId;
      base.activeAgent = agent;
      base.activeLabel = CHECK_LABELS[checkId]?.label ?? checkId;
    } else if (last?.[0] === "__x_capture__") {
      base.activeCheckId = "H3_x_screenshot";
      base.activeAgent = "debugger";
      base.activeLabel = "Xスクショ";
    }
  } catch {
    /* no log */
  }

  return base;
}

/**
 * 未完了チェック + パイプライン未達
 * @param {string} slug
 * @param {{ blockers: { id: string }[] }} gate
 * @param {{ blockers: { id: string, message: string }[], warnings?: { id: string, message: string }[] }} quality
 * @param {{ activeSlug: string|null, activeCheckId: string|null, activeLabel: string|null, running?: boolean, batchSlugs?: string[], xCaptureRunning?: boolean }} runtime
 * @param {{ id: string, label: string, ok: boolean, preDeploy?: boolean }[]} [pipeline]
 */
export function buildWorkItems(slug, gate, quality, runtime, pipeline = []) {
  /** @type {{ id: string, label: string, state: 'active'|'blocked' }[]} */
  const items = [];
  const seen = new Set();

  const push = (id, label) => {
    if (seen.has(id)) return;
    seen.add(id);
    items.push({
      id,
      label: label || CHECK_LABELS[id]?.label || id,
      state: "blocked",
    });
  };

  for (const b of quality.blockers) {
    push(b.id, trimLabel(b.message || CHECK_LABELS[b.id]?.label));
  }
  for (const b of gate.blockers) {
    push(b.id, CHECK_LABELS[b.id]?.label || b.id);
  }

  for (const step of pipeline) {
    if (step.ok) continue;
    push(`pipe:${step.id}`, step.label);
  }

  const inPatrolBatch =
    runtime.running && (runtime.batchSlugs ?? []).includes(slug);
  const logActive =
    runtime.activeSlug === slug &&
    runtime.activeCheckId &&
    seen.has(runtime.activeCheckId);

  if (logActive) {
    const hit = items.find((i) => i.id === runtime.activeCheckId);
    if (hit) hit.state = "active";
  } else if (inPatrolBatch && items.length > 0) {
    items[0].state = "active";
  } else if (
    runtime.xCaptureRunning &&
    (seen.has("H3_x_screenshot") || items.some((i) => i.id === "pipe:x"))
  ) {
    const shot = items.find((i) => i.id === "H3_x_screenshot" || i.id === "pipe:x");
    if (shot) shot.state = "active";
  } else if (runtime.activeSlug === slug && runtime.activeCheckId && !seen.has(runtime.activeCheckId)) {
    items.unshift({
      id: runtime.activeCheckId,
      label: runtime.activeLabel || runtime.activeCheckId,
      state: "active",
    });
  }

  if (items.length > 1 && runtime.activeCheckId) {
    for (const it of items) {
      it.state = it.id === runtime.activeCheckId ? "active" : "blocked";
    }
  }

  return items;
}
