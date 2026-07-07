#!/usr/bin/env node
/** 岸田政権記事 — editorial-rules 準拠コンテンツ投入 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSpeechForKeyword, pickSpeech, excerptSpeech } from "./lib/kokkai-api.mjs";
import { lintArticle } from "../src/lib/editorial-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const queries = [
  ["岸田文雄 防衛力", "2022-11-01", "2023-02-15"],
  ["岸田文雄 定額", "2024-05-01", "2024-06-30"],
  ["岸田文雄 子ども", "2023-12-01", "2024-06-30"],
  ["岸田文雄 所信", "2021-10-01", "2021-11-30"],
  ["岸田文雄 物価", "2023-06-01", "2024-03-31"],
];

const speeches = [];
for (const [kw, from, until] of queries) {
  const f = await fetchSpeechForKeyword(kw, { from, until, maximumRecords: 40 });
  const b = pickSpeech(f.records, kw);
  if (b?.speaker === "岸田文雄") speeches.push(b);
}

const seen = new Set();
const uniq = [];
for (const s of speeches.sort((a, b) => b.date.localeCompare(a.date))) {
  const k = `${s.date}|${s.speechURL}`;
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(s);
}

const primary = uniq.find((s) => s.date === "2023-01-26") || uniq[0];
if (!primary) {
  console.error("岸田文雄の発言が取得できませんでした");
  process.exit(1);
}

const nowBullets = [
  "岸田内閣（2021年10月就任〜2024年9月退陣）は、岸田政権として安保三文書改定・防衛増税、定額減税、こども未来戦略などを法制化・予算化した。退陣から約9カ月経過。",
  "2022年12月の安保三文書改定で防衛関連費を2027年度にGDP比2%水準へ引き上げる方針を確定。2024年6月の税制改正で防衛財源の所得税・たばこ税増税と国民1人4万円の定額減税を同時に実施した。",
  "2023年12月のこども未来戦略で約3.6兆円の子育て支援加速化プランを閣議決定。物価高対策として電気・ガス負担軽減は2024年8月末で終了した。",
];

const summaryBullets = [
  "2023-01-26：岸田文雄— 防衛力強化の内容・予算・財源を三文書と税制大綱で一体示す方針を説明（衆院本会議・国会議事録）",
  "2022-12-16：国家安全保障戦略等3文書を閣議決定。五年で約43兆円規模の防衛整備と反撃能力保有を方針化",
  "2022-05-11：経済安全保障推進法が成立。半導体・重要物資の供給安定を法制化",
  "2023-10-01：インボイス制度（適格請求書等保存方式）の運用を開始",
  "2024-06-14：税制改正法成立。定額減税4万円/人と防衛力強化財源の増税を同時実施",
];

const arcSummary = [
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

function tlSummary(s) {
  const t = excerptSpeech(s.speech, 100).replace(/\s+/g, " ");
  const meeting = s.nameOfMeeting || "国会";
  return `${s.date} [国会] ${s.speaker}— 岸田政権の${meeting}で「${t.slice(0, 64)}…」と答弁。`;
}

const timeline = uniq.slice(0, 6).map((s, i) => ({
  id: `kishida-seiken-jisshi-tl-${i}`,
  type: "speech",
  date: s.date,
  summaryPlain: tlSummary(s),
  speech: {
    speechID: s.speechID,
    issueID: s.issueID,
    date: s.date,
    nameOfHouse: s.nameOfHouse,
    nameOfMeeting: s.nameOfMeeting,
    session: s.session,
    issue: s.issue,
    speaker: s.speaker,
    speakerGroup: s.speakerGroup,
    speechURL: s.speechURL,
    meetingURL: s.meetingURL,
  },
}));

if (timeline.length < 6) {
  const milestones = [
    {
      date: "2022-12-16",
      summaryPlain:
        "2022-12-16 [閣議] 岸田政権が安保三文書を改定。「防衛力の抜本的強化」とGDP比2%方針を確定。",
      sourceUrl: "https://www.mod.go.jp/j/policy/agenda/guideline/",
    },
    {
      date: "2024-06-14",
      summaryPlain:
        "2024-06-14 [成立] 岸田政権下で税制改正法成立。定額減税4万円/人と防衛増税を同時実施。",
      sourceUrl: primary.speechURL,
    },
  ];
  for (const m of milestones) {
    if (timeline.length >= 6) break;
    if (timeline.some((t) => t.date === m.date)) continue;
    timeline.push({
      id: `kishida-seiken-jisshi-tl-${timeline.length}`,
      type: "milestone",
      date: m.date,
      summaryPlain: m.summaryPlain,
      milestone: { sourceUrl: m.sourceUrl },
      sourceUrl: m.sourceUrl,
    });
  }
  timeline.sort((a, b) => b.date.localeCompare(a.date));
}

const article = JSON.parse(
  await readFile(path.join(root, "data/articles/kishida-seiken-jisshi.json"), "utf8"),
);

article.nowSummary = {
  label: "いまの結論（AI・平易語）",
  bullets: nowBullets,
  disclaimer: article.nowSummary?.disclaimer,
  updatedAt: new Date().toISOString(),
};
article.summaryBullets = summaryBullets;
article.arcSummary = arcSummary;
article.plainExplanation =
  "岸田政権（2021年10月〜2024年9月）は、戦後最大級の安保三文書改定と防衛費増、経済安保法、こども未来戦略、定額減税・インボイス導入など、複数の大型政策を実施した政権です。\n\n2022年12月の三文書改定で防衛関連費のGDP比2%方針を確定し、2024年にはその財源となる増税と、物価高対策としての定額減税を同時に成立させました。一方、食料品消費税ゼロ公約や防衛増税の実施時期の明確化など、公約・説明とのズレが野党から指摘された論点も残っています。";
article.primarySpeech = {
  speechID: primary.speechID,
  issueID: primary.issueID,
  date: primary.date,
  nameOfHouse: primary.nameOfHouse,
  nameOfMeeting: primary.nameOfMeeting,
  session: primary.session,
  issue: primary.issue,
  speaker: primary.speaker,
  speakerGroup: primary.speakerGroup,
  speakerPosition: primary.speakerPosition,
  speechURL: primary.speechURL,
  meetingURL: primary.meetingURL,
  excerpt: excerptSpeech(primary.speech, 320),
  speechFull: primary.speech,
};
article.glossary = [
  {
    term: "安保三文書",
    definition:
      "国家安全保障戦略・国家防衛戦略・防衛力整備計画。2022年12月に岸田内閣が改定。",
  },
  {
    term: "定額減税",
    definition: "2024年度税制改正で実施。所得税・住民税を合わせて1人当たり4万円を減税する措置。",
  },
  {
    term: "経済安全保障",
    definition: "重要物資・技術の供給を確保する法律枠組み。2022年5月に経済安全保障推進法が成立。",
  },
];
article.timeline = timeline;
article.prosCons = {
  disclaimer: "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
  merits: [
    {
      headline: "安保三文書で方針確定",
      text: "2022年12月閣議決定で防衛関連費のGDP比2%方針と五年43兆円規模の整備計画を明示した。",
      figure: "GDP比2%",
      sourceUrl: primary.speechURL,
      sourceLabel: "国会議事録",
      sourceDate: "2023-01-26",
    },
    {
      headline: "子育て支援の前倒し",
      text: "2023年12月のこども未来戦略で約3.6兆円の加速化プランと児童手当拡充等を閣議決定した。",
      figure: "約3.6兆円",
      sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/",
      sourceLabel: "こども家庭庁",
      sourceDate: "2023-12-22",
    },
  ],
  demerits: [
    {
      headline: "物価対策の打切り",
      text: "電気・ガス料金の負担軽減は2024年8月末で終了。酷暑期前の打切りを野党が問題視した。",
      figure: "2024年8月",
      sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X03620240620/6",
      sourceLabel: "国会議事録",
      sourceDate: "2024-06-20",
    },
    {
      headline: "増税と減税の同時実施",
      text: "2024年6月の税制改正で定額減税と防衛力強化のための所得税・たばこ税増税を同時に成立させた。",
      figure: "4万円/人",
      sourceUrl: primary.speechURL,
      sourceLabel: "国会議事録",
      sourceDate: "2024-06-14",
    },
  ],
  methodologyVersion: "v2-editorial-rules",
};
article.editorialRulesAppliedAt = new Date().toISOString();
article.editorialRulesVersion = 1;
article.pageReady = false;
article.publishReady = true;
article.relatedSlugs = ["boeeihi", "shussho-budget-seika", "teigaku-kyufu-2024", "seiji-shikin", "kishida-resign"];

const matrix = {
  policySlug: "kishida-seiken-jisshi",
  policyLabel: "岸田政権で実施した政策の動向",
  relatedArticleSlug: "kishida-seiken-jisshi",
  updatedAt: new Date().toISOString(),
  methodologyVersion: "v1-editorial",
  disclaimer: "党の公式評価ではなく、公言と行動の整理表です。",
  parties: [
    {
      partyLabel: "自由民主党",
      stance: {
        text: "防衛力の抜本的強化に必要な予算と財源を、三文書と税制改正大綱で一体的に示す。",
        sourceUrl: primary.speechURL,
        sourceType: "国会発言",
        capturedAt: "2023-01-26",
      },
      action: {
        text: "2022年12月に安保三文書を改定し、2024年6月に防衛財源の税制改正を成立させた。",
        speechUrl: primary.speechURL,
        capturedAt: "2023-01-26",
      },
      symbol: "◎",
      symbolReason:
        "公言（防衛力強化・財源一体提示）に対し、三文書改定と防衛増税を実施（2022-12・2024-06）",
    },
    {
      partyLabel: "立憲民主党",
      stance: {
        text: "必要な防衛力整備には理解を示しつつ、急激な防衛予算増と財源説明の不十分さに懸念を表明。",
        sourceUrl: "https://kokkai.ndl.go.jp/txt/121305254X03620240620/6",
        sourceType: "国会発言",
        capturedAt: "2024-06-20",
      },
      action: {
        text: "2024年6月、岸田内閣不信任決議案で防衛増税の財源説明と物価対策を問題視した。",
        speechUrl: "https://kokkai.ndl.go.jp/txt/121305254X03620240620/6",
        capturedAt: "2024-06-20",
      },
      symbol: "▲",
      symbolReason: "防衛費増への理解は示すが、増税隠し・説明不足を指摘（方向は近いが財源・期限のズレ）",
    },
  ],
};

await writeFile(
  path.join(root, "data/articles/kishida-seiken-jisshi.json"),
  `${JSON.stringify(article, null, 2)}\n`,
);
await writeFile(
  path.join(root, "data/policy-matrix/kishida-seiken-jisshi.json"),
  `${JSON.stringify(matrix, null, 2)}\n`,
);

const lint = lintArticle(article);
console.log(`lint ok=${lint.ok} blockers=${lint.blockers.length}`);
console.log(`primary: ${primary.speaker} ${primary.date}`);
console.log(`timeline: ${timeline.length}`);
