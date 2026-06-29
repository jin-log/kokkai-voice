#!/usr/bin/env node
/**
 * 本番反映のみ（build + functions + Pages）。Buffer/GSC は別。
 */
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

delete process.env.CLOUDFLARE_API_TOKEN;
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
