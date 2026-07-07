#!/usr/bin/env node
/** editorial-rules.json → Functions バンドル用コピー */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "data/editorial-rules.json");
const destDir = path.join(root, "functions/data");
const dest = path.join(destDir, "editorial-rules.json");

const raw = await readFile(src, "utf8");
await mkdir(destDir, { recursive: true });
await writeFile(dest, raw, "utf8");
console.log(`synced ${dest}`);
