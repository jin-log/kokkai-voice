#!/usr/bin/env node
/**
 * CI 用 — はてな / note の storageState をエクスポート
 *
 *   npm run browser:export-state
 *
 * 専用プロファイル（profile-hatena / profile-note）から export。
 * X用の chrome-profile.json は使わない。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "secrets/browser");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {"hatena"|"note"} service
 * @param {string} outPath
 * @param {string} startUrl
 */
async function exportViaIsolatedProfile(service, outPath, startUrl) {
  const launched = await launchPromoBrowser(service, { headless: false });
  const page = launched.context.pages()[0] || (await launched.context.newPage());
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await sleep(2000);
  if (page.url().includes("/login")) {
    await closePromoBrowser(launched);
    throw new Error(`${service} 未ログイン — npm run browser:login -- ${service}`);
  }
  await launched.context.storageState({ path: outPath });
  await closePromoBrowser(launched);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const jobs = [
    { service: "hatena", out: "state-hatena.json", url: "https://b.hatena.ne.jp/" },
    { service: "note", out: "state-note.json", url: "https://note.com/" },
  ];

  for (const job of jobs) {
    const outPath = path.join(outDir, job.out);
    console.log(`\n[${job.service}] export…`);
    await exportViaIsolatedProfile(job.service, outPath, job.url);
    console.log(`OK ${outPath}`);
  }

  console.log("\n次: 各 JSON 全文を GitHub Secrets に登録");
  console.log("  HATENA_BROWSER_STATE / NOTE_BROWSER_STATE");
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/既存|already|in use/i.test(msg)) {
    console.error("\nNG Chrome が起動中です。全部閉じてから再実行してください。\n");
  }
  console.error(e);
  process.exit(1);
});
