import { execSync } from "node:child_process";

const cred = execSync("git credential fill", {
  input: "protocol=https\nhost=github.com\n",
  encoding: "utf8",
  cwd: "C:/Users/bero1/Projects/kokkai-voice",
});
const token = cred.match(/password=(.+)/)?.[1]?.trim();

const res = await fetch(
  "https://api.github.com/repos/jin-log/kokkai-voice/actions/runs?per_page=20",
  { headers: { Authorization: `Bearer ${token}`, "User-Agent": "kv" } }
);
const d = await res.json();

const summary = {};
for (const r of d.workflow_runs || []) {
  const key = r.name;
  if (!summary[key]) summary[key] = { success: 0, failure: 0, other: 0 };
  if (r.conclusion === "success") summary[key].success++;
  else if (r.conclusion === "failure") summary[key].failure++;
  else summary[key].other++;
}

console.log("=== ワークフロー別 成功/失敗 (直近20件) ===");
for (const [name, s] of Object.entries(summary)) {
  console.log(`${name.padEnd(35)} ✅${s.success} ❌${s.failure} ?${s.other}`);
}

console.log("\n=== 直近10件の詳細 ===");
for (const r of (d.workflow_runs || []).slice(0, 10)) {
  const icon = r.conclusion === "success" ? "✅" : r.conclusion === "failure" ? "❌" : "⏳";
  console.log(`${icon} ${r.name?.slice(0,30).padEnd(30)} ${r.head_commit?.message?.slice(0,40)}`);
}
