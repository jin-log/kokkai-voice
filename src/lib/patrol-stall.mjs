/**
 * 品質巡回の「動いてるが進んでない」検知 — オーナー向け表示・CEOアラート
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTORUN_LOG_PATH } from "./pipeline-autorun-core.mjs";
import { CHECK_LABELS } from "./page-ready.mjs";
import { getPatrolPauseState } from "./patrol-pause.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CEO_ALERTS_PATH = path.join(root, "data/ceo-alerts.json");
const STALL_STATE_PATH = path.join(root, "data/patrol-stall-state.json");

const GLOBAL_STALL_MIN_CYCLES = 3;
const SLUG_STALL_MIN_ATTEMPTS = 3;
const LOG_TAIL_LINES = 4000;

/** @param {string} filePath @param {number} maxLines */
async function readLogTail(filePath, maxLines) {
  try {
    const raw = await readFile(filePath, "utf8");
    return raw.trim().split("\n").slice(-maxLines);
  } catch {
    return [];
  }
}

/** @param {string[]} lines */
function parsePatrolCycles(lines) {
  /** @type {{ at: string, cycle: number, processed: number, completed: number, goldPct: number }[]} */
  const out = [];
  const re =
    /^\[([^\]]+)\] patrol cycle #(\d+) — processed (\d+), completed (\d+), gold (\d+)%/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    out.push({
      at: m[1],
      cycle: Number(m[2]),
      processed: Number(m[3]),
      completed: Number(m[4]),
      goldPct: Number(m[5]),
    });
  }
  return out;
}

/**
 * @param {string} slug
 * @param {string[]} lines
 */
function parseSlugLoop(slug, lines) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const roundRe = new RegExp(
    `^\\[([^\\]]+)\\] ${esc}: round (\\d+) — (\\w+) \\(([^)]+)\\)`,
  );
  const exitRe = new RegExp(`^\\[([^\\]]+)\\] ${esc}: (\\w+) exited (\\d+)`);
  const doneRe = new RegExp(`^\\[([^\\]]+)\\] ${esc}: done (\\d+)%`);

  /** @type {{ at: string, checkId: string, agent: string, exitCode: number|null, goldPct: number|null }[]} */
  const rounds = [];
  let pending = null;

  for (const line of lines) {
    const dm = line.match(doneRe);
    if (dm) {
      if (pending) {
        pending.goldPct = Number(dm[2]);
        rounds.push(pending);
        pending = null;
      }
      continue;
    }
    const rm = line.match(roundRe);
    if (rm) {
      if (pending) rounds.push(pending);
      pending = {
        at: rm[1],
        agent: rm[3],
        checkId: rm[4],
        exitCode: null,
        goldPct: null,
      };
      continue;
    }
    if (pending) {
      const em = line.match(exitRe);
      if (em && em[2] === pending.agent) {
        pending.exitCode = Number(em[3]);
        rounds.push(pending);
        pending = null;
      }
    }
  }
  if (pending) rounds.push(pending);
  return rounds.slice(-12);
}

/**
 * @param {{ checkId: string, agent: string, exitCode: number|null }[]} rounds
 */
function detectSlugStallFromRounds(rounds) {
  if (rounds.length < SLUG_STALL_MIN_ATTEMPTS) return null;

  const tail = rounds.slice(-SLUG_STALL_MIN_ATTEMPTS);
  const checkId = tail[0].checkId;
  const agent = tail[0].agent;
  const allSame = tail.every((r) => r.checkId === checkId && r.agent === agent);
  const allFailed = tail.every((r) => r.exitCode !== null && r.exitCode !== 0);
  if (!allSame || !allFailed) return null;

  const meta = CHECK_LABELS[checkId];
  return {
    checkId,
    checkLabel: meta?.label ?? checkId,
    ownerHint: meta?.todo ?? "",
    agent,
    attempts: tail.length,
    lastAt: tail[tail.length - 1].at,
    loopLine: `${agent} → ${meta?.label ?? checkId} → exit ${tail.map((r) => r.exitCode).join("/")}（${tail.length}回連続）`,
  };
}

/**
 * @param {{ cycle: number, completed: number, goldPct: number, at: string }[]} cycles
 */
function detectGlobalStall(cycles) {
  if (cycles.length < GLOBAL_STALL_MIN_CYCLES) return null;
  const tail = cycles.slice(-GLOBAL_STALL_MIN_CYCLES);
  const gold = tail[0].goldPct;
  const stuck = tail.every((c) => c.completed === 0 && c.goldPct === gold);
  if (!stuck) return null;
  return {
    goldPct: gold,
    cycles: tail.length,
    since: tail[0].at,
    lastAt: tail[tail.length - 1].at,
    message: `完成度 ${gold}% が ${tail.length} サイクル連続で変わらず、1本も完成していません`,
  };
}

/**
 * @param {object} opts
 * @param {{ slug: string, shortTitle: string, goldPct: number, adminHidden?: boolean }[]} opts.slugs
 * @param {object|null} opts.patrolState
 */
