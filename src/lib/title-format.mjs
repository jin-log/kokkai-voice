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
  "pension-kuriage-70": "【年金繰下げ】70歳開始なら月額は最大42%増",
  "denki-gas-genmen": "【電気・ガス代支援】2026年も続く？減免の条件",
  "gakushu-shien-75000": "【子ども学習支援費7.5万円】使えるものと申請方法",
  "noto-fukko-budget": "【能登半島地震】復興予算6600億円の内訳 — 必要額との差・進捗・不正の有無",
  "boei-tokubetsuzei": "【防衛特別所得税】給与から年間いくら引かれる？",
  "invoice-menzei-2026": "【インボイス2割特例】2026年10月まで延長で何が変わる？",
  "teigaku-kyufu-2024": "【2024年定額給付3万円】もらえなかった人は？",
  "shussho-budget-seika": "【出生率・子育て支援】3.6兆円は効いた？2025年の実績",
  "fukushuto-koso": "【副首都構想】第二の首都はどこ？具体案と争点",
  "osaka-to-metropolis": "【大阪都構想】来春投票へ？区割りは5案に絞り込み",
  "fuhou-immin-trend": "【不法滞在】国内の人数推移と政府の対応",
  "bouka-taisaku": "【物価高対策】高市首相が発言した「年8万超の支援」、中身は？",
  "shohizei-genmen": "【食料品減税】来春から2年1％方針 — 法律はまだ",
  "boeeihi": "【防衛費】財源は？安保三文書との関係",
  "chingin": "【賃上げ】春闘5%でも最低賃金は未確定？",
  "nenkin": "【年金制度改革】受給年齢・支給額の変更点",
  "gaikokujin-seisaku": "【外国人政策】高市内閣はゼロベースで見直したのか。人口戦略は？",
  "shoshika": "【少子化】支援策は増えたのに出生率は？",
  "kyoiku-mushoka": "【大学無償化】多子世帯は所得制限なし — 1〜2子世帯は残る",
  "energy-policy": "【エネルギー】第7次計画は原発を最大限活用 — 2040年再エネ4〜5割",
  "seiji-shikin": "【政治資金】政党助成と献金ルールの最新",
  "senkyo-kaikaku": "【定数削減】本会議採決はまだ — 特別委で趣旨説明まで",
  "kaigo-iryo": "【介護・医療】財源の重点配分は進んだか",
  "chiho-sosei": "【地方創生】地域未来戦略、政策パッケージは何を決めた？",
  "hosei-yosan": "【令和8年度補正】3.1兆円は何に積んだのか",
  "nichigyo": "【政治とカネ】ルールは一部変わった — 企業献金禁止は未了",
  "online-casino": "【オンラインカジノ】誘導発信は違法化済み — 投稿は減少",
  "kenpo": "【憲法改正】来春発議？審査会の争点は",
  "tariff-us": "【米トランプ関税】日米合意で相互・自動車は15% — 輸出とGDPへの影響",
  "kishida-resign": "【高市内閣】所信の最優先は物価高 — 賃上げは環境整備",
  "komei-kokumin": "【デジタル教科書】紙は廃止しない — 無償対象に正式化",
  "case-mqwdrley": "【小池都知事】学歴告発から2年、立件の公表はまだない",
  "tokyo-solar-panel": "【太陽光義務】個人住宅は対象外？義務を負うのは誰",
  "tokyo-recall": "【都知事リコール】署名はいつから集められる？",
  "case-mqzxgs3f": "【スパイ防止法】包括法は未成立 — 国家情報会議法案が先に審議",
  "case-mr0jbdpc": "【国旗損壊罪】今国会で成立 — 罰則2年以下・8月施行",
  "case-mqzxj4ro": "【議員ボーナス】期末手当は据え置きで成立 — 次の国政選まで",
  "kokumin-kaigi": "【社会保障国民会議】は民主主義の否定か？",
  "kojin-joho-kaisei": "【個人情報保護法】改正は誰の利益になるのか？",
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
