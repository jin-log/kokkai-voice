#!/usr/bin/env node
/**
 * 巡回結果を main に push して本番デプロイを起動（管理画面％同期）
 *
 *   node scripts/push-and-deploy.mjs
 *   node scripts/push-and-deploy.mjs --force
 */
import { execFile } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const execFileAsync = promisify(execFile);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "data/deploy-push-state.json");
const MIN_INTERVAL_MS = 10 * 60 * 1000;
const force = process.argv.includes("--force");

const GIT_PATHS = [
  "data/articles",
  "data/policy-matrix",
  "data/agent-tasks.json",
  "data/project-status.json",
  "public/assets/x-screenshots",
  "functions",
  "scripts",
  "src/lib",
  "src/pages/dev",
  "src/styles/admin-revise.css",
  ".github/workflows",
  "package.json",
  "docs/chrome-profile.example.json",
];

async function run(cmd, args, opts = {}) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
  return { stdout: stdout?.trim() ?? "", stderr: stderr?.trim() ?? "" };
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}

async function saveState(patch) {
  const prev = await loadState();
  await writeFile(statePath, `${JSON.stringify({ ...prev, ...patch }, null, 2)}\n`, "utf8");
}

async function hasGit() {
  try {
    await run("git", ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

async function dispatchDeploy() {
  try {
    await run("gh", ["workflow", "run", "deploy.yml", "--ref", "main"]);
    console.log("OK deploy.yml を起動");
    return true;
  } catch {
    try {
      await run("npm", ["run", "deploy:site"], { shell: true });
      console.log("OK ローカル deploy:site 完了");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`NG デプロイ起動失敗: ${msg}`);
      return false;
    }
  }
}

export async function pushAndDeploy(opts = {}) {
  const forceRun = opts.force === true || force;
  if (!(await hasGit())) {
    console.log("skip push-and-deploy: git なし");
    return { pushed: false, reason: "no-git" };
  }

  const prev = await loadState();
  const lastAt = prev.lastPushAt ? new Date(prev.lastPushAt).getTime() : 0;

  const status = await refreshProjectStatus();
  try {
    await run("node", ["scripts/sync-agent-tasks.mjs"]);
  } catch {
    /* optional */
  }

  await run("git", ["add", "--", ...GIT_PATHS]);

  let stagedNames = "";
  try {
    const { stdout } = await run("git", ["diff", "--staged", "--name-only"]);
    stagedNames = stdout;
  } catch {
    /* no staged */
  }
  const articlePriority = stagedNames.split(/\r?\n/).some((n) => n.startsWith("data/articles/"));

  if (!forceRun && !articlePriority && lastAt && Date.now() - lastAt < MIN_INTERVAL_MS) {
    console.log("skip push-and-deploy: 前回から10分未満（記事変更なし）");
    return { pushed: false, reason: "debounce" };
  }

  try {
    await run("git", ["diff", "--staged", "--quiet"]);
    console.log("skip push-and-deploy: 変更なし");
    return { pushed: false, reason: "no-changes", goldPct: status.overallGoldPct };
  } catch {
    /* has staged changes */
  }

  const msg = `patrol: sync ${status.overallGoldPct}% gold (${status.publishedCount}/${status.activeCount} live)`;
  await run("git", ["commit", "-m", msg]);
  try {
    await run("git", ["fetch", "origin", "main"]);
    await run("git", ["merge", "origin/main", "-X", "ours", "--no-edit"]);
  } catch {
    /* already merged or first push */
  }
  await run("git", ["push", "origin", "main"]);
  console.log(`OK push: ${msg}`);

  const deployed = await dispatchDeploy();
  await saveState({
    lastPushAt: new Date().toISOString(),
    lastGoldPct: status.overallGoldPct,
    lastDeployed: deployed,
  });
  return { pushed: true, deployed, goldPct: status.overallGoldPct };
}

const __file = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __file) {
  pushAndDeploy().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