export async function analyzePatrolHealth(opts) {
  const { slugs, patrolState = null } = opts;
  const pauseState = await getPatrolPauseState();
  const lines = await readLogTail(AUTORUN_LOG_PATH, LOG_TAIL_LINES);
  const cycles = parsePatrolCycles(lines);
  const globalStall = detectGlobalStall(cycles);

  /** @type {Map<string, object>} */
  const stallBySlug = new Map();
  for (const s of slugs) {
    if (s.adminHidden) continue;
    const rounds = parseSlugLoop(s.slug, lines);
    const stall = detectSlugStallFromRounds(rounds);
    if (stall) {
      stallBySlug.set(s.slug, {
        stalled: true,
        slug: s.slug,
        shortTitle: s.shortTitle,
        goldPct: s.goldPct,
        ...stall,
      });
    }
  }

  const slugStalls = [...stallBySlug.values()].sort(
    (a, b) => b.attempts - a.attempts || a.goldPct - b.goldPct,
  );

  /** @type {'paused'|'stalled'|'progressing'|'idle'} */
  let status = "progressing";
  if (pauseState.paused) status = "paused";
  else if (!patrolState?.running) status = "idle";
  else if (globalStall || slugStalls.length > 0) status = "stalled";

  const statusLabels = {
    paused: "一時停止",
    stalled: "進行停止（ループ中）",
    progressing: "進行中",
    idle: "停止中",
  };

  /** @type {string[]} */
  const parts = [];
  if (pauseState.paused) {
    parts.push(
      pauseState.reason === "obs"
        ? `OBS稼働中（${pauseState.detail ?? "obs"}）のため巡回は止まっています`
        : `手動停止中（${pauseState.detail ?? pauseState.reason}）`,
    );
  }
  if (globalStall) parts.push(globalStall.message);
  if (slugStalls.length > 0) {
    parts.push(
      `${slugStalls.length} 記事が同じチェックで失敗ループ中（自動では越えられない壁の可能性）`,
    );
  }
  if (status === "progressing" && patrolState?.running) {
    parts.push("完成度・公開数が更新されていれば進行中です");
  }

  const health = {
    status,
    statusLabel: statusLabels[status],
    paused: pauseState.paused,
    pauseReason: pauseState.reason,
    pauseDetail: pauseState.detail ?? null,
    globalStall,
    slugStalls,
    stalledCount: slugStalls.length,
    message: parts.join("。") || statusLabels[status],
    analyzedAt: new Date().toISOString(),
    lastPatrolCycleAt: patrolState?.lastCycleAt ?? null,
    patrolRunning: patrolState?.running === true,
  };

  await persistStallState(health);
  await syncCeoStallAlert(health);
  return health;
}

