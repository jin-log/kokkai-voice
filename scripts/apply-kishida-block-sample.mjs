#!/usr/bin/env node
/** 岸田政権記事 — 政策振り返り型ブロックのサンプル投入（メリデメなし） */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlePath = path.join(root, "data/articles/kishida-seiken-jisshi.json");

const article = JSON.parse(await readFile(articlePath, "utf8"));

article.nowSummary = {
  label: "いまの結論（AI・平易語）",
  bullets: [
    "岸田内閣（2021年10月就任〜2024年9月退陣）は、安保三文書改定・防衛増税、定額減税、こども未来戦略などを法制化・予算化した。退陣から約9カ月経過。",
    "2022年12月の安保三文書改定で防衛関連費を2027年度にGDP比2%水準へ引き上げる方針を確定。2024年6月の税制改正で防衛財源の増税と国民1人4万円の定額減税を同時に実施した。",
    "2023年12月のこども未来戦略で約3.6兆円の子育て支援加速化プランを閣議決定。物価高対策として電気・ガス負担軽減は2024年8月末で終了した。",
  ],
  disclaimer: article.nowSummary?.disclaimer,
  updatedAt: new Date().toISOString(),
};

article.summaryBullets = [
  "2023-01-26：岸田文雄— 防衛力強化の内容・予算・財源を三文書と税制大綱で一体示す方針を説明（衆院本会議・国会議事録）",
  "2022-12-16：国家安全保障戦略等3文書を閣議決定。五年で約43兆円規模の防衛整備と反撃能力保有を方針化",
  "2022-05-11：経済安全保障推進法が成立。半導体・重要物資の供給安定を法制化",
  "2023-10-01：インボイス制度（適格請求書等保存方式）の運用を開始",
  "2024-06-14：税制改正法成立。定額減税4万円/人と防衛力強化財源の増税を同時実施",
];

article.arcSummary = [
  {
    date: "2021-10-08",
    text: "2021-10-08 — 岸田文雄が所信表明（衆院本会議）。「新しい資本主義」「続ける責任ある積極財政」を掲げ、成長と分配の好循環を訴えた。",
  },
  {
    date: "2022-12-16",
    text: "2022-12-16 — 岸田政権が閣議決定で国家安全保障戦略等3文書を改定。「防衛力の抜本的強化」と2027年度までのGDP比2%水準を確定。",
  },
  {
    date: "2023-12-22",
    text: "2023-12-22 — 岸田政権がこども未来戦略を閣議決定。子育て支援加速化プラン約3.6兆円と児童手当拡充等を柱に掲げた。",
  },
  {
    date: "2024-06-14",
    text: "2024-06-14 — 岸田政権下で税制改正法成立。国民1人当たり4万円の定額減税と、防衛力強化のための所得税・たばこ税増税を実施。",
  },
  {
    date: "2024-08-14",
    text: "2024-08-14 — 岸田文雄が自民党総裁辞任を表明。政治資金問題等を背景に9月の総裁選へ移行。",
  },
];

article.plainExplanation =
  "岸田政権（2021年10月〜2024年9月）は、戦後最大級の安保三文書改定と防衛費増、経済安保法、こども未来戦略、定額減税・インボイス導入など、複数の大型政策を実施した政権です。\n\n2022年12月の三文書改定で防衛関連費のGDP比2%方針を確定し、2024年にはその財源となる増税と、物価高対策としての定額減税を同時に成立させました。一方、食料品消費税ゼロ公約や防衛増税の実施時期の明確化など、公約・説明とのズレが野党から指摘された論点も残っています。";

article.primarySpeech = {
  speechID: "121305254X00420230126_029",
  issueID: "121305254X00420230126",
  date: "2023-01-26",
  nameOfHouse: "衆議院",
  nameOfMeeting: "本会議",
  session: 213,
  issue: "第4号",
  speaker: "岸田文雄",
  speakerGroup: "自由民主党",
  speakerPosition: "内閣総理大臣",
  speechURL: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29",
  meetingURL: "https://kokkai.ndl.go.jp/txt/121305254X00420230126",
  excerpt:
    "防衛力強化の内容・予算・財源を、国家安全保障戦略等の三文書と税制改正大綱で一体的に示す方針を説明した。",
  speechFull: null,
};

article.glossary = [
  {
    term: "安保三文書",
    definition:
      "国家安全保障戦略・国家防衛戦略・防衛力整備計画。2022年12月に岸田内閣が改定。",
    relatedSlug: "boeeihi",
  },
  {
    term: "定額減税",
    definition: "2024年度税制改正で実施。所得税・住民税を合わせて1人当たり4万円を減税する措置。",
    relatedSlug: "teigaku-kyufu-2024",
  },
  {
    term: "経済安全保障",
    definition: "重要物資・技術の供給を確保する法律枠組み。2022年5月に経済安全保障推進法が成立。",
  },
  {
    term: "こども未来戦略",
    definition: "2023年12月閣議決定。子育て支援加速化プラン約3.6兆円を柱に掲げた政策パッケージ。",
  },
];

