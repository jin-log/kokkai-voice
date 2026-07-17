/** ガイドから点線を消した白紙を作る */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const box = { x: 345, y: 272, w: 710, h: 248 };
const src = path.join(root, "assets/og-templates/10-sonota-title-guide.png");
const out = path.join(root, "assets/og-templates/09-sonota-blank.png");

const base = await sharp(src).resize(W, H, { fit: "fill" }).png().toBuffer();
const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${box.x - 2}" y="${box.y - 2}" width="${box.w + 4}" height="${box.h + 4}" fill="#ffffff"/>
</svg>`,
);
await sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toFile(out);
console.log("OK", out);
