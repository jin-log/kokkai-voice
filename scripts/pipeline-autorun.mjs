#!/usr/bin/env node
/**
 * パイプライン自動実行 — ゲート・品質NGを検出し担当エージェント用スクリプトを順次実行
 *
 * Usage:
 *   npm run pipeline:autorun
 *   npm run pipeline:autorun -- --deploy
 *   npm run pipeline:autorun -- --slug case-mqzxj4ro
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessSlug } from "./run-case-pipeline.mjs";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";
import { auditArticleQuality } from "../src/lib/article-quality.mjs";
import { agentForCheckId, commandForAgent } from "../src/lib/agent-tasks.mjs";
import { loadArticle } from "../src/lib/articles.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "docs/pipeline-autorun.log");

const args = process.argv.slice(2);
const doDeploy = args.includes("--deploy");
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const MAX_ROUNDS = 3;

async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${line}\n`, "utf8");
}

function runNode(script, scriptArgs = []) {
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
async function runAgent(agent, slug) {
  switch (agent) {
    case "writer":
      return runNode("complete-article.mjs", ["--slug", slug, "--force"]);
    case "x-researcher":
      return runNode("x-research-batch.mjs", ["--slug", slug]);
    case "debugger":
      return runNode("capture-x-screenshots.mjs", ["--slug", slug]);
    case "legal-check":
      return runNode("legal-check.mjs", ["--slug", slug, "--fix"]);
    default:
      return 0;
  }
}

/** @param {import('../src/lib/articles.mjs').Article} article @param {{ blockers: { id: string }[] }} gate */
function pickNextAgent(article, gate) {
  const quality = auditArticleQuality(article);
  if (!quality.ok && quality.blockers[0]) {
    return { agent: agentForCheckId(quality.blockers[0].id), reason: quality.blockers[0].id };
  }
  if (gate.blockers[0]) {
    return { agent: agentForCheckId(gate.blockers[0].id), reason: gate.blockers[0].id };
  }
  return { agent: null, reason: null };
}

async function loadActiveSlugs() {
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  const slugs = index.slugs ?? [];
  return slugArg ? slugs.filter((s) => s === slugArg) : slugs;
}

async function processSlug(slug) {
  await log(`--- ${slug} ---`);

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const article = await loadArticle(slug);
    let assessment = await assessSlug(slug);
    const quality = auditArticleQuality(article);

    if (assessment.goldPct === 100 && quality.ok) {
      await log(`${slug}: 100% + 品質OK`);
      return { slug, ok: true };
    }

    const next = pickNextAgent(article, assessment.gate);
    if (!next.agent) {
      await log(`${slug}: 未解決（round ${round}）gate ${assessment.goldPct}% quality ${quality.ok ? "OK" : "NG"}`);
      break;
    }

    await log(
      `${slug}: round ${round} — ${next.agent} (${next.reason}) → ${commandForAgent(next.agent, slug)}`,
    );
    const code = await runAgent(next.agent, slug);
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

async function main() {
  await log("pipeline-autorun start (quality-aware)");
  const slugs = await loadActiveSlugs();
  const results = [];

  for (const slug of slugs) {
    try {
      results.push(await processSlug(slug));
    } catch (err) {
      await log(`${slug}: fatal ${err instanceof Error ? err.message : String(err)}`);
      results.push({ slug, ok: false });
    }
  }

  await runNode("sync-agent-tasks.mjs", []);
  const status = await refreshProjectStatus();
  await log(
    `done — quality NG ${status.qualityFailed ?? "?"}/${status.activeCount}, public ${status.publishedCount}`,
  );

  const incomplete = results.filter((r) => !r.ok);
  if (incomplete.length > 0) {
    await log(`incomplete: ${incomplete.map((r) => r.slug).join(", ")}`);
    process.exitCode = 2;
  }

  if (doDeploy) {
    await log("deploy skipped in this revision — use npm run deploy after 100%");
  }
}

main().catch(async (err) => {
  await log(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
