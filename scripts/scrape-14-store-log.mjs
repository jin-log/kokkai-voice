#!/usr/bin/env node
/**
 * 14-store-log.com 店舗一覧スクレイパー（Playwright）
 *
 * 使い方:
 *   npm run scrape:14-stores
 *   node scripts/scrape-14-store-log.mjs
 *
 * テスト（先頭2件のみ）:
 *   SCRAPE_LIMIT=2 node scripts/scrape-14-store-log.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(ROOT, "data", "stores.csv");
const BASE_URL = "https://www.14-store-log.com/";
const LIMIT = Number(process.env.SCRAPE_LIMIT || 0) || Infinity;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 1〜2秒のランダム待機 */
async function politeDelay() {
  await sleep(1000 + Math.random() * 1000);
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatCategory(category, subCategory) {
  const main = String(category ?? "").trim();
  const sub = String(subCategory ?? "").trim();
  if (!main) return sub;
  if (!sub || sub === main) return main;
  return `${main}・${sub}`;
}

function formatResidentialArea(address = {}) {
  return [address.city, address.ward].filter(Boolean).join(" ").trim();
}

function formatLot(address = {}) {
  return [address.streetAddress, address.roomNumber].filter(Boolean).join(" ").trim();
}

function mapStoreFromApi(data, pageUrl) {
  return {
    url: pageUrl,
    name: data.name ?? "",
    category: formatCategory(data.category, data.subCategory),
    dc: data.dataCenter ?? "",
    server: data.world ?? "",
    residentialArea: formatResidentialArea(data.address),
    lot: formatLot(data.address),
    ownerName: data.ownerName ?? "",
  };
}

async function waitForStoreList(page) {
  await page.waitForSelector('a[href*="/stores/"]', { timeout: 60_000 });
}

async function collectStoreUrls(page) {
  const urls = new Set();

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60_000 });
  await waitForStoreList(page);

  while (true) {
    const batch = await page.evaluate(() => {
      const origin = window.location.origin;
      return [
        ...new Set(
          [...document.querySelectorAll('a[href*="/stores/"]')]
            .map((a) => {
              try {
                return new URL(a.getAttribute("href"), origin).href;
              } catch {
                return a.href;
              }
            })
            .filter((href) => /\/stores\/[0-9a-f-]{36}$/i.test(href)),
        ),
      ];
    });

    for (const url of batch) urls.add(url);
    console.log(`一覧ページ取得: +${batch.length}件（累計 ${urls.size}件）`);

    if (Number.isFinite(LIMIT) && urls.size >= LIMIT) break;

    const nextBtn = page.locator("button.pagination-button", { hasText: "次へ" }).first();
    const disabled = await nextBtn.evaluate((el) =>
      el.classList.contains("cursor-not-allowed"),
    );
    if (disabled) break;

    const pageNo = await page
      .locator("button.pagination-button.bg-\\[\\#805e49\\]")
      .textContent()
      .catch(() => "?");
    console.log(`ページ ${pageNo} → 次へ`);

    await politeDelay();
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/stores?page=") &&
          res.request().method() === "GET" &&
          res.status() === 200,
        { timeout: 60_000 },
      ),
      nextBtn.click(),
    ]);
    await response.json();
    await waitForStoreList(page);
  }

  return [...urls];
}

async function scrapeStoreDetail(page, storeUrl) {
  const id = storeUrl.match(/\/stores\/([0-9a-f-]{36})/i)?.[1];
  if (!id) throw new Error(`店舗IDを抽出できません: ${storeUrl}`);

  const detailPromise = page.waitForResponse(
    (res) =>
      res.url().includes(`/api/stores/${id}`) &&
      res.request().method() === "GET" &&
      res.status() === 200,
    { timeout: 60_000 },
  );

  await page.goto(storeUrl, { waitUntil: "networkidle", timeout: 60_000 });
  const response = await detailPromise;
  const data = await response.json();
  return mapStoreFromApi(data, storeUrl);
}

function writeCsv(rows, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const header = "URL,店名,種類,DC,サーバー,居住区,番地,オーナー名";
  const body = rows
    .map((row) =>
      [
        row.url,
        row.name,
        row.category,
        row.dc,
        row.server,
        row.residentialArea,
        row.lot,
        row.ownerName,
      ]
        .map(csvEscape)
        .join(","),
    )
    .join("\n");
  writeFileSync(outPath, `\uFEFF${header}\n${body}\n`, "utf8");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("店舗URL一覧を収集中…");
    let storeUrls = await collectStoreUrls(page);
    console.log(`全 ${storeUrls.length} 件の詳細を取得します`);

    if (Number.isFinite(LIMIT) && storeUrls.length > LIMIT) {
      storeUrls = storeUrls.slice(0, LIMIT);
      console.log(`SCRAPE_LIMIT=${LIMIT} のため ${LIMIT} 件に制限`);
    }

    const rows = [];
    for (let i = 0; i < storeUrls.length; i++) {
      const url = storeUrls[i];
      console.log(`[${i + 1}/${storeUrls.length}] ${url}`);
      if (i > 0) await politeDelay();
      try {
        const row = await scrapeStoreDetail(page, url);
        rows.push(row);
      } catch (err) {
        console.error(`  NG: ${err.message}`);
      }
    }

    writeCsv(rows, OUT_PATH);
    console.log(`OK ${rows.length} 件 → ${OUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
