/**
 * はてな / note 用ブラウザ起動
 * - ローカル: secrets/browser/profile-{hatena|note}（Xの Profile 9 とは別）
 * - CI: secrets/browser/state-{hatena|note}.json
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { isCi, promoHeadless } from "../../src/lib/ci-env.mjs";
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
  const headless = promoHeadless(opts.headless);
  const isolatedDir = path.join(root, "secrets/browser", `profile-${service}`);
  const statePath = path.join(root, "secrets/browser", `state-${service}.json`);

  if (!isCi && (await exists(isolatedDir))) {
    console.log(`[promo] ${service} → 専用プロファイル ${isolatedDir}`);
    return {
      mode: "isolated",
      context: await launchBrowserContext(isolatedDir, { headless }),
    };
  }

  if (await exists(statePath)) {
    console.log(`[promo] ${service} → storageState（CI/エクスポート済み）`);
    const browser = isCi
      ? await chromium.launch({ headless })
      : await chromium
          .launch({ headless, channel: "chrome" })
          .catch(() => chromium.launch({ headless }));
    const context = await browser.newContext({
      storageState: statePath,
      viewport: { width: 1280, height: 900 },
      locale: "ja-JP",
    });
    context._promoBrowser = browser;
    return { mode: "state", context, browser };
  }

  if (await exists(isolatedDir)) {
    console.log(`[promo] ${service} → 専用プロファイル ${isolatedDir}`);
    return {
      mode: "isolated",
      context: await launchBrowserContext(isolatedDir, { headless }),
    };
  }

  throw new Error(
    `${service} 未設定 — npm run browser:login -- ${service} のあと browser:export-state`,
  );
}

/** @param {{ context: import('playwright').BrowserContext, browser?: import('playwright').Browser }} launched */
export async function closePromoBrowser(launched) {
  await launched.context.close();
  if (launched.browser) await launched.browser.close();
}
