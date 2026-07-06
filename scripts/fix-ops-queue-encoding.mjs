#!/usr/bin/env node
/**
 * ops-queue.json の文字化け（UTF-8→Latin1 多重化）を修復
 * node scripts/fix-ops-queue-encoding.mjs [--from-git a32b6813]
 */
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const queuePath = path.join(root, "data/ops-queue.json");
const publicPath = path.join(root, "public/data/ops-queue.json");

const fromGit = (() => {
  const i = process.argv.indexOf("--from-git");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function looksMojibake(s) {
  return /Ã|Â|ï¼|ã€/.test(String(s || ""));
}

function fixString(s) {
  if (!looksMojibake(s)) return s;
  let cur = String(s);
  for (let i = 0; i < 4; i++) {
    try {
      const next = Buffer.from(cur, "latin1").toString("utf8");
      if (next === cur) break;
      cur = next;
    } catch {
      break;
    }
  }
  return cur;
}

function walkFix(obj) {
  if (typeof obj === "string") return fixString(obj);
  if (Array.isArray(obj)) return obj.map(walkFix);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walkFix(v);
    return out;
  }
  return obj;
}

async function loadQueue() {
  if (fromGit) {
    const raw = execSync(`git show ${fromGit}:data/ops-queue.json`, {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    }).toString("utf8");
    return JSON.parse(raw);
  }
  return JSON.parse(await readFile(queuePath, "utf8"));
}

const queue = await loadQueue();
const fixed = walkFix(queue);
const out = `${JSON.stringify(fixed, null, 2)}\n`;
await writeFile(queuePath, out, "utf8");
await copyFile(queuePath, publicPath);
const bad = (out.match(/Ã/g) || []).length;
console.log(`fix-ops-queue-encoding: wrote ${queuePath} (残りÃ=${bad})`);
