#!/usr/bin/env node
/**
 * X ログインセッションが使えるか確認（1ツイートを開いて判定）
 *
 *   npm run x:verify-login
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowserContext } from "./lib/playwright-browser.mjs";
import { resolveBrowserLaunch } from "./lib/chrome-profile.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const profileDir = path.join(root, "secrets/browser/profile-x");
const testUrl = "https://x.com/takaichi_sanae/status/2070096912234238329";

async function main() {
  const resolved = await resolveBrowserLaunch(profileDir);
  const context = await launchBrowserContext(resolved.userDataDir, {
    headless: true,
    width: 620,
    height: 800,
    profileDirectory: resolved.profileDirectory,
  });

  try {
    const page = context.pages()[0] || (await context.newPage());
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);

    const url = page.url();
    const tweetCount = await page.locator('article[data-testid="tweet"]').count();
    const loginPrompt = await page.locator('text=ログイン').count();

    if (tweetCount > 0) {
      console.log("OK — Xログイン済み。ツイート本文が表示できました。");
      console.log(`確認URL: ${url}`);
      process.exit(0);
    }

    if (loginPrompt > 0 || url.includes("login") || url.includes("flow")) {
      console.log("NG — 未ログインです。もう一度:");
      console.log("  npm run browser:login -- x");
      console.log("ログイン後、ホーム（x.com/home）が開いた状態で保存されます。");
      process.exit(1);
    }

    console.log("要確認 — ツイート枠は見えませんでした。");
    console.log(`現在URL: ${url}`);
    console.log("  npm run browser:login -- x をやり直してください。");
    process.exit(1);
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
