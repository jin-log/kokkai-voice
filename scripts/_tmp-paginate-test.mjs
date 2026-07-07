import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.14-store-log.com/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector('a[href*="/stores/"]', { timeout: 30000 });

const collect = () =>
  page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('a[href*="/stores/"]')].map((a) => a.href),
    ),
  ]);

const page1 = await collect();
await page.click('button.pagination-button >> text="2"');
await page.waitForTimeout(2500);
const page2 = await collect();
console.log("page1", page1.length, "page2", page2.length);
console.log("overlap", page1.filter((u) => page2.includes(u)).length);
await browser.close();
