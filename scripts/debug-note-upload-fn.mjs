#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchPromoBrowser, closePromoBrowser } from "./lib/promo-browser.mjs";
import { resolveNoteEyecatchFile, uploadNoteEyecatch } from "./lib/note-editor.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const noteId = "n26def68f8bec";
const imgPath = await resolveNoteEyecatchFile("/assets/og/case-mr0jbdpc.png", "case-mr0jbdpc");

const launched = await launchPromoBrowser("note");
const page = launched.context.pages()[0] || (await launched.context.newPage());

try {
  await page.goto(`https://note.com/notes/${noteId}/edit`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const ok = await uploadNoteEyecatch(page, imgPath);
  console.log("uploadNoteEyecatch:", ok);
} finally {
  await closePromoBrowser(launched);
}
