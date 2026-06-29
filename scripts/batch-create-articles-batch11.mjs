#!/usr/bin/env node
/** 新規10記事 batch11 — init → register */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ARTICLES_BATCH11 = [
  {
    slug: "kome-kakaku-shien",
    keyword: "コメ 価格 支援",
    title: "コメ価格が高い、政府の備蓄米放出はいつまで？",
    sources: [
      "https://www.maff.go.jp/j/zyukyu/zyukyu_beikoku/index.html",
      "https://www.kantei.go.jp/jp/headline/kome/index.html",
      "https://www.mof.go.jp/policy/budget/budger_workflow/account/index.html",
    ],
  },
  {
    slug: "koko-mushoka-2027",
    keyword: "高校 無償化",
    title: "高校無償化、2027年から本格化で世帯負担はいくら減る？",
    sources: [
      "https://www.mext.go.jp/a_menu/shotou/mushouka/",
      "https://www.cfa.go.jp/policies/gakushu_shien/",
      "https://www.kantei.go.jp/jp/headline/kodomo_gakushu/index.html",
    ],
  },
  {
    slug: "nisa-seigen-kaijo",
    keyword: "NISA 非課税 上限",
    title: "NISA非課税枠、いまいくらまで積み立てられる？",
    sources: [
      "https://www.fsa.go.jp/policy/nisa2/about/",
      "https://www.mof.go.jp/policy/tax_policy/tax_reform/outline/index.html",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
    ],
  },
  {
    slug: "furusato-nouzei-genmen",
    keyword: "ふるさと納税 上限",
    title: "ふるさと納税、自己負担2000円の上限額はどう計算される？",
    sources: [
      "https://www.soumu.go.jp/main_sosiki/c-zaisei/furusato/",
      "https://www.fsa.go.jp/receipt/furusato_nouzei/",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
    ],
  },
  {
    slug: "food-loss-hou",
    keyword: "食品ロス 削減 法案",
    title: "食品ロス削減法案、スーパーの廃棄はどう変わる？",
    sources: [
      "https://www.maff.go.jp/j/zyukyu/food_loss/index.html",
      "https://www.kantei.go.jp/jp/headline/sdgs/index.html",
      "https://www.env.go.jp/recycle/food/index.html",
    ],
  },
  {
    slug: "koyo-chosei-joseikin",
    keyword: "雇用調整助成金",
    title: "雇用調整助成金、休業手当は給与の何割まで？",
    sources: [
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_employment/koyou/koyou-chousei/index.html",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_employment/index.html",
    ],
  },
  {
    slug: "jidousha-hoken-genmen",
    keyword: "自動車保険 保険料",
    title: "自動車保険料、物価高で平均いくら上がった？",
    sources: [
      "https://www.fsa.go.jp/news/30/20250101.html",
      "https://www.kantei.go.jp/jp/headline/bouka_taisaku/index.html",
      "https://www.mof.go.jp/policy/tax_policy/tax_reform/outline/index.html",
    ],
  },
  {
    slug: "jutaku-loan-kinri",
    keyword: "住宅ローン 金利",
    title: "住宅ローン金利、2026年はどのくらい？固定と変動の差",
    sources: [
      "https://www.boj.or.jp/statistics/market/loan/index.htm",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/jutaku/index.html",
    ],
  },
  {
    slug: "shakaihoken-hokenryo",
    keyword: "社会保険料 負担",
    title: "社会保険料、2026年度の給与からいくら引かれる？",
    sources: [
      "https://www.nenkin.go.jp/service/kounen/hokenryo/index.html",
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/index.html",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
    ],
  },
  {
    slug: "zeimu-kozo-kaikaku",
    keyword: "税務調査 法人",
    title: "税務調査、2026年の重点分野と企業への影響は？",
    sources: [
      "https://www.nta.go.jp/about/organization/chosa/chousa.htm",
      "https://www.mof.go.jp/tax_policy/tax_reform/outline/index.html",
      "https://www.kantei.go.jp/jp/headline/keizai/index.html",
    ],
  },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: "inherit", shell: true });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function main() {
  const onlyInit = process.argv.includes("--init-only");
  for (const a of ARTICLES_BATCH11) {
    console.log(`\n=== ${a.slug} ===`);
    await run("node", [
      "scripts/init-article-general.mjs",
      "--slug", a.slug,
      "--keyword", a.keyword,
      "--title", a.title,
      "--sources", a.sources.join(","),
      "--admin-hidden",
    ]);
  }
  if (!onlyInit) {
    console.log("\n→ apply-writer-batch11.mjs でコンテンツ完成");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
