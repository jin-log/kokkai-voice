#!/usr/bin/env node
/** docs/article-rewrite-audit.md を生成（本番JSONは変更しない） */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PROPOSED = {
  "bouka-taisaku": "物価高で確保した1兆円予備費、何に使われた？",
  "shohizei-genmen": "食料品消費税ゼロ公約、スーパーはまだ8%？",
  "boeeihi": "防衛費増で増税はある？安保三文書と財源",
  "chingin": "2026春闘5.32%賃上げ、手取りは増えた？",
  "nenkin": "年金制度改革、独り暮らし高齢者の生活は？",
  "gaikokujin-seisaku": "在留外国人412万人、国会は何を議論してる？",
  "shoshika": "8割が結婚希望なのに6割で終わる理由",
  "kyoiku-mushoka": "大学無償化、授業料は下がった？",
  "energy-policy": "新エネルギー基本計画、電気代・LNGはどうなる？",
  "seiji-shikin": "政治資金、2027年からオンライン提出義務に",
  "senkyo-kaikaku": "参院合区（鳥取・島根など）いつ解消される？",
  "kaigo-iryo": "介護保険は縮小される？健康保険法改正の中身",
  "chiho-sosei": "地方創生50年、東京一極集中は改善した？",
  "hosei-yosan": "補正予算3兆円、予備費2.5兆の使途は？",
  "nichigyo": "裏金問題議員の復活、国会はどう言ってる？",
  "casino-ir": "大阪IR2030開業、1060億円効果は本当？",
  "kenpo": "憲法改正、国民投票のルールはいつ変わる？",
  "tariff-us": "トランプ関税、日米合意5500億ドルはどうなる？",
  "kishida-resign": "高市内閣始動、財政・危機管理投資の中身",
  "komei-kokumin": "超党派の学校教育法改正、5党で何が動いた？",
  "case-mqwdrley": "【東京都知事】小池氏・学歴告発から2年、結局どうなった？",
  "shussho-budget-seika": "出生率改善予算とその成果実績",
  "fukushuto-koso": "副首都構想って何？",
  "osaka-to-metropolis": "大阪都構想のメリットデメリット",
  "fuhou-immin-trend": "不法移民の国内数推移",
  "tokyo-solar-panel": "【東京都】太陽光パネル設置義務とは？",
};

function auditBody(article) {
  const slug = article.slug;
  const issues = [];
  const title = article.title || "";
  if (/ — あの話どうなった？$/.test(title)) {
    issues.push({
      field: "title",
      problem: "政策ラベル＋固定サフィックス。国民の具体疑問になっていない",
      action: `→「${PROPOSED[slug] || "（具体疑問形に再命名）"}」`,
    });
  } else if (PROPOSED[slug] && title !== PROPOSED[slug]) {
    issues.push({
      field: "title",
      problem: `現タイトルと提案が不一致`,
      action: `→「${PROPOSED[slug]}」`,
    });
  }
  const plain = article.plainExplanation || "";
  const firstPara = plain.split("\n\n")[0] || "";
  const proposedTitle = PROPOSED[slug] || title.replace(/ — あの話どうなった？$/, "");
  if (plain && !firstPara.includes("結論") && firstPara.length > 20) {
    const qWords = proposedTitle.replace(/[？?【】]/g, "").slice(0, 12);
    if (!firstPara.includes("8%") && proposedTitle.includes("8%") && slug === "shohizei-genmen") {
      issues.push({
        field: "plainExplanation",
        problem: "1段落目がタイトルの疑問（8%のままか）に直接答えていない",
        action: "1段落目を「結論：2026年6月時点でも食料品消費税8%のまま。ゼロ公約は未実施」から始める",
      });
    } else if (
      slug === "bouka-taisaku" &&
      !firstPara.includes("1兆") &&
      !firstPara.includes("予備費")
    ) {
      issues.push({
        field: "plainExplanation",
        problem: "議事録要約から入っており、タイトル「1兆円予備費の使途」に答えていない",
        action: "1段落目で2024年9月の使途決定（燃料油対策等）を先に書く",
      });
    } else if (firstPara.startsWith("衆議院") || firstPara.startsWith("この記事では")) {
      issues.push({
        field: "plainExplanation",
        problem: "メタ説明・委員会名から入っている",
        action: `1段落目で「${proposedTitle}」への直接回答（数字・状態）を先出し`,
      });
    }
  }
  if (!plain) {
    issues.push({
      field: "plainExplanation",
      problem: "未整備",
      action: "Skill §6 読者の疑問スキルに沿って新規執筆",
    });
  }
  const b0 = article.nowSummary?.bullets?.[0] || "";
  if (/ — あの話どうなった？/.test(title) && b0 && !b0.match(/\d|未実施|％|%|万人|兆|円/)) {
    issues.push({
      field: "nowSummary",
      problem: "1行目に数字・状態・時計が弱い",
      action: "タイトルの疑問への結論＋経過月数を1行目に",
    });
  }
  return issues;
}

const dir = path.join(root, "data/articles");
const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "test.json");
let md = `# 既存記事 書き換え提案一覧（本番未反映）

最終更新: 2026-06-28  
**用途:** オーナー確認用。data/articles/*.json はこの資料反映前に本番のまま。

**方針:** \`docs/writer-editorial.md\` § タイトル・§ 内容の心理（具体疑問 → 結論先出し）

---

## サマリ

| 区分 | 件数 |
|------|------|
| タイトル差し替え提案 | ${Object.keys(PROPOSED).length} |
| 新規10本（別ファイル） | batch10 下書き |

---

`;

for (const f of files.sort()) {
  const article = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  const slug = article.slug;
  if (slug === "test") continue;
  const issues = auditBody(article);
  md += `## ${slug}\n\n`;
  md += `- **現タイトル:** ${article.title}\n`;
  if (PROPOSED[slug]) md += `- **提案タイトル:** ${PROPOSED[slug]}\n`;
  md += `- **公開状態:** publishReady=${article.publishReady ?? "?"} / pageReady=${article.pageReady ?? "?"}\n\n`;
  if (issues.length === 0) {
    md += `✅ タイトル・冒頭はSkill基準に近い。細部のみ執筆時に調整可。\n\n`;
  } else {
    md += `| フィールド | 問題 | 修正案 |\n|-----------|------|--------|\n`;
    for (const i of issues) {
      md += `| ${i.field} | ${i.problem} | ${i.action} |\n`;
    }
    md += `\n`;
  }
}

md += `---

## 反映手順（オーナーGO後）

1. 本資料でOKの案件のみ \`scripts/apply-curiosity-titles.mjs\` + 手動 \`plainExplanation\` 修正
2. \`node scripts/check-case-page.mjs --slug {slug}\`
3. 管理画面から公開

**CEOは本番JSONを勝手に push しない。**
`;

await writeFile(path.join(root, "docs/article-rewrite-audit.md"), md, "utf8");
console.log("wrote docs/article-rewrite-audit.md");
