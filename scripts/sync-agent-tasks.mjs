#!/usr/bin/env node
/** 全記事のゲート+品質NG → data/agent-tasks.json（エージェント別タスク正本） */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAllAgentTasks } from "../src/lib/agent-tasks.mjs";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import { loadArticle } from "../src/lib/articles.mjs";

const articlesDir = path.join(root, "data/articles");

async function main() {
  const files = (await readdir(articlesDir)).filter(
    (f) => f.endsWith(".json") && f !== "index.json" && f !== "test.json",
  );
  const pack = [];
  for (const f of files) {
    const article = await loadArticle(f.replace(/\.json$/, ""));
    if (article.adminHidden) continue;
    const gate = await checkCasePageWithFiles(article);
    pack.push({ article, gate });
  }
  const report = buildAllAgentTasks(pack);
  await writeFile(
    path.join(root, "data/agent-tasks.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `agent-tasks: ${report.total} 件（writer ${report.byAgent.writer ?? 0}, x-researcher ${report.byAgent["x-researcher"] ?? 0}, debugger ${report.byAgent.debugger ?? 0}, legal ${report.byAgent["legal-check"] ?? 0}）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
