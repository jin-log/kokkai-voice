#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchPromoBrowser, closePromoBrowser } from "./lib/promo-browser.mjs";
import { resolveNoteEyecatchFile } from "./lib/note-editor.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = "n26def68f8bec";
const imgPath = await resolveNoteEyecatchFile("/assets/og/case-mr0jbdpc.png", "case-mr0jbdpc");

const launched = await launchPromoBrowser("note");
const page = launched.context.pages()[0] || (await launched.context.newPage());

try {
  await mkdir(path.join(root, "output/debug"), { recursive: true });
  await page.goto(`https://note.com/notes/${noteId}/edit`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(3000);

  const title = page.locator('textarea[placeholder*="タイトル"], textarea[placeholder*="記事タイトル"]').first();
  await title.waitFor({ state: "visible", timeout: 15_000 });
  const box = await title.boundingBox();
  console.log("title box", box);

  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].map((i) => ({
      src: (i.src || "").slice(0, 80),
      w: i.width,
      h: i.height,
      cls: i.className?.slice?.(0, 40),
    }));
    const files = [...document.querySelectorAll('input[type="file"]')].length;
    const eyecatchish = [...document.querySelectorAll("[class*='yecatch'], [class*='Eyecatch'], [data-testid*='eyecatch']")].map(
      (e) => e.className?.slice?.(0, 60) || e.tagName,
    );
    return { imgs: imgs.slice(0, 8), files, eyecatchish };
  });
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: path.join(root, "output/debug", "note-edit-state.png"), fullPage: true });
  console.log("screenshot saved");
} finally {
  await closePromoBrowser(launched);
}
