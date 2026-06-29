import { chromium } from "playwright";

/**
 * インストール済み Google Chrome を使う（Playwright付属ChromiumはGoogleログイン不可）
 * @param {string} userDataDir
 * @param {{ headless?: boolean; width?: number; height?: number }} [opts]
 */
export async function launchBrowserContext(userDataDir, opts = {}) {
  const base = {
    headless: opts.headless ?? false,
    viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
    locale: "ja-JP",
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
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
