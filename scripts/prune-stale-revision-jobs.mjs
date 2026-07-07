#!/usr/bin/env node
/**
 * article-revisions.json — 壊れた proposed job を却下
 *   node scripts/prune-stale-revision-jobs.mjs
 *   node scripts/prune-stale-revision-jobs.mjs --dry-run
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const storePath = path.join(root, "data/article-revisions.json");
const dryRun = process.argv.includes("--dry-run");

const STALE_NOTE_RE =
  /提案確認のみ|保存未対応|次フェーズで追加|保存対応は次フェーズ/;

function isBrokenProposal(job) {
  const p = job.proposal;
  if (!p) return false;
  if (job.status !== "proposed") return false;

  if (p.before === p.after) return true;
  if (p.canApply === false) return true;

  if (job.sectionId === "stance") {
    const before = String(p.before || "");
    if (/[〇○◯◎△×？—\-]\s+.+\:\s*$/m.test(before)) return true;
    if (before.includes("自由民主党:") && !before.includes("公言:")) return true;
  }

  return false;
}

/** slug+sectionId ごとに最新1件だけ残す */
function dedupeProposed(jobs) {
  /** @type {Map<string, object>} */
  const latest = new Map();
  for (const job of jobs) {
    if (job.status !== "proposed") continue;
    const key = `${job.slug}|${job.sectionId}`;
    const prev = latest.get(key);
    if (!prev || String(job.createdAt) > String(prev.createdAt)) {
      latest.set(key, job);
    }
  }
  let dupes = 0;
  for (const job of jobs) {
    if (job.status !== "proposed") continue;
    const key = `${job.slug}|${job.sectionId}`;
    if (latest.get(key)?.id !== job.id) {
      job.status = "rejected";
      job.rejectedAt = new Date().toISOString();
      job.updatedAt = job.rejectedAt;
      job.pruneReason = "duplicate-proposed-superseded";
      dupes++;
    }
  }
  return dupes;
}

const raw = JSON.parse(await readFile(storePath, "utf8"));
const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
let pruned = 0;

for (const job of jobs) {
  if (!isBrokenProposal(job)) continue;
  job.status = "rejected";
  job.rejectedAt = new Date().toISOString();
  job.updatedAt = job.rejectedAt;
  job.pruneReason = "stale-noop-or-pre-fix-stance-display";
  pruned++;
}

pruned += dedupeProposed(jobs);

if (pruned === 0) {
  console.log("OK 却下対象の proposed job なし");
  process.exit(0);
}

raw.generatedAt = new Date().toISOString();

if (dryRun) {
  console.log(`dry-run: ${pruned} 件を却下予定`);
  process.exit(0);
}

await writeFile(storePath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
console.log(`OK ${pruned} 件の壊れた proposed job を rejected に更新`);
