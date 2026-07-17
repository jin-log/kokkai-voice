/**
 * 見出し画像済みの note を更新公開するだけ
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = process.argv[2] || "n6baeb45d8cda";

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
    const close = page.getByRole("button", { name: /閉じる/ });
    if (!(await close.count())) break;
    await close.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => (img.naturalWidth || img.width) > 200)
      .map((img) => ({
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
        src: (img.src || "").slice(0, 100),
      })),
  );
  console.log("editor images", JSON.stringify(imgs, null, 2));
  await page.screenshot({
    path: path.join(root, "output/debug/note-before-publish.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /公開に進む/ }).first().click();
  await page.waitForTimeout(3000);

  const update = page.locator("button").filter({ hasText: /更新する|公開する/ });
  console.log("update buttons", await update.count());
  await update.first().click({ timeout: 15_000 });
  console.log("clicked update");
  await page.waitForTimeout(5000);

  const pubUrl = `https://note.com/seiji1192/n/${noteId}`;
  await page.goto(`${pubUrl}?t=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(root, "output/debug/note-eyecatch-published.png"),
    fullPage: false,
  });

  const covers = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => (img.naturalWidth || img.width) > 400)
      .slice(0, 5)
      .map((img) => ({
        src: (img.src || "").slice(0, 140),
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
      })),
  );
  console.log("published", JSON.stringify(covers, null, 2));
  console.log("OK", pubUrl);
} finally {
  await closePromoBrowser(launched);
}
