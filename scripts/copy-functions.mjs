#!/usr/bin/env node
/** Pages Functions を dist にコピー（Win/Mac 共通） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "functions");
const dest = path.join(root, "dist", "functions");

if (!fs.existsSync(src)) {
  console.error("NG functions/ がありません");
  process.exit(1);
}
fs.cpSync(src, dest, { recursive: true });
console.log("OK functions → dist/functions");
