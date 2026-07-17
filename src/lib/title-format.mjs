/**
 * 記事タイトル — 案件の主要素にフォーカス（オーナー方針 2026-07-17 更新）
 *
 * ○ 読者の疑問・結論が分かる形（例: 【賃上げ】春闘5%でも最低賃金は未確定？）
 * × 「〇〇の動向」だけの簡素形（量産・有用性低判定の原因）
 * × 議事録切り出しをタイトルにしない
 *
 * TITLE_BRUSHUP を優先。STALLED_SIMPLE はレガシー互換のみ（新規に「動向」を足さない）。
 */
const SUFFIX = /\s*—\s*あの話どうなった？\s*$/;

/** スラグ別の確定タイトル（手動ブラッシュアップ・既存維持） */
export const TITLE_BRUSHUP = {
  "zeihikaku-kojo": "【給付付き税額控除】具体的内容と消費税ゼロ公約の代替案",
  "expo2025-kessan": "【大阪・関西万博】公費は最終いくら？",
  "minimum-wage-2026": "【2026年度最低賃金】全国平均はいくらに上がる？",
  "pension-kuriage-70": "【年金繰下げ】70歳まで受取開始を遅らせると月額はいくら増える？",
  "denki-gas-genmen": "【電気・ガス代支援】2026年も続く？減免の条件",
  "gakushu-shien-75000": "【子ども学習支援費7.5万円】使えるものと申請方法",
  "noto-fukko-budget": "【能登半島地震】復興予算はいくら入った？",
  "boei-tokubetsuzei": "【防衛特別所得税】給与から年間いくら引かれる？",
  "invoice-menzei-2026": "【インボイス2割特例】2026年10月まで延長で何が変わる？",
  "teigaku-kyufu-2024": "【2024年定額給付3万円】もらえなかった人は？",
  "shussho-budget-seika": "【出生率・子育て支援】3.6兆円は効いた？2025年の実績",
  "fukushuto-koso": "【副首都構想】第二の首都はどこ？具体案と争点",
  "osaka-to-metropolis": "【大阪都構想】メリット・デメリットと最新の行方",
  "fuhou-immin-trend": "【不法滞在】国内の人数推移と政府の対応",
  "bouka-taisaku": "【物価高対策】支援策の内容といまの効果",
  "shohizei-genmen": "【食料品の消費税】減税・免税の議論と最新",
  "boeeihi": "【防衛費・安保】増額の行方と安保政策の最新",
  "chingin": "【賃上げ】春闘5%でも最低賃金は未確定？",
  "nenkin": "【年金制度改革】受給年齢・支給額の変更点",
  "gaikokujin-seisaku": "【外国人政策】在留・労働・共生の最新論点",
  "shoshika": "【少子化対策】支援策の内容と出生率の動向",
  "kyoiku-mushoka": "【大学無償化】対象者・条件と財源の争点",
  "energy-policy": "【エネルギー政策】原発・再エネ・電気代の行方",
  "seiji-shikin": "【政治資金】政党助成と献金ルールの最新",
  "senkyo-kaikaku": "【選挙制度改革】論点と各党の主張",
  "kaigo-iryo": "【介護・医療費】負担増の議論と支援策",
  "chiho-sosei": "【地方創生】交付金と地域政策の最新",
  "hosei-yosan": "【補正予算】追加支出の内容と背景",
  "nichigyo": "【政治とカネ】献金問題と規制の動向",
  "casino-ir": "【カジノIR】大阪を中心に進むIntegrated Resort",
  "kenpo": "【憲法改正】9条・緊急事態条項など争点整理",
  "tariff-us": "【米国関税・貿易】日本への影響と政府の対応",
  "kishida-resign": "【政権・内閣人事】首相交代と政策の行方",
  "komei-kokumin": "学校教育法改正とデジタル教科書",
  "case-mqwdrley": "【東京都知事】小池百合子氏・学歴巡る刑事告発の経緯",
  "tokyo-solar-panel": "【東京都】太陽光パネル設置義務とは？",
  "case-mqzxgs3f": "【スパイ防止法】なぜ成立しない？国家情報会議法案との関係",
  "case-mr0jbdpc": "【国旗損壊罪】連立合意で法制化へ？いま国会の動き",
  "case-mqzxj4ro": "【国会議員のボーナス】期末手当はいくら？2023年給与法改正の争点",
  "kokumin-kaigi": "【国民会議】は民主主義の否定か？",
  "kojin-joho-kaisei": "【個人情報保護法改正】同意なしで提供へ。政治家は例外？",
};

/**
 * レガシー互換のみ。新規記事・修正では使わない。
 * 「動向」への自動変換は禁止（2026-07-17）。
 */
export const STALLED_SIMPLE_TITLES = {};

/** @param {string} title */
export function stripLegacySuffix(title) {
  return (title || "").replace(SUFFIX, "").trim();
}

/** @param {string} title */
export function hasBracketTitle(title) {
  return /^【.+】/.test(stripLegacySuffix(title));
}

/**
 * 【争点】副題 — 「の動向」を付けない。そのまま返す。
 * @param {string} title
 */
export function simplifyBracketTitle(title) {
  return stripLegacySuffix(title);
}

/**
 * @param {import('./articles.mjs').Article | { slug?: string, title?: string }} article
 * @returns {string}
 */
export function citizenTitle(article) {
  const slug = article.slug;
  if (slug && TITLE_BRUSHUP[slug]) return TITLE_BRUSHUP[slug];
  if (slug && STALLED_SIMPLE_TITLES[slug]) return STALLED_SIMPLE_TITLES[slug];

  let t = stripLegacySuffix(article.title || "");
  if (hasBracketTitle(t)) return t;

  const aanodewa = (article.title || "").match(/^(.+?)\s*—\s*あの話どうなった？\s*$/);
  if (aanodewa) return aanodewa[1].trim();

  return t;
}

/** @param {import('./articles.mjs').Article} article */
export function brushupTitleForArticle(article) {
  return citizenTitle(article);
}
