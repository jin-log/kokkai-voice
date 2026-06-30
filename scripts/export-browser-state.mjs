#!/usr/bin/env node
/**
 * CI 用 — はてな / note の storageState をエクスポート
 *
 *   npm run browser:export-state
 *
 * Profile 9（chrome-profile.json）: Chrome を CDP で接続して export
 * 隔離プロファイル（profile-hatena / profile-note）: browser:login 後に export
 */
import { spawn } from "node:child_process";
import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadChromeProfileConfig } from "./lib/chrome-profile.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "secrets/browser");
const sandboxDir = path.join(outDir, "cdp-sandbox");
const WIN_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIN_CHROME_X86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveChromeExe() {
  for (const p of [WIN_CHROME, WIN_CHROME_X86]) {
    if (await exists(p)) return p;
  }
  return null;
}

/** @param {number} port @param {number} timeoutMs */
async function waitForCdp(port, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`CDP ポート ${port} が開きません（Chrome 起動待ちタイムアウト）`);
}

/**
 * デフォルト User Data では CDP 不可のため、Profile をサンドボックスへ複製
 * @param {{ userDataDir: string, profileDirectory: string }} cfg
 */
async function syncProfileSandbox(cfg) {
  const srcProfile = path.join(cfg.userDataDir, cfg.profileDirectory);
  const destProfile = path.join(sandboxDir, cfg.profileDirectory);
  if (!(await exists(srcProfile))) {
    throw new Error(`プロファイルが見つかりません: ${srcProfile}`);
  }
  await mkdir(sandboxDir, { recursive: true });
  console.log("  Profile 9 をサンドボックスへ複製中（初回は数十秒かかります）…");
  await cp(path.join(cfg.userDataDir, "Local State"), path.join(sandboxDir, "Local State"), {
    force: true,
  });
  await cp(srcProfile, destProfile, { recursive: true, force: true });
  return sandboxDir;
}

/**
 * @param {{ userDataDir: string, profileDirectory: string }} cfg
 * @param {{ service: string, outPath: string, url: string }[]} jobs
 * @param {string} sandboxUserDataDir
 */
async function exportAllViaProfile9(cfg, jobs, sandboxUserDataDir) {
  const chromeExe = await resolveChromeExe();
  if (!chromeExe) {
    throw new Error("Google Chrome が見つかりません");
  }

  const port = 9333;
  const child = spawn(
    chromeExe,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${sandboxUserDataDir}`,
      `--profile-directory=${cfg.profileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
      jobs[0].url,
    ],
    { detached: false, stdio: "ignore" },
  );

  try {
    await waitForCdp(port);
    await sleep(2000);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());

    for (const job of jobs) {
      console.log(`\n[${job.service}] export…`);
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await sleep(2000);
      if (page.url().includes("/login")) {
        throw new Error(`未ログイン — Profile 9 で ${job.service} にログインしてから再実行`);
      }
      await context.storageState({ path: job.outPath });
      console.log(`OK ${job.outPath}`);
    }

    await browser.close();
  } finally {
    try {
      if (!child.killed) child.kill();
      spawn("taskkill", ["/F", "/PID", String(child.pid), "/T"], { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {"hatena"|"note"} service
 * @param {string} outPath
 * @param {string} startUrl
 */
async function exportViaIsolatedProfile(service, outPath, startUrl) {
  const { launchPromoBrowser, closePromoBrowser } = await import("./lib/promo-browser.mjs");
  const launched = await launchPromoBrowser(service, { headless: false });
  const page = launched.context.pages()[0] || (await launched.context.newPage());
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await sleep(2000);
  if (page.url().includes("/login")) {
    await closePromoBrowser(launched);
    throw new Error(`${service} 未ログイン — npm run browser:login -- ${service}`);
  }
  await launched.context.storageState({ path: outPath });
  await closePromoBrowser(launched);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const shared = await loadChromeProfileConfig();

  const jobs = [
    { service: "hatena", out: "state-hatena.json", url: "https://b.hatena.ne.jp/" },
    { service: "note", out: "state-note.json", url: "https://note.com/" },
  ];

  if (shared) {
    const sandboxUserDataDir = await syncProfileSandbox(shared);
    const profileJobs = jobs.map((job) => ({
      ...job,
      outPath: path.join(outDir, job.out),
    }));
    await exportAllViaProfile9(shared, profileJobs, sandboxUserDataDir);
  } else {
    for (const job of jobs) {
      const outPath = path.join(outDir, job.out);
      console.log(`\n[${job.service}] export…`);
      await exportViaIsolatedProfile(job.service, outPath, job.url);
      console.log(`OK ${outPath}`);
    }
  }

  console.log("\n次: 各 JSON 全文を GitHub Secrets に登録");
  console.log("  HATENA_BROWSER_STATE / NOTE_BROWSER_STATE");
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/既存|already|in use/i.test(msg)) {
    console.error("\nNG Chrome が起動中です。全部閉じてから再実行してください。\n");
  }
  console.error(e);
  process.exit(1);
});
