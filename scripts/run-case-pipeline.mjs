#!/usr/bin/env node
/**
 * 案件パイプライン実行（順番固定・毎回これ）
 *
 * Usage:
 *   node scripts/run-case-pipeline.mjs              # active 全件レポート
 *   node scripts/run-case-pipeline.mjs --slug X     # 1件 + 次アクション
 *   node scripts/run-case-pipeline.mjs --promote    # 全件100%なら次5件を active へ
 *   node scripts/run-case-pipeline.mjs --deploy     # ゲート通過分だけ deploy
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import {
  PIPELINE_ITEMS,
  pipelineChecks,
  refreshProjectStatus,
} from "../src/lib/project-status.mjs";
import { loadArticle } from "../src/lib/articles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 5;

const STEP_ORDER = [
  { id: "content", action: "writer", cmd: "記事レイヤー（A-F）投入" },
  { id: "matrix", action: "writer", cmd: "policy-matrix + stanceMatrix" },
  { id: "x", action: "x-researcher", cmd: "npm run x:research -- --slug {slug}" },
  { id: "x_capture", action: "debugger", cmd: "npm run x:capture -- --slug {slug}" },
  { id: "legal", action: "legal-check", cmd: "npm run legal:check -- --slug {slug}" },
  { id: "deployed", action: "ceo", cmd: "npm run deploy" },
  { id: "debug", action: "debugger", cmd: "本番確認 → qaReview.status: ok" },
];

async function loadIndex() {
  return JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
}

async function loadParked() {
  return JSON.parse(await readFile(path.join(root, "data/articles/parked.json"), "utf8"));
}

async function saveIndex(index) {
  index.count = index.slugs.length;
  index.updatedAt = new Date().toISOString();
  await writeFile(
    path.join(root, "data/articles/index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );
}

async function saveParked(parked) {
  parked.updatedAt = new Date().toISOString();
  await writeFile(
    path.join(root, "data/articles/parked.json"),
    `${JSON.stringify(parked, null, 2)}\n`,
    "utf8",
  );
}

async function loadPolicyMatrix(article, slug) {
  try {
    const sm = article.stanceMatrix;
    const matrixPath = sm?.dataPath
      ? path.join(root, sm.dataPath)
      : path.join(root, `data/policy-matrix/${sm?.policySlug || slug}.json`);
    return JSON.parse(await readFile(matrixPath, "utf8"));
  } catch {
    return null;
  }
}

export async function assessSlug(slug) {
  const article = await loadArticle(slug);
  const gate = await checkCasePageWithFiles(article);
  const policyMatrix = await loadPolicyMatrix(article, slug);
  const pipeline = pipelineChecks(article, gate, policyMatrix);
  const goldPct = Math.round(
    (pipeline.filter((p) => p.ok).length / pipeline.length) * 100,
  );

  let next = null;
  for (const step of STEP_ORDER) {
    const item = pipeline.find((p) => p.id === step.id);
    if (item && !item.ok) {
      next = { ...step, detail: gate.blockers.find((b) => b.id)?.detail };
      break;
    }
  }

  return { slug, goldPct, published: gate.ok, pipeline, gate, next };
}

export async function reportBatch(slugs) {
  const results = [];
  for (const slug of slugs) {
    results.push(await assessSlug(slug));
  }
  return results;
}

export async function promoteIfReady() {
  const index = await loadIndex();
  const parked = await loadParked();
  const results = await reportBatch(index.slugs);

  const all100 = results.every((r) => r.goldPct === 100);
  if (!all100) {
    const pending = results.filter((r) => r.goldPct < 100).map((r) => r.slug);
    console.log(`昇格不可: 未100% → ${pending.join(", ")}`);
    return false;
  }

  if (parked.slugs.length === 0) {
    console.log("昇格不可: parked 空");
    return false;
  }

  const add = parked.slugs.splice(0, BATCH_SIZE);
  index.slugs.push(...add);
  await saveIndex(index);
  await saveParked(parked);
  console.log(`昇格: ${add.join(", ")} → active (${index.slugs.length}件)`);
  return true;
}

function printResult(r) {
  const icon = r.goldPct === 100 ? "✅" : r.published ? "🟡" : "⬜";
  console.log(`\n${icon} ${r.slug} — ${r.goldPct}%`);
  for (const p of r.pipeline) {
    console.log(`  ${p.ok ? "✓" : "○"} ${p.label}`);
  }
  if (r.next) {
    console.log(`  → 次: [${r.next.action}] ${r.next.cmd}`);
  } else if (r.goldPct === 100) {
    console.log(`  → 完了`);
  }
}

const args = process.argv.slice(2);
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;

if (args.includes("--promote")) {
  const ok = await promoteIfReady();
  process.exit(ok ? 0 : 1);
}

const index = await loadIndex();
const targets = slugArg ? [slugArg] : index.slugs;
const results = await reportBatch(targets);

for (const r of results) printResult(r);

const status = await refreshProjectStatus();
console.log(`\n--- バッチ ---`);
console.log(`active: ${index.slugs.length} · 平均完成度: ${status.overallGoldPct}%`);
console.log(`公開: ${status.publishedCount}/${status.activeCount}`);

const anyIncomplete = results.some((r) => r.goldPct < 100);
if (anyIncomplete && !args.includes("--ok-if-partial")) process.exit(2);
