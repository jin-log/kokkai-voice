import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { chromium } from "playwright";
import {
  ensureCaptureCdpReady,
  loadChromeProfileConfig,
  resolveCdpPort,
} from "./chrome-profile.mjs";

const WIN_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIN_CHROME_X86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const CAPTURE_CDP_PORT = 9334;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveChromeExecutable() {
  if (process.platform !== "win32") return null;
  for (const p of [WIN_CHROME, WIN_CHROME_X86]) {
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** @param {number} port @param {number} [timeoutMs] */
async function waitForCdp(port, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`CDP ポート ${port} が開きません`);
}

/** @param {{ userDataDir: string, profileDirectory: string, label?: string }} shared @param {{ forceSync?: boolean }} [opts] */
async function openSandboxCaptureSession(shared, opts = {}) {
  const chromeExe = await resolveChromeExecutable();
  if (!chromeExe) throw new Error("Google Chrome が見つかりません");

  const sandboxUserData = await syncCaptureSandbox(shared, { force: opts.forceSync === true });
  const label = shared.label ? `${shared.label} (${shared.profileDirectory})` : shared.profileDirectory;
  console.log(`  chrome-profile.json → ${label} サンドボックスで取得`);

  const child = spawn(
    chromeExe,
    [
      `--remote-debugging-port=${CAPTURE_CDP_PORT}`,
      `--user-data-dir=${sandboxUserData}`,
      `--profile-directory=${shared.profileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=620,900",
      "about:blank",
    ],
    { detached: false, stdio: "ignore" },
  );

  await waitForCdp(CAPTURE_CDP_PORT);
  await sleep(1500);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CAPTURE_CDP_PORT}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

  return {
    context,
    page,
    viaCdp: true,
    cdpPort: CAPTURE_CDP_PORT,
    profileLabel: label,
    async close() {
      try {
        await page.close().catch(() => {});
        await browser.close();
      } finally {
        try {
          if (!child.killed) child.kill();
          spawn("taskkill", ["/F", "/PID", String(child.pid), "/T"], { stdio: "ignore" });
        } catch {
          /* ignore */
        }
      }
    },
  };
}

/**
 * @param {string} userDataDir
 * @param {{ headless?: boolean; width?: number; height?: number; profileDirectory?: string }} [opts]
 */
export async function launchBrowserContext(userDataDir, opts = {}) {
  const chromeArgs = ["--disable-blink-features=AutomationControlled"];
  if (opts.profileDirectory) {
    chromeArgs.push(`--profile-directory=${opts.profileDirectory}`);
  }

  const base = {
    headless: opts.headless ?? false,
    viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
    locale: "ja-JP",
    ignoreDefaultArgs: ["--enable-automation"],
    args: chromeArgs,
  };

  try {
    return await chromium.launchPersistentContext(userDataDir, {
      ...base,
      channel: "chrome",
    });
  } catch {
    const exe = await resolveChromeExecutable();
    if (exe) {
      return chromium.launchPersistentContext(userDataDir, {
        ...base,
        executablePath: exe,
      });
    }
    console.warn("⚠ 通常の Chrome が見つかりません。Playwright Chromium で起動します（Googleログイン不可）");
    return chromium.launchPersistentContext(userDataDir, base);
  }
}

/**
 * Xスクショ用
 * 1. CDP 接続（なければ Profile 9 を自動起動）
 * 2. 設定なしのみ profile-x（空プロファイル — 要 browser:login）
 * @param {{ userDataDir: string, profileDirectory?: string, mode?: string, shared?: import('./chrome-profile.mjs').loadChromeProfileConfig extends Function ? never : object | null }} resolved
 * @param {{ headless?: boolean; width?: number; height?: number; profileDirectory?: string }} [opts]
 */
export async function openCaptureContext(resolved, opts = {}) {
  const shared = resolved.shared ?? (await loadChromeProfileConfig());
  let cdpPort = await resolveCdpPort(shared?.cdpPort);

  if (!cdpPort && shared) {
    try {
      cdpPort = await ensureCaptureCdpReady(shared);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Xスクショ用 Chrome を起動できません: ${msg}`);
    }
  }

  if (cdpPort) {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    console.log(`  起動中 Chrome に CDP 接続 (${cdpPort})`);
    return {
      context,
      page: null,
      viaCdp: true,
      cdpPort,
      profileLabel: shared?.label ?? shared?.profileDirectory ?? "CDP",
      async close() {
        await browser.close();
      },
    };
  }

  const context = await launchBrowserContext(resolved.userDataDir, {
    headless: opts.headless ?? false,
    width: opts.width,
    height: opts.height,
  });
  console.warn("  ⚠ chrome-profile.json なし — 空の profile-x を使用中（要 browser:login -- x）");
  return {
    context,
    page: context.pages()[0] || null,
    viaCdp: false,
    cdpPort: null,
    profileLabel: "profile-x",
    async close() {
      await context.close();
    },
  };
}
