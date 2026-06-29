/**
 * X スクショ → 固定サイズサムネ（投稿上部＝クリックしたくなる領域を切り出し）
 */
import sharp from "sharp";

/** 表示サイズ */
export const THUMB_DISPLAY_W = 220;
export const THUMB_DISPLAY_H = 124;

/** 生成解像度（2x） */
export const THUMB_W = 440;
export const THUMB_H = 248;

/**
 * 長い縦スクショから「投稿ヘッダ＋本文冒頭」の高さを推定
 * @param {number} w
 * @param {number} h
 */
export function pickCropHeight(w, h) {
  const ratio = h / w;
  if (ratio <= 1.15) return h;
  if (ratio <= 1.8) return Math.min(h, Math.round(w * 0.95));
  if (ratio <= 3) return Math.min(h, Math.max(320, Math.round(h * 0.34)));
  return Math.min(h, 420);
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 */
export async function generateXScreenshotThumb(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 620;
  const h = meta.height ?? 900;
  const cropH = pickCropHeight(w, h);

  await sharp(inputPath)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .resize(THUMB_W, THUMB_H, { fit: "cover", position: "top" })
    .webp({ quality: 84 })
    .toFile(outputPath);

  return { width: w, height: h, cropH };
}

/** @param {string} statusId */
export function thumbPublicPath(statusId) {
  return `/assets/x-screenshots/${statusId}-thumb.webp`;
}

/** @param {string} screenshotPublicPath e.g. /assets/x-screenshots/123.png */
export function thumbPathFromScreenshot(screenshotPublicPath) {
  return screenshotPublicPath.replace(/\.(png|jpe?g|webp)$/i, "-thumb.webp");
}
