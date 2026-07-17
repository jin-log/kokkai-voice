import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("output/og-trial", { recursive: true });
const W = 1200;
const H = 630;
// 点線実測: L278 T235 R888 B436 @1024x536
const box = { x: 326, y: 276, w: 715, h: 236 };
// 点線の消し残り（右端・上辺）を確実に消す
const clear = { x: 318, y: 262, w: 780, h: 265 };

const base = await sharp("assets/og-templates/10-sonota-title-guide.png")
  .resize(W, H, { fit: "fill" })
  .png()
  .toBuffer();

await sharp(base)
  .composite([
    {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${clear.x}" y="${clear.y}" width="${clear.w}" height="${clear.h}" fill="#ffffff"/>
  <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="red" stroke-width="2"/>
</svg>`),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile("output/og-trial/blank-check.png");

// 白紙保存
await sharp(base)
  .composite([
    {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${clear.x}" y="${clear.y}" width="${clear.w}" height="${clear.h}" fill="#ffffff"/>
</svg>`),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile("assets/og-templates/09-sonota-blank.png");

console.log({ box, clear });
