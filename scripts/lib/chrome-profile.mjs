/**
 * 既存 Chrome プロフィール（seiji1192 等）を自動化で使う設定
 * 実体: secrets/browser/chrome-profile.json（gitignore）
 */
import { access, cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = path.join(root, "secrets/browser/chrome-profile.json");
export const xCaptureSandboxDir = path.join(root, "secrets/browser/x-capture-sandbox");
export const DEFAULT_CAPTURE_CDP_PORT = 9333;

const WIN_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIN_CHROME_X86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
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
async function waitForCdpPort(port, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isCdpPortOpen(port)) return port;
    await sleep(500);
  }
  throw new Error(
    `CDP ポート ${port} が開きません。専用 Chrome の起動に失敗した可能性があります。`,
  );
}

/** 専用 X スクショ Chrome（CDP ポート）だけ終了 — 普段の Chrome は触らない */
async function killCaptureChromeOnly(port = DEFAULT_CAPTURE_CDP_PORT) {
  if (process.platform !== "win32") return;
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout } = await execFileAsync("netstat", ["-ano"], { windowsHide: true, encoding: "utf8" });
    const pids = new Set();
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.includes(`:${port}`) || !line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      await execFileAsync("taskkill", ["/F", "/PID", pid, "/T"], { windowsHide: true }).catch(() => {});
    }
    if (pids.size) await sleep(800);
  } catch {
    /* ignore */
  }
}

async function syncCaptureSandboxWithRetry(cfg, opts = {}) {
  try {
    return await syncCaptureSandbox(cfg, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("使用中")) throw err;
    const destProfile = path.join(xCaptureSandboxDir, cfg.profileDirectory);
    if (await exists(destProfile)) {
      console.log("  Profile 使用中 — 既存サンドボックスで続行（cookie は前回複製時点）");
      return xCaptureSandboxDir;
    }
    throw err;
  }
}

/** @returns {Promise<{ userDataDir: string, profileDirectory: string, label?: string, cdpPort?: number } | null>} */
export async function loadChromeProfileConfig() {
  try {
    const raw = JSON.parse(await readFile(configPath, "utf8"));
    if (!raw?.userDataDir || !raw?.profileDirectory) return null;
    const cdpPort = raw.cdpPort != null ? Number(raw.cdpPort) : undefined;
    return {
      userDataDir: String(raw.userDataDir),
      profileDirectory: String(raw.profileDirectory),
      label: raw.label ? String(raw.label) : undefined,
      cdpPort: Number.isFinite(cdpPort) && cdpPort > 0 ? cdpPort : undefined,
    };
  } catch {
    return null;
  }
}

