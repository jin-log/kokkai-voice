/**
 * Playwright ブラウザ起動（既存 Chrome プロフィール or secrets/browser/profile-*）
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBrowserLaunch } from "../../scripts/lib/chrome-profile.mjs";
import { launchBrowserContext } from "../../scripts/lib/playwright-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const BROWSER_PROFILES = {
  note: path.join(root, "secrets/browser/profile-note"),
  hatena: path.join(root, "secrets/browser/profile-hatena"),
};

/** @param {{ headless?: boolean; width?: number; height?: number }} launchOpts */
async function launchForService(isolatedDir, launchOpts = {}) {
  const resolved = await resolveBrowserLaunch(isolatedDir);
  return launchBrowserContext(resolved.userDataDir, {
    headless: launchOpts.headless ?? false,
    width: launchOpts.width ?? 1280,
    height: launchOpts.height ?? 900,
    profileDirectory: resolved.profileDirectory,
  });
}

/** @param {"note"|"hatena"} service @param {{ headless?: boolean }} opts */
export async function launchLoggedIn(service, opts = {}) {
  const isolatedDir = BROWSER_PROFILES[service];
  const resolved = await resolveBrowserLaunch(isolatedDir);
  if (resolved.mode === "isolated") {
    try {
      await access(isolatedDir);
    } catch {
      throw new Error(
        `${service} 未ログイン — 先に: npm run browser:login -- ${service}`,
      );
    }
  }
  return launchForService(isolatedDir, opts);
}

/** @param {string} isolatedDir @param {{ headless?: boolean; width?: number; height?: number }} [opts] */
export async function launchBrowserForAutomation(isolatedDir, opts = {}) {
  return launchForService(isolatedDir, opts);
}
