#!/usr/bin/env node
/**
 * Mac 引き継ぎデプロイ — cloudflare.env があればローカル、なければ GitHub Actions
 */
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfEnv = path.join(root, "secrets/cloudflare.env");

async function loadCfEnv() {
  try {
    await access(cfEnv);
  } catch {
    return false;
  }
  const text = await readFile(cfEnv, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
    process.env[key] = val;
  }
  return true;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const hasLocal = await loadCfEnv();
if (hasLocal) {
  console.log("[deploy:mac] secrets/cloudflare.env → ローカル deploy:site");
  run("node", ["scripts/deploy-site.mjs"]);
} else {
  console.log("[deploy:mac] cloudflare.env なし → GitHub Actions deploy.yml");
  const gh = spawnSync("gh", ["workflow", "run", "deploy.yml", "--ref", "main"], {
    cwd: root,
    stdio: "inherit",
  });
  if (gh.status !== 0) {
    console.error(
      "NG: gh が使えません。`gh auth login` するか secrets/cloudflare.env を ceosync で同期してください。",
    );
    process.exit(1);
  }
  console.log("OK deploy.yml 起動 — https://github.com/jin-log/kokkai-voice/actions");
}
