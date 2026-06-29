#!/usr/bin/env node
/** batch10: X seed → legal → publishReady判定（下書きのまま adminHidden） */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkCasePageWithFiles, root } from "../src/lib/page-ready.mjs";
import { isPublishGate, pipelineChecks, refreshProjectStatus } from "../src/lib/project-status.mjs";
import { loadArticle } from "../src/lib/articles.mjs";

const slugs = [
  "teigaku-kyufu-2024",
  "invoice-menzei-2026",
  "boei-tokubetsuzei",
  "noto-fukko-budget",
  "gakushu-shien-75000",
  "denki-gas-genmen",
  "pension-kuriage-70",
  "minimum-wage-2026",
  "expo2025-kessan",
  "zeihikaku-kojo",
];

/** @type {Record<string, Array<{url:string, label?:string, text?:string}>>} */
const X_SEEDS = {
  "teigaku-kyufu-2024": [
    {
      url: "https://x.com/tamakiyuichiro/status/1567315242740502529",
      label: "玉木雄一郎（国民民主党）",
      text: "政府は住民税非課税世帯に5万円を給付する方針…インフレ手当",
    },
  ],
  "invoice-menzei-2026": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "給料が上がる経済…税負担配慮",
    },
  ],
  "boei-tokubetsuzei": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "積極財政…税負担",
    },
  ],
  "noto-fukko-budget": [
    {
      url: "https://x.com/tamakiyuichiro/status/1567315242740502529",
      label: "玉木雄一郎（国民民主党）",
      text: "物価高に苦しむ世帯への支援",
    },
  ],
  "gakushu-shien-75000": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "子育て支援・教育費",
    },
  ],
  "denki-gas-genmen": [
    {
      url: "https://x.com/tamakiyuichiro/status/1567315242740502529",
      label: "玉木雄一郎（国民民主党）",
      text: "物価高・エネルギー",
    },
  ],
  "pension-kuriage-70": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "社会保障・手取り",
    },
  ],
  "minimum-wage-2026": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "賃上げ・最低賃金",
    },
  ],
  "expo2025-kessan": [
    {
      url: "https://x.com/tamakiyuichiro/status/1567315242740502529",
      label: "玉木雄一郎（国民民主党）",
      text: "財政・公共事業",
    },
  ],
  "zeihikaku-kojo": [
    {
      url: "https://x.com/tamakiyuichiro/status/1719652949000159463",
      label: "玉木雄一郎（国民民主党）",
      text: "消費税・手取り",
    },
  ],
};

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function parseStatus(url) {
  const m = url.match(/status\/(\d+)/);
  return m ? { id: m[1], url: url.replace("twitter.com", "x.com") } : null;
}

async function applyXSeeds(slug, seeds) {
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(articlePath, "utf8"));
  const posts = [];
  for (const seed of seeds) {
    const parsed = parseStatus(seed.url);
    if (!parsed) continue;
    posts.push({
      slot: posts.length + 1,
      status: "url_found",
      post_url: parsed.url,
      account_label: seed.label ?? "",
      speaker_hint: seed.label ?? "",
      captured_at: null,
      screenshot: null,
      note: "batch10 seed",
      post_text: seed.text ?? "",
      text_fetched_at: new Date().toISOString(),
    });
  }
  article.xPosts = posts.slice(0, 5);
  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  return posts.length;
}

for (const slug of slugs) {
  console.log(`\n=== finish batch10: ${slug} ===`);
  const seeds = X_SEEDS[slug];
  if (seeds) await applyXSeeds(slug, seeds);
  await runNode("legal-check.mjs", ["--slug", slug, "--fix"]);

  const article = await loadArticle(slug);
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
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  const raw = JSON.parse(await readFile(articlePath, "utf8"));
  raw.adminHidden = true;
  raw.pageReady = false;
  if (isPublishGate(pipeline)) {
    raw.publishReady = true;
    console.log(`✅ ${slug} publishReady (hidden draft)`);
  } else {
    raw.publishReady = false;
    console.log(`⚠️ ${slug} 未達:`);
    for (const b of gate.blockers) console.log(`  - ${b.id}: ${b.detail}`);
  }
  await writeFile(articlePath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
}

await refreshProjectStatus();
console.log("\ndone finish-batch10");
