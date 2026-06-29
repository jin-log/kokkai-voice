#!/usr/bin/env node
/**
 * X スクショの固定サムネを一括生成
 *
 * Usage:
 *   node scripts/generate-x-thumbs.mjs
 *   node scripts/generate-x-thumbs.mjs --id 1567315242740502529
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateXScreenshotThumb } from "./lib/x-screenshot-thumb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "public/assets/x-screenshots");

const args = process.argv.slice(2);
const idArg = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;

async function main() {
  const files = await readdir(dir);
  const pngs = files.filter((f) => /^\d+\.png$/i.test(f));
  const targets = idArg ? pngs.filter((f) => f.startsWith(idArg)) : pngs;

  if (targets.length === 0) {
    console.log("[x-thumb] 対象なし");
    return;
  }

  for (const f of targets) {
    const id = f.replace(/\.png$/i, "");
    const input = path.join(dir, f);
    const output = path.join(dir, `${id}-thumb.webp`);
    const { width, height, cropH } = await generateXScreenshotThumb(input, output);
    console.log(`[x-thumb] ${id} ${width}x${height} → crop ${cropH}px → ${path.basename(output)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
