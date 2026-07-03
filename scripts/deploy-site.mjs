#!/usr/bin/env node
/**
 * 本番反映のみ（build + functions + Pages）。Buffer/GSC は別。
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfEnv = path.join(root, "secrets/cloudflare.env");

if (existsSync(cfEnv)) {
  for (const line of readFileSync(cfEnv, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val) process.env[key] = val;
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!process.env.CLOUDFLARE_API_TOKEN) {
  delete process.env.CLOUDFLARE_API_TOKEN;
}
run("npm", ["run", "build"]);
run("node", ["scripts/copy-functions.mjs"]);
run("npx", [
  "wrangler",
  "pages",
  "deploy",
  "dist",
  "--project-name=kokkai-voice",
  "--branch=main",
]);
run("node", ["scripts/update-project-status.mjs", "--deployed"]);
console.log("OK deploy:site");