article.timeline = [
  {
    id: "kishida-seiken-jisshi-tl-0",
    type: "milestone",
    date: "2024-06-14",
    summaryPlain:
      "2024-06-14 [成立] 岸田政権下で税制改正法成立。定額減税4万円/人と防衛増税を同時実施。",
    milestone: { sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29" },
    sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29",
  },
  {
    id: "kishida-seiken-jisshi-tl-1",
    type: "milestone",
    date: "2023-12-22",
    summaryPlain:
      "2023-12-22 [閣議] 岸田政権がこども未来戦略を閣議決定。加速化プラン約3.6兆円を柱に掲げた。",
    milestone: { sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/" },
    sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/",
  },
  {
    id: "kishida-seiken-jisshi-tl-2",
    type: "milestone",
    date: "2022-12-16",
    summaryPlain:
      "2022-12-16 [閣議] 岸田政権が安保三文書を改定。防衛関連費のGDP比2%方針と五年43兆円規模を確定。",
    milestone: { sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/" },
    sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/",
  },
  {
    id: "kishida-seiken-jisshi-tl-3",
    type: "speech",
    date: "2023-01-26",
    summaryPlain:
      "2023-01-26 [国会] 岸田文雄— 防衛力強化の内容・予算・財源を三文書と税制大綱で一体示す方針を説明。",
    speech: {
      speechURL: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29",
      meetingURL: "https://kokkai.ndl.go.jp/txt/121305254X00420230126",
      speaker: "岸田文雄",
      date: "2023-01-26",
      nameOfHouse: "衆議院",
      nameOfMeeting: "本会議",
    },
  },
  {
    id: "kishida-seiken-jisshi-tl-4",
    type: "milestone",
    date: "2022-05-11",
    summaryPlain: "2022-05-11 [成立] 経済安全保障推進法が成立。重要物資・技術の供給安定を法制化。",
    milestone: { sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/" },
    sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/",
  },
  {
    id: "kishida-seiken-jisshi-tl-5",
    type: "milestone",
    date: "2021-10-08",
    summaryPlain:
      "2021-10-08 [国会] 岸田文雄が所信表明。「新しい資本主義」と責任ある積極財政を掲げ就任。",
    milestone: { sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29" },
    sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29",
  },
];

article.statsSeries = {
  title: "岸田政権の主要政策 — 公表数値",
  note: "閣議決定・法制化時点の公表数値。詳細は出典リンクを確認してください。",
  highlights: [
    {
      label: "2022 三文書",
      value: "43",
      unit: "兆円",
      sub: "五年間の防衛関連費整備計画（閣議決定）",
    },
    {
      label: "2024 減税",
      value: "4",
      unit: "万円/人",
      sub: "定額減税（所得税・住民税）",
    },
    {
      label: "2023 子育て",
      value: "3.6",
      unit: "兆円",
      sub: "こども未来戦略・加速化プラン",
    },
  ],
  chart: {
    ariaLabel: "岸田政権の主要政策数値",
    points: [
      { label: "2022\n防衛", value: 43, latest: false },
      { label: "2023\n子育て", value: 3.6, latest: false },
      { label: "2024\n減税", value: 4, latest: true },
    ],
  },
  table: {
    columns: ["時点", "政策", "数値", "出典"],
    rows: [
      {
        date: "2022-12-16",
        value: "防衛関連費 五年43兆円・GDP比2%",
        delta: "安保三文書改定",
        sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/",
        sourceLabel: "防衛省",
      },
      {
        date: "2023-12-22",
        value: "約3.6兆円",
        delta: "こども未来戦略",
        sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/",
        sourceLabel: "こども家庭庁",
      },
      {
        date: "2024-06-14",
        value: "4万円/人",
        delta: "定額減税",
        sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X00420230126/29",
        sourceLabel: "国会議事録",
      },
    ],
  },
};

article.caseType = "policy_retrospective";
article.contentBlocks = true;
delete article.prosCons;
delete article.meritsDemerits;
delete article.stanceMatrix;

article.relatedArticles = [
  "boeeihi",
  "shussho-budget-seika",
  "teigaku-kyufu-2024",
  "seiji-shikin",
  "kishida-resign",
];
article.relatedSlugs = article.relatedArticles;
article.editorialRulesAppliedAt = new Date().toISOString();
article.editorialRulesVersion = 1;
article.pageReady = false;
article.publishReady = true;
article.xPostsPolicy = "unavailable";

await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`);

const matrixPath = path.join(root, "data/policy-matrix/kishida-seiken-jisshi.json");
try {
  const { unlink } = await import("node:fs/promises");
  await unlink(matrixPath);
} catch {
  /* optional */
}

console.log("OK: kishida-seiken-jisshi — policy_retrospective sample applied");
console.log("Preview: http://localhost:8793/dev/preview/kishida-seiken-jisshi/");
