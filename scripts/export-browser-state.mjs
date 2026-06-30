#!/usr/bin/env node
/**
 * CI 用 — はてな / note の storageState をエクスポート（Profile 9 使用時）
 *
 *   npm run browser:export-state
 *
 * 出力: secrets/browser/state-hatena.json, state-note.json
 * → GitHub Secrets: HATENA_BROWSER_STATE / NOTE_BROWSER_STATE に中身を貼る
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "secrets/browser");

async function exportOne(service, startUrl) {
  const launched = await launchPromoBrowser(service, { headless: false });
  const page = launched.context.pages()[0] || (await launched.context.newPage());
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    await closePromoBrowser(launched);
    throw new Error(`${service} 未ログイン — Chrome Profile 9 でログインしてから再実行`);
  }
  const out = path.join(outDir, `state-${service}.json`);
  await launched.context.storageState({ path: out });
  await closePromoBrowser(launched);
  console.log(`OK ${out}`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log("はてな…");
  await exportOne("hatena", "https://b.hatena.ne.jp/");
  console.log("note…");
  await exportOne("note", "https://note.com/");
  console.log("\n次: state-*.json の中身を GitHub Secrets に登録（HATENA_BROWSER_STATE / NOTE_BROWSER_STATE）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
