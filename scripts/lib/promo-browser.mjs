/**
 * はてな / note 用ブラウザ起動（Profile 9 or storageState or 隔離プロファイル）
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadChromeProfileConfig } from "./chrome-profile.mjs";
import { launchBrowserContext } from "./playwright-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {"note"|"hatena"} service
 * @param {{ headless?: boolean }} [opts]
 */
export async function launchPromoBrowser(service, opts = {}) {
  const headless = opts.headless ?? false;
  const isolatedDir = path.join(root, "secrets/browser", `profile-${service}`);
  const statePath = path.join(root, "secrets/browser", `state-${service}.json`);

  const shared = await loadChromeProfileConfig();
  if (shared) {
    return {
      mode: "profile",
      context: await launchBrowserContext(shared.userDataDir, {
        headless,
        profileDirectory: shared.profileDirectory,
      }),
    };
  }

  if (await exists(statePath)) {
    const browser = await chromium.launch({
      headless,
      channel: "chrome",
    }).catch(() => chromium.launch({ headless }));
    const context = await browser.newContext({
      storageState: statePath,
      viewport: { width: 1280, height: 900 },
      locale: "ja-JP",
    });
    context._promoBrowser = browser;
    return { mode: "state", context, browser };
  }

  if (!(await exists(isolatedDir))) {
    throw new Error(
      `${service} 未設定 — Profile 9（chrome-profile.json）か browser:export-state を実行`,
    );
  }

  return {
    mode: "isolated",
    context: await launchBrowserContext(isolatedDir, { headless }),
  };
}

/** @param {{ context: import('playwright').BrowserContext, browser?: import('playwright').Browser }} launched */
export async function closePromoBrowser(launched) {
  await launched.context.close();
  if (launched.browser) await launched.browser.close();
}
