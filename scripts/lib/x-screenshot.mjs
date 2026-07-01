/**
 * X 投稿スクショ取得（Playwright・API 不使用）
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openCaptureContext } from "./playwright-browser.mjs";
import { resolveCaptureLaunch } from "./chrome-profile.mjs";
import { generateXScreenshotThumb, thumbPublicPath } from "./x-screenshot-thumb.mjs";
import { auditScreenshotFile } from "./x-screenshot-audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "../..");
export const xProfileDir = path.join(root, "secrets/browser/profile-x");
export const screenshotDir = path.join(root, "public/assets/x-screenshots");

/** @param {string} url */
export function parseXStatusId(url) {
  const m = String(url).match(/status\/(\d+)/);
  return m ? m[1] : null;
}

/** @param {string} filePath */
export async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

const TWEET_SELECTORS = [
  'article[data-testid="tweet"]',
  '[data-testid="tweet"]',
  'article[role="article"]',
];

/** @param {import('playwright').Page} page @param {string} targetUrl */
async function isXLoginWall(page, targetUrl) {
  const url = page.url();
  if (url.includes("/login") || url.includes("/i/flow/login")) return true;

  const title = await page.title();
  if (/status\/\d+/.test(targetUrl) && title.includes("/ X") && !title.includes("ログイン")) {
    return false;
  }

  if ((await page.locator(TWEET_SELECTORS[0]).count()) > 0) return false;

  if ((await page.locator('h1:has-text("Xにログイン")').count()) > 0) return true;
  if ((await page.locator("text=アカウントにログイン").count()) > 0) return true;

  return false;
}

/**
 * @param {string} postUrl
 * @param {{ headless?: boolean; profileDir?: string }} [opts]
 */
export async function captureTweetScreenshot(postUrl, opts = {}) {
  const statusId = parseXStatusId(postUrl);
  if (!statusId) throw new Error(`status ID を抽出できません: ${postUrl}`);

  const profileDir = opts.profileDir ?? xProfileDir;
  const resolved = await resolveCaptureLaunch(profileDir);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await captureTweetScreenshotOnce(postUrl, resolved, {
        ...opts,
        forceSync: attempt === 1,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 0 && msg.includes("未ログイン") && resolved.shared) {
        console.log("  Profile 再複製してリトライ…");
        continue;
      }
      throw err;
    }
  }
  throw new Error("Xスクショ取得に失敗しました");
}

async function captureTweetScreenshotOnce(postUrl, resolved, opts = {}) {
  const statusId = parseXStatusId(postUrl);
  if (!statusId) throw new Error(`status ID を抽出できません: ${postUrl}`);

  await mkdir(screenshotDir, { recursive: true });
  const outPath = path.join(screenshotDir, `${statusId}.png`);
  const publicPath = `/assets/x-screenshots/${statusId}.png`;

  const session = await openCaptureContext(resolved, {
    headless: opts.headless ?? true,
    width: 620,
    height: 900,
    profileDirectory: resolved.profileDirectory,
    forceSync: opts.forceSync === true,
  });

  /** @type {import('playwright').Page | undefined} */
  let page;
  try {
    page = session.page || (await session.context.newPage());
    if (session.cdpPort) {
      console.log(`  CDP 接続: 127.0.0.1:${session.cdpPort}`);
    }
    const target = postUrl.replace("twitter.com", "x.com");

    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);

    const loginWall = await isXLoginWall(page, target);
    if (loginWall) {
      const hint = resolved.shared
        ? "chrome-profile.json の Profile 9 が X 未ログインか、サンドボックス複製が古いです。普段の Chrome で x.com/home を開いてから npm run x:capture を再実行してください。"
        : "secrets/browser/chrome-profile.json を設定するか npm run browser:login -- x を実行してください。";
      throw new Error(`X に未ログインです。${hint}`);
    }

    let shot = false;
    for (const sel of TWEET_SELECTORS) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) continue;
      try {
        await loc.waitFor({ state: "visible", timeout: 12_000 });
        await loc.screenshot({ path: outPath });
        shot = true;
        break;
      } catch {
        /* try next selector */
      }
    }

    if (!shot) {
      await page.screenshot({ path: outPath, fullPage: false });
    }

    const sha256 = await sha256File(outPath);
    const audit = await auditScreenshotFile(outPath);
    if (audit.bad) {
      throw new Error(
        `スクショ品質NG（${audit.reasons.join(",")}）— Xログインまたは投稿URLを確認: ${postUrl}`,
      );
    }

    const capturedAt = new Date().toISOString();

    const thumbPath = path.join(screenshotDir, `${statusId}-thumb.webp`);
    await generateXScreenshotThumb(outPath, thumbPath);
    const thumbPublic = thumbPublicPath(statusId);

    return { statusId, outPath, publicPath, thumbPath, thumbPublic, sha256, capturedAt };
  } finally {
    if (session.viaCdp) {
      await page?.close().catch(() => {});
    }
    await session.close();
  }
}

/**
 * @param {object} article
 * @param {number} slot
 * @param {string} publicPath
 * @param {string} thumbPublic
 * @param {string} capturedAt
 * @param {string} sha256
 */
export function applyScreenshotToArticle(article, slot, publicPath, thumbPublic, capturedAt, sha256) {
  const post = article.xPosts?.find((p) => p.slot === slot);
  if (!post) throw new Error(`xPosts slot ${slot} がありません`);

  post.screenshot = publicPath;
  post.screenshot_thumb = thumbPublic;
  post.captured_at = capturedAt;
  post.sha256 = sha256;
  if (post.note?.includes("Phase2")) {
    post.note = "スクショ取得済（x-archive）";
  }

  for (const e of article.timeline ?? []) {
    if (e.type !== "x_post") continue;
    if (e.id === `x-slot-${slot}` || e.xPost?.slot === slot) {
      e.xPost = { ...post };
      e.date = capturedAt.slice(0, 10);
    }
  }
}
