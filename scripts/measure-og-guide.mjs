/**
 * 点線枠の実測（ガイドPNG）
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const src = "assets/og-templates/10-sonota-title-guide.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
console.log("size", w, h);

function dark(x, y) {
  const i = (y * w + x) * 4;
  return data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100;
}

// 横点線（上辺・下辺）: x=260..900 で破線ランが多い行
const rowScore = [];
for (let y = 180; y < 480; y++) {
  let runs = 0;
  let inD = false;
  for (let x = 250; x < 900; x++) {
    const d = dark(x, y);
    if (d && !inD) {
      runs++;
      inD = true;
    } else if (!d && inD) inD = false;
  }
  if (runs >= 12) rowScore.push({ y, runs });
}
const top = rowScore.filter((r) => r.y < 320).sort((a, b) => b.runs - a.runs)[0];
const bot = rowScore.filter((r) => r.y > 350).sort((a, b) => b.runs - a.runs)[0];
console.log("top", top, "bot", bot);

// 縦点線（左辺・右辺）
const colScore = [];
for (let x = 240; x < 920; x++) {
  let runs = 0;
  let inD = false;
  for (let y = top.y; y <= bot.y; y++) {
    const d = dark(x, y);
    if (d && !inD) {
      runs++;
      inD = true;
    } else if (!d && inD) inD = false;
  }
  if (runs >= 8) colScore.push({ x, runs });
}
const left = colScore.filter((c) => c.x < 500).sort((a, b) => b.runs - a.runs)[0];
const right = colScore.filter((c) => c.x > 700).sort((a, b) => b.runs - a.runs)[0];
console.log("left", left, "right", right);
console.log(
  "right candidates",
  colScore.filter((c) => c.x > 700).sort((a, b) => b.runs - a.runs).slice(0, 8),
);

const box = {
  x: left.x,
  y: top.y,
  w: right.x - left.x,
  h: bot.y - top.y,
};
console.log("SRC_BOX", box);

const sx = 1200 / w;
const sy = 630 / h;
const scaled = {
  x: Math.round(box.x * sx),
  y: Math.round(box.y * sy),
  w: Math.round(box.w * sx),
  h: Math.round(box.h * sy),
};
console.log("SCALED_1200x630", scaled);

await mkdir("output/og-trial", { recursive: true });
const base = await sharp(src).resize(1200, 630, { fit: "fill" }).png().toBuffer();
await sharp(base)
  .composite([
    {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect x="${scaled.x}" y="${scaled.y}" width="${scaled.w}" height="${scaled.h}" fill="none" stroke="lime" stroke-width="3"/>
</svg>`),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile("output/og-trial/guide-measured.png");
console.log("wrote output/og-trial/guide-measured.png");
