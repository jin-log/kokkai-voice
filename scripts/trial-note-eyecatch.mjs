/**
 * note 見出し差し替え（カバー削除→再アップロード）
 */
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = process.argv.includes("--note-id")
  ? process.argv[process.argv.indexOf("--note-id") + 1]
  : "n6baeb45d8cda";
const imagePath = path.join(root, "public/assets/og/kojin-joho-kaisei.png");
await access(imagePath);
await mkdir(path.join(root, "output/debug"), { recursive: true });

const launched = await launchPromoBrowser("note", { headless: false });
const page = launched.context.pages()[0] || (await launched.context.newPage());

try {
  await page.goto(`https://editor.note.com/notes/${noteId}/edit/`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(2500);

  for (let i = 0; i < 3; i++) {
    const c = page.getByRole("button", { name: /閉じる/ });
    if (await c.count()) await c.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 既存カバーを消す
  const cover = page.locator('img[src*="assets.st-note.com"]').first();
  if (await cover.count()) {
    await cover.click({ timeout: 8000 });
    await page.waitForTimeout(800);
    const del = page.getByRole("button", { name: /削除|取り除く|クリア/ });
    if (await del.count()) {
      await del.first().click();
      await page.waitForTimeout(1000);
      console.log("cover deleted");
    } else {
      // メニューから
      const delText = page.getByText(/^削除$/);
      if (await delText.count()) {
        await delText.first().click();
        await page.waitForTimeout(1000);
        console.log("cover deleted via text");
      }
    }
  }

  // 追加
  const add = page.locator('button[aria-label="画像を追加"]');
  if (await add.count()) {
    await add.first().click();
    await page.waitForTimeout(1000);
  }

  const up = page.getByRole("button", { name: /画像をアップロード/ });
  await up.first().waitFor({ state: "visible", timeout: 12_000 });
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 15_000 }),
    up.first().click(),
  ]);
  await chooser.setFiles(imagePath);
  console.log("uploaded");

  await page.getByRole("button", { name: /^保存$/ }).first().click();
  console.log("crop saved");
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /公開に進む/ }).first().click();
  await page.waitForTimeout(2500);
  await page.locator("button").filter({ hasText: /更新する/ }).first().click();
  await page.waitForTimeout(4000);

  const pub = `https://note.com/seiji1192/n/${noteId}`;
  await page.goto(`${pub}?t=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(root, "output/debug/note-eyecatch-published.png"),
    fullPage: false,
  });
  console.log("OK", pub);
} finally {
  await closePromoBrowser(launched);
}
