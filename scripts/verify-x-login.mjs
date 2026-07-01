#!/usr/bin/env node
/**
 * X ログインセッションが使えるか確認（chrome-profile.json 優先）
 *
 *   npm run x:verify-login
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openCaptureContext } from "./lib/playwright-browser.mjs";
import { resolveCaptureLaunch } from "./lib/chrome-profile.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const profileDir = path.join(root, "secrets/browser/profile-x");
const testUrl = "https://x.com/takaichi_sanae/status/2070096912234238329";

async function main() {
  const resolved = await resolveCaptureLaunch(profileDir);
  const session = await openCaptureContext(resolved, {
    headless: true,
    width: 620,
    height: 800,
    profileDirectory: resolved.profileDirectory,
  });

  try {
    const page = session.page || (await session.context.newPage());
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);

    const url = page.url();
    const title = await page.title();
    const tweetCount = await page.locator('article[data-testid="tweet"]').count();
    const loginUrl = url.includes("/login") || url.includes("/i/flow/login");
    const loginHeading = (await page.locator('h1:has-text("Xにログイン")').count()) > 0;

    if (tweetCount > 0 || (/status\/\d+/.test(testUrl) && title.includes("/ X") && !title.includes("ログイン"))) {
      console.log(`OK — Xログイン済み（${session.profileLabel ?? "profile"}）。ツイート表示OK`);
      console.log(`確認URL: ${url}`);
      process.exit(0);
    }

    if (loginUrl || loginHeading) {
      console.log("NG — chrome-profile.json の Profile で X 未ログインです。");
      console.log("普段の Chrome（Profile 9）で x.com/home を開き、ログイン状態を確認してください。");
      process.exit(1);
    }

    console.log("要確認 — ツイート枠は見えませんでした。");
    console.log(`現在URL: ${url}`);
    process.exit(1);
  } finally {
    await session.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
