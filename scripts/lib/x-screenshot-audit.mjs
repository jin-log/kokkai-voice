/**
 * X スクショ品質チェック（真っ黒プレースホルダー等）
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const TINY_BYTES = 8_000;

/**
 * @param {string} filePath
 */
export async function auditScreenshotFile(filePath) {
  const buf = await readFile(filePath);
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const reasons = [];
  if (buf.length < TINY_BYTES) reasons.push("tiny_file");

  let darkRatio = 0;
  let brightRatio = 0;
  if (reasons.length === 0 && w > 0 && h > 0) {
    const { channels, data } = await sharp(buf)
      .resize(120, 120, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = data.length / channels;
    let dark = 0;
    let bright = 0;
    for (let i = 0; i < data.length; i += channels) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 30) dark += 1;
      if (lum > 200) bright += 1;
    }
    darkRatio = dark / px;
    brightRatio = bright / px;
    if (darkRatio > 0.72 && brightRatio < 0.08) reasons.push("mostly_black");
  }

  if (w < 400 || h < 300) reasons.push("small_dims");

  return {
    id: filePath.replace(/.*[/\\]/, "").replace(/\.png$/i, ""),
    bytes: buf.length,
    width: w,
    height: h,
    darkRatio,
    brightRatio,
    bad: reasons.length > 0,
    reasons,
  };
}
