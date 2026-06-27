#!/usr/bin/env node
/** 一般記事5件を enrich → X → legal → publishReady まで強制実行 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import { isPublishGate, pipelineChecks, refreshProjectStatus } from "../src/lib/project-status.mjs";
import { loadArticle } from "../src/lib/articles.mjs";
import {
  enrichGeneralArticle,
  writePolicyMatrixGeneral,
} from "./lib/enrich-general.mjs";

const slugs = [
  "tokyo-solar-panel",
  "fuhou-immin-trend",
  "osaka-to-metropolis",
  "fukushuto-koso",
  "shussho-budget-seika",
];

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const SOURCE_URLS = {
  "tokyo-solar-panel": [
    "https://www.koho.metro.tokyo.lg.jp/2025/03/02.html",
    "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
    "https://www.metro.tokyo.lg.jp/governor/action/katsudo/2023/6/02_01",
  ],
  "fuhou-immin-trend": [
    "https://www.moj.go.jp/isa/publications/press/13_00058.html",
    "https://www.jiji.com/jc/article?k=2026032700900&g=pol",
    "https://www.sankei.com/article/20260327-RTIGC3KW2ZCOTNQXGYWQYP72QQ",
  ],
  "osaka-to-metropolis": [
    "https://business.nikkei.com/atcl/gen/19/00081/032400166/",
    "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
    "https://mainichi.jp/articles/20260520/k00/00m/010/263000c",
  ],
  "fukushuto-koso": [
    "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
    "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
    "https://www.nri.com/jp/media/column/kiuchi/20251020_2.html",
  ],
  "shussho-budget-seika": [
    "https://www.cfa.go.jp/policies/kodomo-mirai/",
    "https://www.mhlw.go.jp/stf/houdou/0000198851_00001.html",
    "https://www8.cao.go.jp/cstp/whitepaper/r06/honpen/html/i1110000.html",
  ],
};

for (const slug of slugs) {
  console.log(`\n=== finish: ${slug} ===`);
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  let article = JSON.parse(await readFile(articlePath, "utf8"));
  article.sourceUrls = SOURCE_URLS[slug] ?? article.sourceUrls;

  console.log("[enrich]");
  await enrichGeneralArticle(article, root);
  const sources = (article.timeline ?? [])
    .filter((t) => t.sourceUrl)
    .map((t) => ({ url: t.sourceUrl, snippet: t.summaryPlain, date: t.date }));
  if (sources.length >= 2) {
    await writePolicyMatrixGeneral(article, root, sources);
  }
  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");

  await runNode("x-research-batch.mjs", [slug]);
  await runNode("legal-check.mjs", ["--slug", slug, "--fix"]);

  article = await loadArticle(slug);
  let policyMatrix = null;
  try {
    policyMatrix = JSON.parse(
      await readFile(path.join(root, article.stanceMatrix.dataPath), "utf8"),
    );
  } catch {
    /* */
  }
  const gate = await checkCasePageWithFiles(article);
  const pipeline = pipelineChecks(article, gate, policyMatrix);
  if (isPublishGate(pipeline)) {
    article.publishReady = true;
    article.pageReady = false;
    await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    console.log(`✅ ${slug} publishReady`);
  } else {
    console.log(`⚠️ ${slug} 未達:`);
    for (const b of gate.blockers) console.log(`  - ${b.id}: ${b.detail}`);
  }
}

await refreshProjectStatus();
