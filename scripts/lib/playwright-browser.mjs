import { chromium } from "playwright";

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
    console.warn("⚠ 通常の Chrome が見つかりません。Playwright Chromium で起動します（Googleログイン不可）");
    return chromium.launchPersistentContext(userDataDir, base);
  }
}
