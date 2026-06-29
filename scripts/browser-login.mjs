#!/usr/bin/env node
/**
 * ブラウザに1回ログイン → セッションを secrets/browser/ に保存（2回目以降パスワード不要）
 *
 *   npm run browser:login -- note
 *   npm run browser:login -- hatena
 *
 * Chromium が開く → ログイン完了を自動検知して保存
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
};

const service = process.argv[2];
if (!service || !PROFILES[service]) {
  console.error("使い方: npm run browser:login -- note|hatena");
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
  await mkdir(cfg.dir, { recursive: true });

  console.log(`\n[${service}] Chromium を開きます（このウィンドウでログインしてください）`);
  console.log(cfg.startUrl);
  console.log("ログインが終わると自動でセッションを保存して閉じます。\n");

  const context = await chromium.launchPersistentContext(cfg.dir, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(cfg.startUrl, { waitUntil: "domcontentloaded" });

  const doneUrl = await waitForLogin(page);
  console.log(`ログイン検知: ${doneUrl}`);
  console.log(`セッション保存先: ${cfg.dir}`);
  await context.close();
  console.log(`OK [${service}] 次回からログイン不要です。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
