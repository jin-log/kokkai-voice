#!/usr/bin/env node
/** エージェント参照ビューを開く（devサーバー起動含む） */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8793;
const url = `http://localhost:${port}/dev/agents/`;

async function probe() {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

if (!(await probe())) {
  console.log(`dev 未起動 → port ${port} で起動します…`);
  spawn("npm", ["run", "dev", "--", "--port", String(port), "--host"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    shell: true,
  }).unref();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await probe()) break;
  }
}

console.log(url);
if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
}
