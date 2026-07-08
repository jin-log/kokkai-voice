import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const tomlPath = join(homedir(), ".wrangler", "config", "default.toml");
const toml = await readFile(tomlPath, "utf8");
const m = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
const token = m ? m[1] : "";

const res = await fetch(
  "https://api.cloudflare.com/client/v4/accounts/f2e88512cd4a09f315291bf2406015d7/pages/projects/kokkai-voice/deployments?per_page=20",
  { headers: { Authorization: `Bearer ${token}` } }
);
const d = await res.json();
for (const r of (d.result || []).slice(0, 20)) {
  const msg = r.deployment_trigger?.metadata?.commit_message?.slice(0, 60) || "(no msg)";
  const stage = r.latest_stage?.name;
  const status = r.latest_stage?.status;
  const created = r.created_on?.slice(11, 19);
  console.log(`${created} | ${msg} | ${stage}=${status}`);
}
