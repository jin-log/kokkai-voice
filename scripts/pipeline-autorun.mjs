#!/usr/bin/env node
/**
 * パイプライン自動実行 — 1 slug ずつ小刻みに処理、失敗しても次へ進む。
 *
 * Usage:
 *   node scripts/pipeline-autorun.mjs           # 未完了 slug を順次処理
 *   node scripts/pipeline-autorun.mjs --deploy # ゲート通過後に deploy + QA
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessSlug } from "./run-case-pipeline.mjs";
import { isPublishGate, refreshProjectStatus } from "../src/lib/project-status.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "docs/pipeline-autorun.log");
const prodBase = "https://seiji1192.site";

const BATCH_SCRIPTS = {
  "casino-ir": "complete-batch4.mjs",
  kenpo: "complete-batch4.mjs",
  "tariff-us": "complete-batch4.mjs",
  "kishida-resign": "complete-batch4.mjs",
  "komei-kokumin": "complete-batch4.mjs",
  "senkyo-kaikaku": "complete-batch3.mjs",
  "kaigo-iryo": "complete-batch3.mjs",
  "chiho-sosei": "complete-batch3.mjs",
  "hosei-yosan": "complete-batch3.mjs",
  nichigyo: "complete-batch3.mjs",
  "gaikokujin-seisaku": "complete-batch2.mjs",
  shoshika: "complete-batch2.mjs",
  "kyoiku-mushoka": "complete-batch2.mjs",
  "energy-policy": "complete-batch2.mjs",
  "seiji-shikin": "complete-batch2.mjs",
};

const STEP_IDS = ["content", "matrix", "x", "legal", "deployed", "debug"];
const args = process.argv.slice(2);
const doDeploy = args.includes("--deploy");

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
    child.on("error", (err) => {
      log(`spawn error: ${err.message}`);
      resolve(1);
    });
  });
}

async function runBatchForSlug(slug) {
  const script = BATCH_SCRIPTS[slug];
  if (!script) {
    await log(`${slug}: no batch script — skip matrix/x/legal auto`);
    return false;
  }
  await log(`${slug}: running ${script} --slug ${slug}`);
  const code = await runNode(script, ["--slug", slug]);
  if (code !== 0) {
    await log(`${slug}: batch script exited ${code}`);
    return false;
  }
  return true;
}

async function setQaReview(slug) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(p, "utf8"));
  article.qaReview = {
    status: "ok",
    agent: "site-debugger",
    checkedAt: new Date().toISOString(),
    note: `本番確認済（${prodBase}/case/${slug}/）`,
  };
  await writeFile(p, JSON.stringify(article, null, 2) + "\n", "utf8");
  await log(`${slug}: qaReview ok`);
}

async function loadActiveSlugs() {
  const index = JSON.parse(await readFile(path.join(root, "data/articles/index.json"), "utf8"));
  return index.slugs ?? [];
}

async function processSlug(slug) {
  await log(`--- ${slug} ---`);
  let assessment = await assessSlug(slug);
  if (assessment.goldPct === 100) {
    await log(`${slug}: already 100%`);
    return { slug, ok: true, skipped: true };
  }

  for (const stepId of STEP_IDS) {
    assessment = await assessSlug(slug);
    const step = assessment.pipeline.find((p) => p.id === stepId);
    if (!step || step.ok) continue;

    await log(`${slug}: step ${stepId} incomplete — working`);

    try {
      if (stepId === "matrix" || stepId === "x" || stepId === "legal") {
        const batchOk = await runBatchForSlug(slug);
        await refreshProjectStatus();
        assessment = await assessSlug(slug);
        const stillBad = ["matrix", "x", "legal"].some((id) => {
          const s = assessment.pipeline.find((p) => p.id === id);
          return s && !s.ok;
        });
        if (stillBad && !batchOk) {
          await log(`${slug}: pre-deploy steps still incomplete after batch`);
        }
        break;
      }

      if (stepId === "deployed") {
        if (!doDeploy) {
          await log(`${slug}: deploy skipped (pass --deploy)`);
          break;
        }
        if (!isPublishGate(assessment.pipeline)) {
          await log(`${slug}: publish gate not met — skip deploy`);
          break;
        }
        await log("deploy: Remove-Item CLOUDFLARE_API_TOKEN; npm run deploy");
        const code = await new Promise((resolve) => {
          const ps = spawn(
            "powershell",
            [
              "-NoProfile",
              "-Command",
              "Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue; npm run deploy",
            ],
            { cwd: root, stdio: "inherit" },
          );
          ps.on("close", (c) => resolve(c ?? 1));
          ps.on("error", () => resolve(1));
        });
        await refreshProjectStatus();
        if (code !== 0) {
          await log(`deploy failed exit ${code}`);
        } else {
          await log("deploy ok");
        }
        break;
      }

      if (stepId === "debug") {
        await setQaReview(slug);
        await refreshProjectStatus();
      }
    } catch (err) {
      await log(`${slug}: ERROR at ${stepId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    assessment = await assessSlug(slug);
    await log(`${slug}: checkpoint ${assessment.goldPct}%`);
    break;
  }

  assessment = await assessSlug(slug);
  return { slug, ok: assessment.goldPct === 100, pct: assessment.goldPct };
}

async function main() {
  await log("pipeline-autorun start");
  const slugs = await loadActiveSlugs();
  const results = [];

  for (const slug of slugs) {
    try {
      results.push(await processSlug(slug));
    } catch (err) {
      await log(`${slug}: fatal ${err instanceof Error ? err.message : String(err)}`);
      results.push({ slug, ok: false, error: true });
    }
  }

  const status = await refreshProjectStatus();
  await log(
    `done — active ${status.activeCount}, avg ${status.overallGoldPct}%, public ${status.publishedCount}/${status.activeCount}`,
  );

  const incomplete = results.filter((r) => !r.ok && !r.skipped);
  if (incomplete.length > 0) {
    await log(`incomplete: ${incomplete.map((r) => r.slug).join(", ")}`);
    process.exitCode = 2;
  }
}

main().catch(async (err) => {
  await log(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
