#!/usr/bin/env node
/**
 * ブラウザに1回ログイン → セッションを secrets/browser/ に保存（2回目以降パスワード不要）
 *
 *   npm run browser:login -- note
 *   npm run browser:login -- hatena
 *   npm run browser:login -- x
 *
 * Chromium が開く → ログイン完了を自動検知して保存
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadChromeProfileConfig } from "./lib/chrome-profile.mjs";
import { launchBrowserContext } from "./lib/playwright-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES = {
  note: {
    dir: path.join(root, "secrets/browser/profile-note"),
    startUrl: "https://note.com/login",
    isLoggedIn: (url) =>
      /^https:\/\/note\.com\/(home|dashboard|notifications|settings)/.test(url) ||
      /^https:\/\/note\.com\/seiji1192/.test(url),
  },
  hatena: {
    dir: path.join(root, "secrets/browser/profile-hatena"),
    startUrl: "https://www.hatena.ne.jp/login",
    isLoggedIn: (url) =>
      /^https:\/\/(www\.hatena\.ne\.jp\/(?!login)|b\.hatena\.ne\.jp\/)/.test(url) &&
      !url.includes("/login"),
  },
  x: {
    dir: path.join(root, "secrets/browser/profile-x"),
    startUrl: "https://x.com/home",
    loginUrl: "https://x.com/login",
    isLoggedIn: (url) => {
      if (!/^https:\/\/(x\.com|twitter\.com)\//.test(url)) return false;
      if (/login|flow|onboarding|jf\/|signin|oauth|accounts\.google/i.test(url)) return false;
      return /^https:\/\/(x\.com|twitter\.com)\/(home|search|notifications|messages|settings|compose)/.test(
        url,
      );
    },
  },
};

const service = process.argv[2];
if (!service || !PROFILES[service]) {
  console.error("使い方: npm run browser:login -- note|hatena|x");
  process.exit(1);
}

const cfg = PROFILES[service];

async function waitForLogin(page, timeoutMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (cfg.isLoggedIn(url)) return url;
    await page.waitForTimeout(1500);
  }
  throw new Error("ログイン検知タイムアウト（10分）");
}

async function main() {
  const shared = service === "x" ? await loadChromeProfileConfig() : null;
  const userDataDir = shared?.userDataDir ?? cfg.dir;

  if (service === "x" && shared) {
    console.log(
      `\n[x] chrome-profile.json → ${shared.profileDirectory}` +
        (shared.label ? ` (${shared.label})` : ""),
    );
    console.log("普段の Chrome プロフィールを使います。\n");
  } else {
    await mkdir(cfg.dir, { recursive: true });
    console.log(`\n[${service}] 専用プロファイルで開きます: ${cfg.dir}`);
    console.log("※ X用の chrome-profile.json とは別アカウントです。\n");
  }

  console.log(cfg.startUrl);
  if (service === "x" && !shared) {
    console.log("");
    console.log("【重要】「Googleでログイン」は使わないでください（ブロックされます）");
    console.log("  → Xのメールアドレス or ユーザー名 ＋ パスワード でログイン");
    console.log("  → パスワード未設定なら、普段のChromeで x.com → 設定 → パスワード を先に作成");
    console.log("");
  }
  console.log("ログインが終わると自動でセッションを保存して閉じます。\n");

  const context = await launchBrowserContext(
    userDataDir,
    shared ? { headless: false, profileDirectory: shared.profileDirectory } : { headless: false },
  );

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(cfg.startUrl, { waitUntil: "domcontentloaded" });

  let doneUrl = page.url();
  if (cfg.isLoggedIn(doneUrl)) {
    console.log(`既にログイン済み: ${doneUrl}`);
  } else {
    doneUrl = await waitForLogin(page);
    console.log(`ログイン検知: ${doneUrl}`);
  }
  if (
    service === "x" &&
    !/^https:\/\/(x\.com|twitter\.com)\/(home|search)/.test(doneUrl)
  ) {
    console.warn(
      "\n⚠ ホーム画面ではないURLで保存されました。ログイン完了後 x.com/home が開いているか確認してください。",
    );
    console.warn("確認: npm run x:verify-login\n");
  }
  if (shared) {
    console.log(`セッション: Chrome ${shared.profileDirectory}`);
  } else {
    console.log(`セッション保存先: ${cfg.dir}`);
  }
  await context.close();
  console.log(`OK [${service}] ログイン状態を確認しました。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
