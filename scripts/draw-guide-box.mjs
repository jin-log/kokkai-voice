import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("output/og-trial", { recursive: true });
const W = 1200;
const H = 630;
const gx = Math.round((280 * W) / 1024);
const gy = Math.round((235 * H) / 536);
const gw = Math.round(((886 - 280) * W) / 1024);
const gh = Math.round(((437 - 235) * H) / 536);
const base = await sharp("assets/og-templates/10-sonota-title-guide.png")
  .resize(W, H, { fit: "fill" })
  .png()
  .toBuffer();
await sharp(base)
  .composite([
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="none" stroke="lime" stroke-width="3"/></svg>`,
      ),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile("output/og-trial/guide-measured.png");
console.log({ gx, gy, gw, gh });
