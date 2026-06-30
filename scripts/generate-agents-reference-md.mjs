#!/usr/bin/env node
/** data/agents-reference.json → docs/agents-reference.md */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(path.join(root, "data/agents-reference.json"), "utf8"));

let md = `# kokkai-voice エージェント参照

更新: ${data.updatedAt}

## ワークフロー順序

`;

for (const w of data.workflow) {
  const agent = data.agents.find((a) => a.id === w.agentId);
  md += `${w.order}. **${w.label}** — ${agent?.name ?? w.agentId}\n\n   ${w.summary}\n\n`;
}

md += `---\n\n`;

for (const a of data.agents) {
  md += `## ${a.name}（${a.chatName}）\n\n### タスク\n\n`;
  for (const t of a.tasks) md += `- ${t}\n`;
  md += `\n`;

  if (a.skills.length) {
    md += `### スキル\n\n`;
    for (const s of a.skills) {
      md += `#### ${s.title}\n\n`;
      for (const item of s.items) md += `- ${item}\n`;
      md += `\n`;
    }
  }

  if (a.rules.length) {
    md += `### ルール\n\n`;
    for (const r of a.rules) {
      md += `#### ${r.title}\n\n`;
      for (const item of r.items) md += `- ${item}\n`;
      md += `\n`;
    }
  }
  md += `---\n\n`;
}

md += `## ゲート → 担当\n\n`;
for (const g of data.gateAgents) {
  const agent = data.agents.find((a) => a.id === g.agentId);
  md += `- ${g.label} → **${agent?.name ?? g.agentId}**\n`;
}

await writeFile(path.join(root, "docs/agents-reference.md"), md, "utf8");
console.log("wrote docs/agents-reference.md");
