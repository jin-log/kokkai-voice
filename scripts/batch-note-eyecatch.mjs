/**
 * thumb-review のサムネを note 見出しに一括差し替え（headless）
 *
 *   node scripts/batch-note-eyecatch.mjs           # dry-run
 *   node scripts/batch-note-eyecatch.mjs --apply   # 実行
 *   node scripts/batch-note-eyecatch.mjs --apply --slug kojin-joho-kaisei
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePromoBrowser, launchPromoBrowser } from "./lib/promo-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const thumbDir = path.join(root, "output/thumb-review");
const apply = process.argv.includes("--apply");
const onlySlug = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1]
  : null;

function norm(s) {
  return String(s)
    .replace(/^["'「]+|["'」]+$/g, "")
    .replace(/["'[\]【】\s　]/g, "")
    .replace(/国会・政府出典付きで.*$/, "")
    .toLowerCase();
}

function titleScore(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) return 80;
  let i = 0;
  while (i < Math.min(na.length, nb.length) && na[i] === nb[i]) i++;
  if (i >= 12) return 50 + i;
  return 0;
}

async function fetchNotes() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(
      `https://note.com/api/v2/creators/seiji1192/contents?kind=note&page=${page}`,
    );
    const j = await r.json();
    all.push(...(j.data?.contents || []));
    if (j.data?.isLastPage) break;
  }
  return all.map((c) => ({
    noteId: c.key,
    title: c.name,
    likes: c.likeCount ?? 0,
  }));
}

async function dismissModals(page) {
  for (let i = 0; i < 4; i++) {
    const c = page.getByRole("button", { name: /閉じる/ });
    if (!(await c.count())) break;
    await c.first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} noteId
 * @param {string} imagePath
 */
async function replaceEyecatch(page, noteId, imagePath) {
  await page.goto(`https://editor.note.com/notes/${noteId}/edit/`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    throw new Error("note 未ログイン");
  }
  await dismissModals(page);

  // 既存カバー削除
  const cover = page.locator('img[src*="assets.st-note.com"]').first();
  if (await cover.count()) {
    await cover.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(700);
    const del = page.getByRole("button", { name: /削除|取り除く|クリア/ });
    if (await del.count()) {
      await del.first().click();
      await page.waitForTimeout(900);
    } else {
      const delText = page.getByText(/^削除$/);
      if (await delText.count()) {
        await delText.first().click();
        await page.waitForTimeout(900);
      }
    }
  }

  const add = page.locator('button[aria-label="画像を追加"]');
  if (await add.count()) {
    await add.first().click();
    await page.waitForTimeout(800);
  }

  const up = page.getByRole("button", { name: /画像をアップロード/ });
  await up.first().waitFor({ state: "visible", timeout: 15_000 });
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 15_000 }),
    up.first().click(),
  ]);
  await chooser.setFiles(imagePath);
  await page.waitForTimeout(1500);

  const save = page.getByRole("button", { name: /^保存$/ });
  await save.first().waitFor({ state: "visible", timeout: 20_000 });
  await save.first().click();
  await page.waitForTimeout(2500);
  await dismissModals(page);

  // 一時保存（下書きにカバーを固定）
  const temp = page.getByRole("button", { name: /一時保存/ });
  if (await temp.count()) {
    await temp.first().click();
    await page.waitForTimeout(2000);
  }
  await dismissModals(page);

  // 「公開に進む」は headless でパネルが開かないことがある → 直接 publish URL
  await page.goto(`https://editor.note.com/notes/${noteId}/publish`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(2500);
  await dismissModals(page);

  const update = page.locator("button").filter({ hasText: /更新する|公開する/ });
  await update.first().waitFor({ state: "visible", timeout: 20_000 });
  await update.first().click();
  await page.waitForTimeout(4000);

  // 公開ページでカバー有無確認
  await page.goto(`https://note.com/seiji1192/n/${noteId}?t=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(2000);
  const hasCover = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter(
      (img) => (img.naturalWidth || img.width) > 400,
    );
    return imgs.some((img) => /assets\.st-note\.com|note\.mu/.test(img.src || ""));
  });
  return hasCover;
}

const manifest = JSON.parse(await readFile(path.join(thumbDir, "manifest.json"), "utf8"));
let items = manifest.items.filter((i) => i.ok);
if (onlySlug) items = items.filter((i) => i.slug === onlySlug);

const notes = await fetchNotes();
console.log("thumbs", items.length, "notes", notes.length);

const jobs = [];
for (const item of items) {
  const imagePath = path.join(thumbDir, `${item.slug}.png`);
  try {
    await access(imagePath);
  } catch {
    console.log("SKIP no png", item.slug);
    continue;
  }
  let best = null;
  let bestS = 0;
  for (const n of notes) {
    if (/を公開しました/.test(n.title || "")) continue;
    const s = titleScore(item.title, n.title);
    if (s > bestS) {
      bestS = s;
      best = n;
    }
  }
  if (!best || bestS < 50) {
    console.log("SKIP no note match", item.slug, item.title.slice(0, 30));
    jobs.push({ ...item, imagePath, noteId: null, matchScore: bestS, status: "no-match" });
    continue;
  }
  jobs.push({
    ...item,
    imagePath,
    noteId: best.noteId,
    noteTitle: best.title,
    matchScore: bestS,
    likes: best.likes,
    status: "pending",
  });
  console.log(
    `${apply ? "UPLOAD" : "DRY"} ${item.slug} → ${best.noteId} (score ${bestS}) suki${best.likes}`,
  );
}

if (!apply) {
  console.log(`\ndry-run ${jobs.filter((j) => j.noteId).length} 件 — --apply で実行`);
  await writeFile(
    path.join(root, "output/note-eyecatch-plan.json"),
    `${JSON.stringify(jobs, null, 2)}\n`,
  );
  process.exit(0);
}

await mkdir(path.join(root, "output/debug"), { recursive: true });
const launched = await launchPromoBrowser("note", { headless: true });
const page = launched.context.pages()[0] || (await launched.context.newPage());

let ok = 0;
let fail = 0;
const results = [];

try {
  for (const job of jobs) {
    if (!job.noteId) {
      results.push(job);
      continue;
    }
    process.stdout.write(`… ${job.slug} ${job.noteId} `);
    try {
      const hasCover = await replaceEyecatch(page, job.noteId, job.imagePath);
      if (hasCover) {
        console.log("OK");
        ok++;
        results.push({ ...job, status: "ok", hasCover: true });
      } else {
        console.log("WARN no cover on public");
        fail++;
        results.push({ ...job, status: "warn-no-cover", hasCover: false });
      }
    } catch (e) {
      console.log("FAIL", e.message);
      fail++;
      results.push({ ...job, status: "fail", error: e.message });
      const shot = path.join(root, "output/debug", `note-eye-fail-${job.slug}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
    }
  }
} finally {
  await closePromoBrowser(launched);
}

const out = {
  at: new Date().toISOString(),
  ok,
  fail,
  results,
};
await writeFile(path.join(root, "output/note-eyecatch-result.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`\ndone ok=${ok} fail=${fail}`);
if (fail) process.exitCode = 2;
