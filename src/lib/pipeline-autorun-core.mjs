/**
 * パイプライン自動実行コア（1サイクル分）
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessSlug } from "../../scripts/run-case-pipeline.mjs";
import { refreshProjectStatus } from "./project-status.mjs";
import { auditArticleQuality } from "./article-quality.mjs";
import { agentForCheckId, commandForAgent } from "./agent-tasks.mjs";
import { loadArticle } from "./articles.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const AUTORUN_LOG_PATH = path.join(root, "docs/pipeline-autorun.log");

/** @param {string} msg @param {string} [logPath] */
export async function autorunLog(msg, logPath = AUTORUN_LOG_PATH) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${line}\n`, "utf8");
}

/** @param {string} script @param {string[]} [scriptArgs] */
export function runNodeScript(script, scriptArgs = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...scriptArgs], {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

/** @param {string} agent @param {string} slug */
export async function runAgentScript(agent, slug) {
  switch (agent) {
    case "writer":
      return runNodeScript("complete-article.mjs", ["--slug", slug, "--force"]);
    case "x-researcher":
      return runNodeScript("x-research-batch.mjs", ["--slug", slug]);
    case "debugger":
      return runNodeScript("capture-x-screenshots.mjs", ["--slug", slug]);
    case "legal-check":
      return runNodeScript("legal-check.mjs", ["--slug", slug, "--fix"]);
    default:
      return 0;
  }
}

/** @param {string[]} args */
export function parseAgentFilter(args) {
  /** @type {Set<string>} */
  const skipAgents = new Set();
  /** @type {Set<string>|null} */
  let onlyAgents = null;
  const skipIdx = args.indexOf("--skip");
  if (skipIdx >= 0 && args[skipIdx + 1]) {
    for (const a of args[skipIdx + 1].split(",")) {
      if (a.trim()) skipAgents.add(a.trim());
    }
  }
  const onlyIdx = args.indexOf("--agents");
  if (onlyIdx >= 0 && args[onlyIdx + 1]) {
    onlyAgents = new Set();
    for (const a of args[onlyIdx + 1].split(",")) {
      if (a.trim()) onlyAgents.add(a.trim());
    }
  }
  return { skipAgents, onlyAgents };
}

function agentAllowed(agent, filter) {
  if (filter.onlyAgents && !filter.onlyAgents.has(agent)) return false;
  if (filter.skipAgents.has(agent)) return false;
  return true;
}

/** @param {import('./articles.mjs').Article} article @param {{ blockers: { id: string }[] }} gate @param {{ skipAgents?: Set<string>, onlyAgents?: Set<string>|null }} [filter] */
export function pickNextAgent(article, gate, filter = {}) {
  const skipAgents = filter.skipAgents ?? new Set();
  const onlyAgents = filter.onlyAgents ?? null;
  const f = { skipAgents, onlyAgents };

  const quality = auditArticleQuality(article);
  for (const b of quality.blockers) {
    const agent = agentForCheckId(b.id);
    if (agentAllowed(agent, f)) return { agent, reason: b.id };
  }
  for (const b of gate.blockers ?? []) {
    const agent = agentForCheckId(b.id);
    if (agentAllowed(agent, f)) return { agent, reason: b.id };
  }
  return { agent: null, reason: null };
}

/** @param {string} slug */
export async function isSlugComplete(slug) {
  const article = await loadArticle(slug);
  const assessment = await assessSlug(slug);
  const quality = auditArticleQuality(article);
  return assessment.goldPct === 100 && quality.ok;
}

/**
 * @param {object} opts
 * @param {string} [opts.slug]
 * @param {number} [opts.maxRounds]
 * @param {Set<string>} [opts.skipAgents]
 * @param {Set<string>|null} [opts.onlyAgents]
 */
export async function processSlugAutorun(opts) {
  const {
    slug,
    maxRounds = 3,
    log = autorunLog,
    skipAgents = new Set(),
    onlyAgents = null,
  } = opts;
  const agentFilter = { skipAgents, onlyAgents };
  await log(`--- ${slug} ---`);

  for (let round = 1; round <= maxRounds; round++) {
    const article = await loadArticle(slug);
    const assessment = await assessSlug(slug);
    const quality = auditArticleQuality(article);

    if (assessment.goldPct === 100 && quality.ok) {
      await log(`${slug}: 100% + 品質OK`);
      return { slug, ok: true, pct: 100 };
    }

    const next = pickNextAgent(article, assessment.gate, agentFilter);
    if (!next.agent) {
      await log(
        `${slug}: 未解決（round ${round}）gate ${assessment.goldPct}% quality ${quality.ok ? "OK" : "NG"}`,
      );
      break;
    }

    await log(
      `${slug}: round ${round} — ${next.agent} (${next.reason}) → ${commandForAgent(next.agent, slug)}`,
    );
    const code = await runAgentScript(next.agent, slug);
    await refreshProjectStatus();
    if (code !== 0) {
      await log(`${slug}: ${next.agent} exited ${code}`);
    }
  }

  const final = await assessSlug(slug);
  const q = auditArticleQuality(await loadArticle(slug));
  const ok = final.goldPct === 100 && q.ok;
  await log(`${slug}: done ${final.goldPct}% quality ${q.ok ? "OK" : `NG(${q.blockers.length})`}`);
  return { slug, ok, pct: final.goldPct };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.slugFilter]
 * @param {number} [opts.maxRounds]
 * @param {boolean} [opts.incompleteOnly]
 */
export async function loadPatrolSlugs(opts = {}) {
  const { slugFilter, incompleteOnly = true } = opts;
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  let slugs = index.slugs ?? [];
  if (slugFilter) slugs = slugs.filter((s) => s === slugFilter);

  if (!incompleteOnly) return slugs;

  const pending = [];
  for (const slug of slugs) {
    const article = await loadArticle(slug);
    if (article.adminHidden) continue;
    if (await isSlugComplete(slug)) continue;
    const assessment = await assessSlug(slug);
    pending.push({ slug, pct: assessment.goldPct });
  }
  pending.sort((a, b) => a.pct - b.pct);
  return pending.map((p) => p.slug);
}

/**
 * @param {object} [opts]
 * @param {string} [opts.slugFilter]
 * @param {number} [opts.maxRounds]
 * @param {number} [opts.batchSize] 0 = 全件
 * @param {number} [opts.batchOffset] ローテーション用
 * @param {(msg: string) => Promise<void>} [opts.log]
 * @param {Set<string>} [opts.skipAgents]
 * @param {Set<string>|null} [opts.onlyAgents]
 */
export async function runAutorunCycle(opts = {}) {
  const {
    slugFilter,
    maxRounds = 3,
    batchSize = 0,
    batchOffset = 0,
    log = autorunLog,
    skipAgents = new Set(),
    onlyAgents = null,
  } = opts;
  const allIncomplete = await loadPatrolSlugs({ slugFilter, incompleteOnly: true });
  let slugs = allIncomplete;
  if (batchSize > 0 && allIncomplete.length > batchSize) {
    const start = batchOffset % allIncomplete.length;
    slugs = [];
    for (let i = 0; i < batchSize; i++) {
      slugs.push(allIncomplete[(start + i) % allIncomplete.length]);
    }
    await log(`cycle batch ${slugs.length}/${allIncomplete.length} (offset ${start})`);
  }
  /** @type {{ slug: string, ok?: boolean, pct?: number }[]} */
  const results = [];

  if (slugs.length === 0) {
    await log("cycle: 未完了0件 — 全記事 100%+品質OK");
  }

  for (const slug of slugs) {
    try {
      results.push(
        await processSlugAutorun({ slug, maxRounds, log, skipAgents, onlyAgents }),
      );
    } catch (err) {
      await log(`${slug}: fatal ${err instanceof Error ? err.message : String(err)}`);
      results.push({ slug, ok: false });
    }
  }

  await runNodeScript("sync-agent-tasks.mjs", []);
  const status = await refreshProjectStatus();
  const incomplete = results.filter((r) => !r.ok);

  return {
    status,
    slugs,
    allIncomplete,
    results,
    incomplete,
    summary: {
      processed: slugs.length,
      incompleteTotal: allIncomplete.length,
      completed: results.filter((r) => r.ok).length,
      overallGoldPct: status.overallGoldPct,
      overallGatePct: status.overallGatePct,
      qualityFailed: status.qualityFailed,
      activeCount: status.activeCount,
    },
  };
}
