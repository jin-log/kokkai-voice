#!/usr/bin/env node
/** 新規10記事 — init → register（completeは apply-writer-batch10 が担当） */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ARTICLES_BATCH10 = [
  {
    slug: "teigaku-kyufu-2024",
    keyword: "定額給付金 2024 3万円",
    title: "2024年定額給付3万円、もらえなかった人は？",
    sources: [
      "https://www.kantei.go.jp/jp/headline/bonus/index.html",
      "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kyufukin/teigaku.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000126907_00001.html",
    ],
  },
  {
    slug: "invoice-menzei-2026",
    keyword: "インボイス 免税事業者 2割特例",
    title: "インボイス免税の2割特例、2026年10月まで延長で何が変わる？",
    sources: [
      "https://www.invoice-kohyo.mof.go.jp/about.html",
      "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/invoice_about.htm",
      "https://www.meti.go.jp/policy/it_policy/invoicing/invoice_about/index.html",
    ],
  },
  {
    slug: "boei-tokubetsuzei",
    keyword: "防衛特別所得税",
    title: "防衛特別所得税、給与から年間いくら引かれる？",
    sources: [
      "https://www.mof.go.jp/tax_policy/summary/income/b04.htm",
      "https://www.mod.go.jp/j/policy/budget/budget.html",
      "https://www.kantei.go.jp/jp/headline/bouei/index.html",
    ],
  },
  {
    slug: "noto-fukko-budget",
    keyword: "能登半島地震 復興予算",
    title: "能登半島地震、復興予算はいくら入った？",
    sources: [
      "https://www.reconstruction.go.jp/topics/main-cat3/sub-cat3-1/20240101_ishikawa/",
      "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/c20240201.html",
      "https://www.kantei.go.jp/jp/headline/noto/index.html",
    ],
  },
  {
    slug: "gakushu-shien-75000",
    keyword: "子ども学習支援費 75000",
    title: "子ども学習支援費7万5千円、使えるものと申請方法",
    sources: [
      "https://www.cfa.go.jp/policies/gakushu_shien/",
      "https://www.mext.go.jp/a_menu/shotou/gakushu_shien/",
      "https://www.kantei.go.jp/jp/headline/kodomo_gakushu/index.html",
    ],
  },
  {
    slug: "denki-gas-genmen",
    keyword: "電気 ガス 価格激変緩和",
    title: "電気・ガス代の政府支援、2026年も続く？",
    sources: [
      "https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/price_electricity/",
      "https://www.kantei.go.jp/jp/headline/bouka_taisaku/index.html",
      "https://www.meti.go.jp/policy/energy_environment/electric_gas/electric/price.html",
    ],
  },
  {
    slug: "pension-kuriage-70",
    keyword: "年金 繰下げ 70歳",
    title: "年金70歳まで繰下げ、月額は最大いくら増える？",
    sources: [
      "https://www.nenkin.go.jp/service/kounen/kuriage/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/index.html",
      "https://www.nenkin.go.jp/service/kounen/nenkinshurui/index.html",
    ],
  },
  {
    slug: "minimum-wage-2026",
    keyword: "最低賃金 2026 全国平均",
    title: "2026年度最低賃金、全国平均はいくらに上がる？",
    sources: [
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/chingin/",
      "https://www.kantei.go.jp/jp/headline/chingin/index.html",
    ],
  },
  {
    slug: "expo2025-kessan",
    keyword: "大阪万博 2025 費用",
    title: "大阪・関西万博、公費は最終いくら？",
    sources: [
      "https://www.expo2025.or.jp/",
      "https://www.kantei.go.jp/jp/headline/expo2025/index.html",
      "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/",
    ],
  },
  {
    slug: "zeihikaku-kojo",
    keyword: "給付付き税額控除 消費税",
    title: "給付付き税額控除って何？消費税ゼロ公約の代替案",
    sources: [
      "https://www.kantei.go.jp/jp/headline/shouhizei/index.html",
      "https://www.mof.go.jp/tax_policy/tax_reform/outline/index.html",
      "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kokumin_kaigi/index.html",
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
  });
}

const onlyIdx = process.argv.indexOf("--only");
const onlySlug = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
const targets = onlySlug
  ? ARTICLES_BATCH10.filter((a) => a.slug === onlySlug)
  : ARTICLES_BATCH10;

for (const item of targets) {
  console.log(`\n========== ${item.slug} ==========\n`);
  const initArgs = [
    "--slug", item.slug,
    "--keyword", item.keyword,
    "--title", item.title,
    "--category", "行政",
    "--tags", "行政,経済",
    "--sources", item.sources.join(","),
    "--force",
  ];
  let code = await runNode("init-article-general.mjs", initArgs);
  if (code !== 0) continue;
  code = await runNode("register-article-index.mjs", ["--slug", item.slug]);
  if (code !== 0) continue;
  console.log(`✅ shell: ${item.slug}`);
}

console.log("\ndone batch10 init");
