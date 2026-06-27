#!/usr/bin/env node
/**
 * 複数記事を prepare → init → register → complete まで一括実行
 *
 * Usage:
 *   node scripts/batch-create-articles.mjs
 *   node scripts/batch-create-articles.mjs --only tokyo-solar-panel
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareArticleCreate } from "../functions/lib/article-prepare.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ARTICLES = [
  {
    slug: "tokyo-solar-panel",
    keyword: "太陽光パネル 設置義務 東京都",
    title: "【東京都】太陽光パネル設置義務とは？",
    sources: [
      "https://www.koho.metro.tokyo.lg.jp/2025/03/02.html",
      "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
      "https://www.metro.tokyo.lg.jp/governor/action/katsudo/2023/6/02_01",
    ],
  },
  {
    slug: "fuhou-immin-trend",
    keyword: "不法移民 在留外国人数",
    title: "不法移民の国内数推移",
    sources: [
      "https://www.moj.go.jp/isa/publications/press/13_00058.html",
      "https://www.jiji.com/jc/article?k=2026032700900&g=pol",
      "https://www.sankei.com/article/20260327-RTIGC3KW2ZCOTNQXGYWQYP72QQ",
    ],
  },
  {
    slug: "osaka-to-metropolis",
    keyword: "大阪都構想",
    title: "大阪都構想のメリットデメリット",
    sources: [
      "https://business.nikkei.com/atcl/gen/19/00081/032400166/",
      "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
      "https://mainichi.jp/articles/20260520/k00/00m/010/263000c",
    ],
  },
  {
    slug: "fukushuto-koso",
    keyword: "副首都構想",
    title: "副首都構想って何？",
    sources: [
      "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
      "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
      "https://www.nri.com/jp/media/column/kiuchi/20251020_2.html",
    ],
  },
  {
    slug: "shussho-budget-seika",
    keyword: "出生率 子育て支援 予算",
    title: "出生率改善予算とその成果実績",
    sources: [
      "https://www.cfa.go.jp/policies/kodomo-mirai/",
      "https://www.mhlw.go.jp/stf/houdou/0000198851_00001.html",
      "https://www8.cao.go.jp/cstp/whitepaper/r06/honpen/html/i1110000.html",
    ],
  },
];

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

const onlyIdx = process.argv.indexOf("--only");
const onlySlug = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
const targets = onlySlug ? ARTICLES.filter((a) => a.slug === onlySlug) : ARTICLES;

if (onlySlug && targets.length === 0) {
  console.error(`不明な slug: ${onlySlug}`);
  process.exit(1);
}

const tavilyApiKey = process.env.TAVILY_API_KEY;
const results = [];

for (const item of targets) {
  console.log(`\n========== ${item.slug} ==========\n`);

  const prepared = await prepareArticleCreate({
    keyword: item.keyword,
    title: item.title,
    slug: item.slug,
    env: { TAVILY_API_KEY: tavilyApiKey },
  });

  let plan = prepared;
  if (item.sources?.length) {
    const { category, tags } = prepared.ok
      ? { category: prepared.category, tags: prepared.tags }
      : { category: "行政", tags: "行政" };
    plan = {
      ok: true,
      slug: item.slug,
      title: item.title,
      keyword: item.keyword,
      category: category === "国会" ? "行政" : category,
      tags: category === "国会" ? "行政" : tags,
      sources: item.sources.join(","),
      plan: `${category === "国会" ? "行政" : category}案件（指定ソース ${item.sources.length} 件）`,
    };
  } else if (!prepared.ok) {
    console.error(`prepare 失敗: ${prepared.error}`);
    results.push({ slug: item.slug, ok: false, step: "prepare" });
    continue;
  }

  console.log(`plan: ${plan.plan} (${plan.category})`);

  const initArgs =
    plan.category === "国会"
      ? [
          "--slug",
          plan.slug,
          "--keyword",
          plan.keyword,
          "--title",
          plan.title,
          "--category",
          plan.category,
          "--tags",
          plan.tags,
          "--force",
        ]
      : [
          "--slug",
          plan.slug,
          "--keyword",
          plan.keyword,
          "--title",
          plan.title,
          "--category",
          plan.category,
          "--tags",
          plan.tags,
          "--sources",
          plan.sources,
          "--force",
        ];

  const initScript = plan.category === "国会" ? "init-article.mjs" : "init-article-general.mjs";
  let code = await runNode(initScript, initArgs);
  if (code !== 0) {
    results.push({ slug: item.slug, ok: false, step: "init" });
    continue;
  }

  code = await runNode("register-article-index.mjs", ["--slug", plan.slug]);
  if (code !== 0) {
    results.push({ slug: item.slug, ok: false, step: "register" });
    continue;
  }

  code = await runNode("complete-article.mjs", ["--slug", plan.slug]);
  results.push({ slug: item.slug, ok: code === 0, step: code === 0 ? "done" : "complete" });
}

console.log("\n========== 結果 ==========");
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.slug} (${r.step})`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) process.exit(2);
