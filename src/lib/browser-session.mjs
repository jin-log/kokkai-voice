/**
 * Playwright 永続プロファイル（secrets/browser/profile-*）
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const BROWSER_PROFILES = {
  note: path.join(root, "secrets/browser/profile-note"),
  hatena: path.join(root, "secrets/browser/profile-hatena"),
};

/** @param {"note"|"hatena"} service @param {{ headless?: boolean }} opts */
export async function launchLoggedIn(service, opts = {}) {
  const dir = BROWSER_PROFILES[service];
  try {
    await access(dir);
  } catch {
    throw new Error(
      `${service} 未ログイン — 先に: npm run browser:login -- ${service}`,
    );
  }
  return chromium.launchPersistentContext(dir, {
    headless: opts.headless ?? false,
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
  });
}
