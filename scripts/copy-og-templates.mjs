/**
 * Cursor添付のOGテンプレPNGを assets/og-templates/ へ整理コピー
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-bero1-Projects-kokkai-voice/assets",
);
const dest = path.join(root, "assets/og-templates");

const map = [
  ["images_8-2cc451ac", "01-gaikokujin.png"],
  ["images_7-0e3a4ec9", "02-energy.png"],
  ["images_6-6a834cbd", "03-kyoiku.png"],
  ["images_4-8314ceda", "04-seiji-kane.png"],
  ["images_1-f4faf86c", "05-keizai.png"],
  ["images_3-fe0543be", "06-gaiko.png"],
  ["images_2-eb0a33c0", "07-shakai.png"],
  ["images_5-5a26d0c7", "08-chiho.png"],
  ["images_9-c4dc5030", "09-sonota-card.png"],
  ["images_10-8b642146", "10-sonota-title-guide.png"],
];

await mkdir(dest, { recursive: true });
const files = await readdir(srcDir);
let n = 0;
for (const [needle, outName] of map) {
  const hit = files.find((f) => f.includes(needle) && f.endsWith(".png"));
  if (!hit) {
    console.warn("MISS", needle);
    continue;
  }
  await copyFile(path.join(srcDir, hit), path.join(dest, outName));
  console.log("OK", outName);
  n++;
}
console.log(`copied ${n}/${map.length} → ${dest}`);