/** @param {number} port */
export async function isCdpPortOpen(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** @param {number} [preferred] */
export async function resolveCdpPort(preferred) {
  const ports = [];
  if (preferred) ports.push(preferred);
  ports.push(DEFAULT_CAPTURE_CDP_PORT, 9222);
  for (const port of [...new Set(ports)]) {
    if (await isCdpPortOpen(port)) return port;
  }
  return null;
}

/**
 * Xスクショ用 Chrome（Profile 9 複製 + CDP）がなければ自動起動
 * Chrome 136+ は通常 User Data では CDP 不可 → secrets/browser/x-capture-sandbox を使用
 * @param {{ userDataDir: string, profileDirectory: string, label?: string, cdpPort?: number }} cfg
 * @param {{ timeoutMs?: number; forceSync?: boolean }} [opts]
 * @returns {Promise<number>}
 */
export async function ensureCaptureCdpReady(cfg, opts = {}) {
  const port = cfg.cdpPort ?? DEFAULT_CAPTURE_CDP_PORT;
  const open = await resolveCdpPort(port);
  if (open) return open;

  const chromeExe = await resolveChromeExecutable();
  if (!chromeExe) {
    throw new Error("Google Chrome が見つかりません");
  }

  const sandboxUserData = await syncCaptureSandboxWithRetry(cfg, { force: opts.forceSync === true });

  const label = cfg.label ? `${cfg.label} (${cfg.profileDirectory})` : cfg.profileDirectory;
  console.log(`  Xスクショ専用 Chrome を起動 (${label}, CDP ${port}・普段の Chrome とは別)`);

  spawn(
    chromeExe,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${sandboxUserData}`,
      `--profile-directory=${cfg.profileDirectory}`,
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-allow-origins=*",
      "--disable-gpu",
      "--window-size=620,900",
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );

  return waitForCdpPort(port, opts.timeoutMs ?? 60_000);
}

/** 専用 Chrome を再起動（普段の Chrome には触らない） */
export async function restartCaptureCdp(cfg, opts = {}) {
  const port = cfg.cdpPort ?? DEFAULT_CAPTURE_CDP_PORT;
  await killCaptureChromeOnly(port);
  return ensureCaptureCdpReady(cfg, { ...opts, forceSync: opts.forceSync === true });
}

export const X_CAPTURE_CDP_HINT =
  "Xスクショは secrets/browser/x-capture-sandbox の専用 Chrome（CDP 9333）で動作。普段の Chrome アカウントとは別プロセスです。";

/**
 * @param {{ userDataDir: string, profileDirectory: string, label?: string }} cfg
 * @param {{ force?: boolean }} [opts]
 */
export async function syncCaptureSandbox(cfg, opts = {}) {
  const srcProfile = path.join(cfg.userDataDir, cfg.profileDirectory);
  const destProfile = path.join(xCaptureSandboxDir, cfg.profileDirectory);
  if (!(await exists(srcProfile))) {
    throw new Error(`chrome-profile.json のプロファイルが見つかりません: ${srcProfile}`);
  }

  const marker = path.join(xCaptureSandboxDir, ".synced-at");
  let needsSync = opts.force === true || !(await exists(destProfile));
  if (!needsSync && (await exists(marker))) {
    try {
      const ageMs = Date.now() - (await stat(marker)).mtimeMs;
      needsSync = ageMs > 6 * 60 * 60 * 1000;
    } catch {
      needsSync = true;
    }
  }

  if (!needsSync) return xCaptureSandboxDir;

  await mkdir(xCaptureSandboxDir, { recursive: true });
  console.log(
    `  ${cfg.profileDirectory} をサンドボックスへ複製中（chrome-profile.json・初回は数十秒）…`,
  );
  try {
    await cp(path.join(cfg.userDataDir, "Local State"), path.join(xCaptureSandboxDir, "Local State"), {
      force: true,
    });
    await cp(srcProfile, destProfile, { recursive: true, force: true });
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : "";
    if (code === "EBUSY") {
      throw new Error("Profile のクッキーが使用中（普段の Chrome 起動中）");
    }
    throw err;
  }
  await writeFile(marker, `${new Date().toISOString()}\n`, "utf8");
  return xCaptureSandboxDir;
}

/**
 * Xスクショ用の起動先（chrome-profile.json 優先・空の profile-x は使わない）
 * @param {string} [isolatedUserDataDir]
 */
export async function resolveCaptureLaunch(isolatedUserDataDir) {
  const shared = await loadChromeProfileConfig();
  if (shared) {
    return {
      userDataDir: shared.userDataDir,
      profileDirectory: shared.profileDirectory,
      label: shared.label,
      mode: "chrome",
      shared,
    };
  }
  return { userDataDir: isolatedUserDataDir, mode: "isolated", shared: null };
}

/**
 * @param {string} [isolatedUserDataDir] secrets/browser/profile-*（設定なし時）
 * @returns {Promise<{ userDataDir: string, profileDirectory?: string, label?: string, mode: "chrome" | "isolated" }>}
 */
export async function resolveBrowserLaunch(isolatedUserDataDir) {
  const shared = await loadChromeProfileConfig();
  if (shared) {
    return {
      userDataDir: shared.userDataDir,
      profileDirectory: shared.profileDirectory,
      label: shared.label,
      mode: "chrome",
    };
  }
  return { userDataDir: isolatedUserDataDir, mode: "isolated" };
}
