/**
 * 記事タイトルを「国民の具体的疑問」形に一括更新。
 * policy-matrix の policyLabel も同期。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshProjectStatus } from "../src/lib/project-status.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** @type {Record<string, string>} */
const TITLES = {
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
  // オーナー指定（既にOK）
  "shussho-budget-seika": "出生率改善予算とその成果実績",
  "fukushuto-koso": "副首都構想って何？",
  "osaka-to-metropolis": "大阪都構想のメリットデメリット",
  "fuhou-immin-trend": "不法移民の国内数推移",
  "tokyo-solar-panel": "【東京都】太陽光パネル設置義務とは？",
};

async function main() {
  for (const [slug, title] of Object.entries(TITLES)) {
    const articlePath = path.join(root, "data/articles", `${slug}.json`);
    let article;
    try {
      article = JSON.parse(await readFile(articlePath, "utf8"));
    } catch {
      console.warn(`skip (no article): ${slug}`);
      continue;
    }
    article.title = title;
    await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");

    const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
    try {
      const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
      matrix.policyLabel = title;
      matrix.policySlug = matrix.policySlug || slug;
      matrix.updatedAt = new Date().toISOString();
      await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
    } catch {
      /* no matrix */
    }
    console.log(`✅ ${slug}: ${title}`);
  }
  await refreshProjectStatus();
  console.log("\ndone");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
