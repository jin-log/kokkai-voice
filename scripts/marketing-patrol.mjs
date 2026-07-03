#!/usr/bin/env node
/**
 * 配信の欠落検知 + ローカルフォールバック（patrol から毎サイクル呼ぶ）
 * - 12:30 JST 以降：昼X3選未投稿なら buffer:digest
 * - 20:00 JST 以降：夜X未投稿なら buffer:hot（閾値未達はスクリプト側で SKIP）
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPromoPublishQueue } from "../src/lib/promo-publish-queue.mjs";
import {
  digestPostedToday,
  hotPostedToday,
  readXPostLog,
  todayJst,
} from "../src/lib/x-post-log.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function jstNow() {
  return new Date(Date.now() + 9 * 3600000);
}

function jstMinutesSinceMidnight() {
  const d = jstNow();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function runScript(rel, extraArgs = []) {
  const script = path.join(root, rel);
  const r = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  return {
    ok: r.status === 0,
    status: r.status ?? 1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

/**
 * @param {{ log?: (msg: string) => Promise<void> }} [opts]
 */
export async function runMarketingPatrol(opts = {}) {
  const log = opts.log ?? (async (m) => console.log(m));
  const day = todayJst();
  const xLog = await readXPostLog();
  const mins = jstMinutesSinceMidnight();
  /** @type {string[]} */
  const actions = [];
  /** @type {string[]} */
  const alerts = [];

  const digestOk = digestPostedToday(xLog, day);
  const hotOk = hotPostedToday(xLog, day);

  if (!digestOk && mins >= 12 * 60 + 30) {
    const r = runScript("scripts/post-daily-digest.mjs");
    if (r.ok || /SKIP 本日/.test(r.stdout)) {
      actions.push("noon-digest");
      await log(`marketing: 昼Xフォールバック ${r.ok ? "投稿" : "SKIP"}`);
    } else {
      alerts.push(`昼X未投稿・フォールバック失敗: ${(r.stderr || r.stdout).trim().slice(0, 200)}`);
      await log(`marketing: 昼X NG — ${alerts[alerts.length - 1]}`);
    }
  }

  if (!hotOk && mins >= 20 * 60) {
    const r = runScript("scripts/post-hot-single.mjs");
    if (r.ok || /SKIP/.test(r.stdout)) {
      actions.push("hot-single");
      await log(`marketing: 夜Xフォールバック ${r.ok ? "投稿" : "SKIP"}`);
    } else if (!/NG/.test(r.stderr)) {
      await log("marketing: 夜X SKIP（閾値未達の可能性）");
    } else {
      alerts.push(`夜Xフォールバック失敗: ${(r.stderr || r.stdout).trim().slice(0, 200)}`);
    }
  }

  const queue = await loadPromoPublishQueue();
  if (queue.pending.length > 0) {
    alerts.push(`はてな/noteキュー ${queue.pending.length} 件滞留`);
  }

  return {
    day,
    digestOk: digestOk || actions.includes("noon-digest"),
    hotOk: hotOk || actions.includes("hot-single"),
    queuePending: queue.pending.length,
    actions,
    alerts,
    needsPush: actions.length > 0,
  };
}

if (import.meta.url.startsWith("file:")) {
  const invoked = process.argv[1] && path.resolve(process.argv[1]);
  const self = path.resolve(fileURLToPath(import.meta.url));
  if (invoked === self) {
    runMarketingPatrol().then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.alerts.length && !r.actions.length ? 1 : 0);
    });
  }
}
