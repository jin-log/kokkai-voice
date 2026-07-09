import { execSync } from "node:child_process";

const cred = execSync("git credential fill", {
  input: "protocol=https\nhost=github.com\n",
  encoding: "utf8",
  cwd: "C:/Users/bero1/Projects/kokkai-voice",
});
const token = cred.match(/password=(.+)/)?.[1]?.trim();
const headers = { Authorization: `Bearer ${token}`, "User-Agent": "kv" };

const runsRes = await fetch(
  "https://api.github.com/repos/jin-log/kokkai-voice/actions/runs?per_page=20",
  { headers }
);
const runs = await runsRes.json();

for (const name of ["品質巡回（サーバー）", "Deploy to Cloudflare Pages"]) {
  const failed = (runs.workflow_runs || []).find(
    (r) => r.name === name && r.conclusion === "failure"
  );
  if (!failed) continue;

  const jobsRes = await fetch(failed.jobs_url, { headers });
  const jobs = await jobsRes.json();
  const failedJob = (jobs.jobs || []).find((j) => j.conclusion === "failure");
  if (!failedJob) continue;

  const logRes = await fetch(
    `https://api.github.com/repos/jin-log/kokkai-voice/actions/jobs/${failedJob.id}/logs`,
    { headers }
  );
  const log = await logRes.text();
  const lines = log.split("\n");
  const errIdx = lines.findIndex((l) => /[Ee]rror|FAIL|Cannot find|npm ERR/.test(l));
  const start = Math.max(0, errIdx - 2);
  const end = Math.min(lines.length, errIdx + 15);

  console.log(`\n=== ${name} エラーログ ===`);
  console.log(lines.slice(start, end).join("\n").replace(/\d{4}-\d{2}-\d{2}T[\d:\.]+Z /g, "").slice(0, 2000));
}
