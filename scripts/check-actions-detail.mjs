import { execSync } from "node:child_process";

const cred = execSync("git credential fill", {
  input: "protocol=https\nhost=github.com\n",
  encoding: "utf8",
  cwd: "C:/Users/bero1/Projects/kokkai-voice",
});
const token = cred.match(/password=(.+)/)?.[1]?.trim();
const headers = { Authorization: `Bearer ${token}`, "User-Agent": "kv" };

// 直近の失敗したDeployワークフローのログを取得
const runsRes = await fetch(
  "https://api.github.com/repos/jin-log/kokkai-voice/actions/runs?per_page=5",
  { headers }
);
const runs = await runsRes.json();
const failedDeploy = (runs.workflow_runs || []).find(
  (r) => r.name === "Deploy to Cloudflare Pages" && r.conclusion === "failure"
);

if (!failedDeploy) { console.log("失敗したDeployなし"); process.exit(0); }

console.log("失敗したRun:", failedDeploy.id, failedDeploy.head_commit?.message?.slice(0, 50));

// ジョブ一覧
const jobsRes = await fetch(failedDeploy.jobs_url, { headers });
const jobs = await jobsRes.json();
for (const job of jobs.jobs || []) {
  console.log(`\nジョブ: ${job.name} [${job.conclusion}]`);
  for (const step of job.steps || []) {
    const icon = step.conclusion === "success" ? "✅" : step.conclusion === "failure" ? "❌" : "⏭";
    console.log(`  ${icon} ${step.name}`);
  }
}

// 失敗ステップのログを取得
const failedJob = (jobs.jobs || []).find((j) => j.conclusion === "failure");
if (failedJob) {
  const logRes = await fetch(
    `https://api.github.com/repos/jin-log/kokkai-voice/actions/jobs/${failedJob.id}/logs`,
    { headers }
  );
  const log = await logRes.text();
  // エラー周辺を抽出
  const lines = log.split("\n");
  const errIdx = lines.findIndex((l) => /error|Error|fail|FAIL/i.test(l) && !/##\[group\]/.test(l));
  const start = Math.max(0, errIdx - 3);
  const end = Math.min(lines.length, errIdx + 20);
  console.log("\n=== エラーログ ===");
  console.log(lines.slice(start, end).join("\n").slice(0, 3000));
}