/** @param {Awaited<ReturnType<typeof analyzePatrolHealth>>} health */
async function persistStallState(health) {
  const payload = {
    updatedAt: health.analyzedAt,
    status: health.status,
    globalStall: health.globalStall,
    slugStalls: health.slugStalls.map((s) => ({
      slug: s.slug,
      checkId: s.checkId,
      attempts: s.attempts,
      loopLine: s.loopLine,
      lastAt: s.lastAt,
    })),
  };
  await mkdir(path.dirname(STALL_STATE_PATH), { recursive: true });
  await writeFile(STALL_STATE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** @param {Awaited<ReturnType<typeof analyzePatrolHealth>>} health */
export async function syncCeoStallAlert(health) {
  /** @type {{ alerts: object[] }} */
  let store = { alerts: [] };
  try {
    store = JSON.parse(await readFile(CEO_ALERTS_PATH, "utf8"));
    if (!Array.isArray(store.alerts)) store.alerts = [];
  } catch {
    /* new */
  }

  const alertId = "patrol-stall-active";
  const existing = store.alerts.find((a) => a.id === alertId && !a.resolvedAt);

  if (health.status === "stalled") {
    const body = {
      id: alertId,
      type: "patrol_stall",
      severity: "high",
      assignee: "owner",
      title: "品質巡回：進行停止（ループ中）",
      message: health.message,
      slugStalls: health.slugStalls.slice(0, 8).map((s) => ({
        slug: s.slug,
        title: s.shortTitle,
        loopLine: s.loopLine,
        ownerHint: s.ownerHint,
      })),
      globalStall: health.globalStall,
      createdAt: existing?.createdAt ?? health.analyzedAt,
      updatedAt: health.analyzedAt,
      resolvedAt: null,
      acknowledged: existing?.acknowledged ?? false,
    };
    if (existing) Object.assign(existing, body);
    else store.alerts.unshift(body);
  } else if (existing) {
    existing.resolvedAt = health.analyzedAt;
    existing.message = `解消: ${health.statusLabel}（${health.analyzedAt}）`;
    existing.updatedAt = health.analyzedAt;
  }

  store.alerts = store.alerts.slice(0, 30);
  await mkdir(path.dirname(CEO_ALERTS_PATH), { recursive: true });
  await writeFile(CEO_ALERTS_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

/** @param {string} slug @param {Awaited<ReturnType<typeof analyzePatrolHealth>>} health */
export function stallForSlug(slug, health) {
  return health.slugStalls.find((s) => s.slug === slug) ?? null;
}

/** @returns {Promise<{ status: string, globalStall: object|null, slugStalls: object[] }|null>} */
export async function loadPatrolStallSnapshot() {
  try {
    return JSON.parse(await readFile(STALL_STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 本番ビルド・GitHub JSON 用 — patrol-stall-state から patrolHealth を復元
 * @param {{ slug: string, shortTitle: string, goldPct?: number, adminHidden?: boolean }[]} slugs
 * @param {object|null} snapshot
 * @param {object|null} patrolState
 * @param {{ paused: boolean, reason: string|null, detail?: string }} pauseState
 */
export function healthFromStallSnapshot(slugs, snapshot, patrolState, pauseState) {
  if (!snapshot?.slugStalls?.length) {
    /** @type {'paused'|'idle'|'progressing'} */
    let status = patrolState?.running ? "progressing" : "idle";
    if (pauseState.paused) status = "paused";
    return {
      status,
      statusLabel: status === "paused" ? "一時停止" : status === "idle" ? "停止中" : "進行中",
      paused: pauseState.paused,
      pauseReason: pauseState.reason,
      pauseDetail: pauseState.detail ?? null,
      globalStall: null,
      slugStalls: [],
      stalledCount: 0,
      message:
        status === "paused"
          ? pauseState.reason === "obs"
            ? `OBS稼働中（${pauseState.detail ?? "obs"}）のため巡回は止まっています`
            : `手動停止中（${pauseState.detail ?? pauseState.reason}）`
          : status === "idle"
            ? "品質巡回プロセスが停止中です（ローカルで patrol.ps1 を起動）"
            : "進行中",
      analyzedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      lastPatrolCycleAt: patrolState?.lastCycleAt ?? null,
      patrolRunning: patrolState?.running === true,
    };
  }

  const titleBySlug = new Map(slugs.map((s) => [s.slug, s.shortTitle]));
  const goldBySlug = new Map(slugs.map((s) => [s.slug, s.goldPct ?? 0]));

  const slugStalls = snapshot.slugStalls.map((row) => {
    const meta = CHECK_LABELS[row.checkId];
    return {
      stalled: true,
      slug: row.slug,
      shortTitle: titleBySlug.get(row.slug) ?? row.slug,
      goldPct: goldBySlug.get(row.slug) ?? 0,
      checkId: row.checkId,
      checkLabel: meta?.label ?? row.checkId,
      ownerHint: meta?.todo ?? "",
      agent: "writer",
      attempts: row.attempts,
      lastAt: row.lastAt,
      loopLine: row.loopLine,
    };
  });

  /** @type {'stalled'|'paused'|'idle'|'progressing'} */
  let status = snapshot.status === "stalled" ? "stalled" : "progressing";
  if (pauseState.paused) status = "paused";
  else if (!patrolState?.running && snapshot.status === "stalled") status = "stalled";

  const statusLabels = {
    paused: "一時停止",
    stalled: "進行停止（ループ中）",
    progressing: "進行中",
    idle: "停止中",
  };

  const parts = [];
  if (pauseState.paused) {
    parts.push(
      pauseState.reason === "obs"
        ? `OBS稼働中（${pauseState.detail ?? "obs"}）`
        : `手動停止: ${pauseState.detail ?? pauseState.reason}`,
    );
  }
  if (!patrolState?.running && !pauseState.paused) {
    parts.push("巡回プロセスは停止中（ループ情報は最後の検知結果）");
  }
  if (snapshot.globalStall) parts.push(snapshot.globalStall.message);
  if (slugStalls.length > 0) {
    parts.push(`${slugStalls.length} 記事が同じチェックで失敗ループ中`);
  }

  return {
    status,
    statusLabel: statusLabels[status] ?? status,
    paused: pauseState.paused,
    pauseReason: pauseState.reason,
    pauseDetail: pauseState.detail ?? null,
    globalStall: snapshot.globalStall ?? null,
    slugStalls,
    stalledCount: slugStalls.length,
    message: parts.join("。") || statusLabels[status],
    analyzedAt: snapshot.updatedAt ?? new Date().toISOString(),
    lastPatrolCycleAt: patrolState?.lastCycleAt ?? null,
    patrolRunning: patrolState?.running === true,
  };
}

/**
 * 管理画面用 — ログ解析 or patrol-stall-state.json
 * @param {{ slug: string, shortTitle: string, goldPct?: number, adminHidden?: boolean }[]} slugs
 */
export async function loadPatrolHealthForAdmin(slugs) {
  let patrolState = null;
  try {
    patrolState = JSON.parse(
      await readFile(path.join(root, "data/pipeline-patrol.json"), "utf8"),
    );
  } catch {
    /* optional */
  }
  const pauseState = await getPatrolPauseState();

  const lines = await readLogTail(AUTORUN_LOG_PATH, 500);
  if (lines.length > 80) {
    try {
      return await analyzePatrolHealth({ slugs, patrolState });
    } catch {
      /* fall through */
    }
  }

  const snapshot = await loadPatrolStallSnapshot();
  return healthFromStallSnapshot(slugs, snapshot, patrolState, pauseState);
}
