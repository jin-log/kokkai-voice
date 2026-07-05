#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchPromoBrowser, closePromoBrowser } from "./lib/promo-browser.mjs";
import { resolveNoteEyecatchFile } from "./lib/note-editor.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = "n26def68f8bec";
const imgPath = await resolveNoteEyecatchFile("/assets/og/case-mr0jbdpc.png", "case-mr0jbdpc");

const launched = await launchPromoBrowser("note");
const page = launched.context.pages()[0] || (await launched.context.newPage());

async function tryUpload(label, clickFn) {
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 8000 }),
      clickFn(),
    ]);
    await chooser.setFiles(imgPath);
    await page.waitForTimeout(4000);
    console.log("OK:", label);
    return true;
  } catch (e) {
    console.log("NG:", label, String(e).slice(0, 80));
    return false;
  }
}

try {
  await page.goto(`https://note.com/notes/${noteId}/edit`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const btn = page.locator('button[aria-label="画像を追加"]').first();
  if (await tryUpload("aria 画像を追加", () => btn.click())) {
    await page.screenshot({ path: path.join(root, "output/debug", "note-thumb-ok.png"), fullPage: true });
  } else {
    const title = page.locator('textarea[placeholder*="タイトル"]').first();
    const box = await title.boundingBox();
    if (box) {
      await tryUpload("above title", () => page.mouse.click(box.x + 200, box.y - 60));
    }
    const editor = page.locator("div.feHamG").nth(1);
    const eb = await editor.boundingBox();
    if (eb) {
      await tryUpload("feHamG center", () => page.mouse.click(eb.x + eb.width / 2, eb.y + 150));
    }
  }
} finally {
  await closePromoBrowser(launched);
}
