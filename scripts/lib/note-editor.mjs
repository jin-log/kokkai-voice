/**
 * note エディタ — 見出し画像・URL貼り付けでOGPカード化
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @param {string} eyecatchRel @param {string} [slug] */
export async function resolveNoteEyecatchFile(eyecatchRel, slug) {
  const rel = String(eyecatchRel || "").split("?")[0].replace(/^\//, "");
  const candidates = [
    path.join(root, "public", rel),
    slug ? path.join(root, "public", "assets", "og", `${slug}.png`) : null,
    slug ? path.join(root, "public", "assets", "og", `${slug}-hook.png`) : null,
    path.join(root, "public", "assets", "og-default.png"),
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      /* next */
    }
  }
  return null;
}

/** @param {import('playwright').Page} page @param {string|null} imagePath */
export async function uploadNoteEyecatch(page, imagePath) {
  if (!imagePath) {
    console.warn("[note] 見出し画像なし — OGP未生成の可能性");
    return;
  }

  const triggers = [
    page.getByText(/見出し画像を追加|見出し画像|カバー画像/),
    page.locator('[class*="Eyecatch"], [data-testid*="eyecatch"], [aria-label*="見出し"]'),
    page.getByRole("button", { name: /画像を追加|見出し画像/ }),
  ];

  for (const trigger of triggers) {
    if (!(await trigger.count())) continue;
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 8000 }),
        trigger.first().click(),
      ]);
      await chooser.setFiles(imagePath);
      await page.waitForTimeout(4500);
      console.log(`[note] 見出し画像: ${path.basename(imagePath)}`);
      return;
    } catch {
      /* try next */
    }
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(imagePath);
    await page.waitForTimeout(4500);
    console.log(`[note] 見出し画像(input): ${path.basename(imagePath)}`);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}

/** @param {import('playwright').Page} page */
async function pasteUrlForEmbed(page, url) {
  await page.evaluate(async (u) => {
    await navigator.clipboard.writeText(u);
  }, url);
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(3500);
}

/** @param {import('playwright').Page} page */
async function focusEditor(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const editor = page.locator(".ProseMirror, [contenteditable='true'][role='textbox']").last();
  await editor.evaluate((el) => {
    el.focus();
    el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(300);
  return editor;
}

/** @param {import('playwright').Page} page */
async function clearNoteEditor(page) {
  await focusEditor(page);
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(400);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ title: string, eyecatchPath?: string, slug?: string, bodySegments: { type: string, value?: string, url?: string }[] }} note
 * @param {{ editNoteId?: string }} [opts]
 */
export async function fillNoteEditorWithEmbeds(page, note, opts = {}) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  const editNoteId = opts.editNoteId;
  if (editNoteId) {
    await page.goto(`https://note.com/notes/${editNoteId}/edit`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } else {
    await page.goto("https://note.com/notes/new", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  }
  await page.waitForTimeout(2500);

  if (page.url().includes("/login")) {
    throw new Error("note 未ログイン — npm run browser:login -- note");
  }

  const eyecatchFile = await resolveNoteEyecatchFile(note.eyecatchPath, note.slug);
  if (editNoteId) {
    const cover = page.locator('[class*="Eyecatch"] button, [class*="eyecatch"] button, img[class*="Eyecatch"]').first();
    if (await cover.count()) {
      await cover.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
  }
  await uploadNoteEyecatch(page, eyecatchFile);

  const titleBox = page
    .locator('textarea[placeholder*="タイトル"], textarea[placeholder*="記事タイトル"], [data-testid="title-input"]')
    .first();
  await titleBox.fill(note.title, { timeout: 20_000 });

  if (editNoteId) await clearNoteEditor(page);
  else await focusEditor(page);

  for (const seg of note.bodySegments) {
    if (seg.type === "text") {
      const lines = String(seg.value || "").split("\n");
      for (const line of lines) {
        if (line) await page.keyboard.type(line, { delay: 3 });
        await page.keyboard.press("Enter");
      }
    } else if (seg.type === "embed" && seg.url) {
      await page.keyboard.press("Enter");
      await pasteUrlForEmbed(page, seg.url);
      await page.keyboard.press("Enter");
    }
  }

  await page.waitForTimeout(800);
}
