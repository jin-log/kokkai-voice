/**
 * note エディタ — URL は貼り付けで OGP カード化（fill ではプレーンテキストのまま）
 */

/** @param {import('playwright').Page} page */
async function pasteUrlForEmbed(page, url) {
  await page.evaluate(async (u) => {
    await navigator.clipboard.writeText(u);
  }, url);
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(3500);
  const embedded = await page.locator(
    'figure[data-src], [data-identifier="embed"], a[href*="note.com"][rel*="nofollow"]',
  ).count();
  if (!embedded) {
    await page.waitForTimeout(2000);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {{ title: string, bodySegments: { type: string, value?: string, url?: string }[] }} note
 */
export async function fillNoteEditorWithEmbeds(page, note) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("https://note.com/notes/new", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);

  if (page.url().includes("/login")) {
    throw new Error("note 未ログイン — npm run browser:login -- note");
  }

  const titleBox = page
    .locator('textarea[placeholder*="タイトル"], [data-testid="title-input"], [placeholder*="タイトル"]')
    .first();
  await titleBox.click({ timeout: 20_000 });
  await titleBox.fill(note.title);

  const editor = page
    .locator('[contenteditable="true"][role="textbox"], [contenteditable="true"]')
    .last();
  await editor.click({ timeout: 15_000 });

  for (const seg of note.bodySegments) {
    if (seg.type === "text") {
      const lines = String(seg.value || "").split("\n");
      for (const line of lines) {
        if (line) await page.keyboard.type(line, { delay: 5 });
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
