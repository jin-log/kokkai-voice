import { access } from "node:fs/promises";
import { chromium } from "playwright";

const WIN_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIN_CHROME_X86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

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

/**
 * インストール済み Google Chrome を使う（Playwright付属ChromiumはGoogleログイン不可）
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
