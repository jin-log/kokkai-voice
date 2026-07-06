import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const commits = ["a32b6813", "5985457b", "cc075355", "eda92ee2"];

for (const c of commits) {
  try {
    const raw = execSync(`git show ${c}:data/ops-queue.json`, {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    }).toString("utf8");
    const j = JSON.parse(raw);
    const sample = j.tasks.find((t) => t.id === "owner-note-paid-start");
    const bad = (raw.match(/Ã/g) || []).length;
    console.log(c, "OK", "tasks", j.tasks.length, "mojibake", bad, "title", sample?.title?.slice(0, 40));
  } catch (e) {
    console.log(c, "FAIL", e.message.split("\n")[0]);
  }
}
