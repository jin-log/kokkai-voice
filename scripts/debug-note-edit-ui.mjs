/**
 * note 編集画面の見出し画像UIを調査
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = process.argv[2] || "n6baeb45d8cda";

const launched = await launchPromoBrowser("note", { headless: false });
const page = launched.context.pages()[0] || (await launched.context.newPage());

try {
  await mkdir(path.join(root, "output/debug"), { recursive: true });
  await page.goto(`https://note.com/notes/${noteId}/edit`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(4000);
  console.log("url", page.url());

  const info = await page.evaluate(() => {
    const textHits = [];
    for (const el of document.querySelectorAll("button, a, div, span, label")) {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/見出し|カバー|画像|eyecatch|Eyecatch|サムネ/i.test(t) && t.length < 40) {
        textHits.push({
          tag: el.tagName,
          text: t.slice(0, 40),
          cls: String(el.className || "").slice(0, 80),
        });
      }
    }
    return {
      title: document.title,
      files: document.querySelectorAll('input[type="file"]').length,
      imgs: [...document.querySelectorAll("img")].slice(0, 10).map((i) => ({
        src: (i.src || "").slice(0, 100),
        w: i.width,
        h: i.height,
        alt: i.alt,
      })),
      textHits: textHits.slice(0, 20),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({
    path: path.join(root, "output/debug/note-edit-ui.png"),
    fullPage: true,
  });
  console.log("saved output/debug/note-edit-ui.png");
} finally {
  await closePromoBrowser(launched);
}
