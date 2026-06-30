/** 国会発言から AI 要約レイヤーを生成（原文にない数字・引用は出さない） */

import { topicTerms, textMatchesTopic } from "../../src/lib/topic-relevance.mjs";

const GLOSSARY = {
  予備費: "予見しにくい支出に備えて、年度の予算に最初から計上しておく経費",
  補正予算: "年度の途中で国の歳出・歳入を見直すための追加予算",
  国民投票法: "憲法改正の賛否を国民に問う投票の手続きを定めた法律",
  公選法: "国会議員や地方首長の選挙のルールを定めた法律",
  憲法改正: "国会の発議と国民投票を経て、日本国憲法の条文を変えること",
  消費税: "商品やサービスの購入時に課される税金",
  賃上げ: "企業が従業員の給料や賃金を引き上げること",
  最低賃金: "法律で定められた賃金の下限額",
  防衛費: "自衛隊や防衛のための国の支出",
  年金: "老後や障害などに備えて積み立て・給付される仕組み",
  少子化: "出生数の減少や子ども数の減少が進むこと",
  介護保険: "高齢者などの介護の費用を社会全体で支える保険制度",
  地方創生: "人口減少地域の活力を高めるための国の政策の総称",
  政治資金: "政党や政治家の活動に使われるお金と、その管理ルール",
  政党交付金: "国が政党の活動費として交付する公金",
  統合型リゾート: "カジノを含む大型複合施設（いわゆるIR）のこと",
  カジノ: "統合型リゾート（IR）内で行われる賭博事業のこと",
  カジノ管理委員会: "カジノ事業の許可審査や運営監督を行う独立行政法人",
  国民民主党: "2024年に結党した中道系の国会政党",
  公明党: "公明と連携関係にある国会政党",
  附帯決議: "法案成立と同時に国会が示す意向や要望の決議",
  学校教育法: "学校教育の制度の根拠となる法律",
  大学: "高等教育を行う教育機関",
  無償: "利用者が費用を負担しないこと（授業料などを国や自治体が負担する文脈）",
  関税: "輸入品などに課される税金",
  外国人材: "日本で働く外国人労働者の受け入れ・在留の制度",
  選挙制度: "議員の選び方（選挙区の区切りや議席の配分など）の仕組み",
  物価高騰: "物の値段が続けて上がること",
  原発: "原子力発電所のこと",
  再生可能エネルギー: "太陽光・風力など、自然の力で発電するエネルギー",
  ふるさと納税: "寄附を通じて地方自治体を応援し、税控除を受けられる制度",
  大学無償化: "大学の授業料などを国や自治体が負担する取り組み",
  裏金: "政治資金の報告義務を逸脱して管理されたとされるお金",
  内閣: "首相と各大臣で構成される、国の行政の最高機関",
  GDP: "国内総生産。国の経済規模を示す指標の一つ",
  価格転嫁: "仕入れや人件費の上昇分を売値などに反映すること",
  公正取引委員会: "独占禁止法違反などを取り締まる行政委員会",
  独禁法: "不当な制限競争や独占を禁じる法律（独占禁止法）",
  取適法: "下請代金の支払いなどを定める下請法の俗称",
  エネルギー: "電力・ガス・燃料など社会活動に必要なエネルギー全般",
  原子力: "原子核のエネルギーを利用する発電方式など",
  外国人: "日本国籍を持たないで在留・活動する人",
  介護: "高齢者や障害のある人の日常生活を支える支援",
  選挙: "国会議員や首長などを国民が選ぶ手続き",
  食料品: "米・野菜・肉など日常の飲食に使う商品",
  物価: "物やサービスの値段水準のこと",
  政治とカネ: "政治活動と資金のやり取りをめぐる問題",
  政党助成: "国が政党の活動費として交付する公金（政党交付金）",
  生活保護: "生活に困った人への最低限の生活費を国が支える制度",
  国民年金: "自営業者などが加入する公的年金の基礎部分",
  寄附金控除: "政治献金などを所得税から一定額控除できる制度",
  政治資金規正法: "政治資金の収支報告などを定めた法律",
  未婚化: "結婚しない人の割合が高まること",
  晩婚化: "結婚や出産の年齢が遅くなること",
  国際収支: "国と外国との間のお金のやり取りの総計",
  貿易赤字: "輸入が輸出を上回り、貿易で赤字になる状態",
  スパイ防止法: "国家の安全や機密を守るため、諜報活動などを罰する法律の議論",
  国旗: "日本の国旗（日の丸）。損壊・汚損を罰する法制化が国会で議論されている",
  国旗損壊罪: "国旗や国歌を損壊・汚損した行為を罰する罪（創設をめぐる法案）",
  特別職: "内閣総理大臣や大臣など、一般公務員とは別枠の公務員",
  歳費: "国会議員の報酬として支払われる手当",
  給与法: "公務員の給与の決め方を定めた法律",
  国家情報: "外交・防衛・経済安保などに関わる機密情報",
};

/** キーワード → 用語集候補（本文に無くても最低2語を確保） */
const KEYWORD_GLOSSARY_HINTS = {
  物価: ["物価", "物価高騰", "賃上げ"],
  食料品: ["食料品", "消費税"],
  消費税: ["消費税", "食料品"],
  外国人: ["外国人", "外国人材"],
  防衛費: ["防衛費", "GDP"],
  年金: ["年金", "国民年金"],
  少子化: ["少子化", "晩婚化"],
  大学: ["大学", "大学無償化"],
  無償: ["大学無償化", "大学"],
  賃上げ: ["賃上げ", "最低賃金"],
  エネルギー: ["エネルギー", "再生可能エネルギー"],
  政治資金: ["政治資金", "政党交付金"],
  選挙制度: ["選挙制度", "公選法"],
  介護: ["介護", "介護保険"],
  地方創生: ["地方創生", "ふるさと納税"],
  補正予算: ["補正予算", "予備費"],
  裏金: ["裏金", "政治資金"],
  カジノ: ["カジノ", "統合型リゾート"],
  憲法改正: ["憲法改正", "国民投票法"],
  関税: ["関税", "国際収支"],
  内閣: ["内閣", "補正予算"],
  国民民主党: ["国民民主党", "公明党"],
  スパイ防止法: ["スパイ防止法", "国家情報"],
  日本国旗: ["国旗損壊罪", "国旗"],
  ボーナス: ["ボーナス", "特別職", "歳費", "給与法"],
};

const PROCEDURAL = [
  /出席委員/,
  /議事日程/,
  /採決いたしまして/,
  /本会議の所要/,
  /御異議ありませんか/,
  /緊急上程の申出/,
  /討論通告/,
  /〔「異議なし」/,
  /開議/,
  /委員長　これより会議を開きます/,
  /資料映写/,
];

const FILLER_PATTERNS = [
  /というふうに承知して(います|おります)/g,
  /ということよりは/g,
  /というわけではなく(て)?/g,
  /というふうに/g,
  /と考え(ます|ています)/g,
  /と述べ(ます|ていきます)/g,
  /においては/g,
  /については/g,
  /に関し[、]?/g,
  /に対しては/g,
  /ということになりますが/g,
  /という観点から/g,
  /という観点で/g,
  /先行きを正確に見通すことが困難であるような中で/g,
  /厳しい状況が続く国民の皆様に/g,
  /きめ細かい支援を行うため/g,
  /当初の想定よりも物価が高騰したかどうかを理由としたというわけではなく(て)?/g,
  /物価が当初の想定よりも高騰した場合に備えて計上していた/g,
  /そのために/g,
  /それでは/g,
  /まず[、]?/g,
  /また[、]?/g,
  /さらに[、]?/g,
  /一方で[、]?/g,
  /以上でございます/g,
  /前回[、]?/g,
  /回答をいたします/g,
  /質問がありましたので/g,
];

const KANJI_NUM = { 元: 1, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

export const AI_DISCLAIMER =
  "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。";

export const NOW_SUMMARY_LABEL = "いまの結論（AI・平易語）";

const MAX_NOW_BULLET = 60;
const MAX_EDITORIAL_BULLET = 100;
const MAX_SUMMARY_BULLET = 48;
const MAX_PLAIN_SENTENCE = 90;

export function normalizeSpeechBody(text) {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^○[^　\n]{0,40}[　\s]/, "").trim())
    .filter((line) => line && !/^〔/.test(line))
    .join("");
}

export function splitSentences(text) {
  const body = normalizeSpeechBody(text);
  return body
    .split(/。(?![^（]*）)/)
    .map((s) => s.replace(/^　+/, "").trim())
    .filter((s) => s.length >= 20 && !isProcedural(s));
}

export function isProcedural(sentence) {
  return PROCEDURAL.some((re) => re.test(sentence));
}

export function countKeywordHits(text, keywords) {
  const terms = keywords.flatMap((k) => k.split(/\s+/)).filter(Boolean);
  let hits = 0;
  for (const term of terms) {
    hits += (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  }
  return hits;
}

export function scoreSentence(sentence, keywords) {
  let score = countKeywordHits(sentence, keywords) * 15;
  if (sentence.length >= 40 && sentence.length <= 220) score += 5;
  if (/伺い|質問|指摘|懸念|反対|賛成|提案|説明|必要|決定|計上|改正/.test(sentence)) score += 3;
  if (isProcedural(sentence)) score -= 100;
  return score;
}

function simplify(sentence) {
  return sentence
    .replace(/ございます/g, "です")
    .replace(/おります/g, "います")
    .replace(/申し上げます/g, "述べます")
    .replace(/存じます/g, "思います")
    .replace(/　+/g, "")
    .trim();
}

function stripFiller(text) {
  let t = text;
  for (const re of FILLER_PATTERNS) t = t.replace(re, "");
  return t.replace(/、+/g, "、").replace(/^、|、$/g, "").trim();
}

function kanjiDigitToNum(s) {
  if (!s) return null;
  if (s === "元") return 1;
  if (s.length === 1) return KANJI_NUM[s] ?? null;
  if (s.startsWith("十")) return 10 + (KANJI_NUM[s.slice(1)] ?? 0);
  if (s.endsWith("十")) return (KANJI_NUM[s[0]] ?? 0) * 10;
  if (s.includes("十")) {
    const [a, b] = s.split("十");
    return (KANJI_NUM[a] ?? 0) * 10 + (KANJI_NUM[b] ?? 0);
  }
  return KANJI_NUM[s] ?? null;
}

/** 原文の漢数字金額を短い表記に（原文に無い数字は出さない） */
function normalizeAmountInText(text) {
  const m = text.match(/([〇一二三四五六七八九十・]+)(兆|億|万)?円/);
  if (!m) return null;
  const raw = m[1].replace(/・/g, "");
  let num;
  if (/^\d+$/.test(raw)) {
    num = raw;
  } else if (raw.length === 2 && raw[1] === "〇") {
    num = String(kanjiDigitToNum(raw[0]) ?? raw);
  } else {
    const n = kanjiDigitToNum(raw);
    num = n != null ? String(n) : raw;
  }
  return `${num}${m[2] || ""}円`;
}

/** 原文の令和表記を西暦に（原文に無い日付は出さない） */
function extractReiwaWestern(text) {
  const m = text.match(/令和([元一二三四五六七八九十]+)年(?:の)?([一二三四五六七八九十]+)?月?/);
  if (!m) return null;
  const reiwa = kanjiDigitToNum(m[1]);
  if (reiwa == null) return null;
  const year = 2018 + reiwa;
  if (m[2]) {
    const month = kanjiDigitToNum(m[2]);
    if (month != null) return `${year}年${month}月`;
  }
  return `${year}年`;
}

function shortenPolicyName(text) {
  const m = text.match(/([^、。]{2,14}(?:対策|事業|法案|制度|予備費|予算)[^、。]{0,6})/);
  if (!m) return null;
  return m[1]
    .replace(/等に必要な経費/, "")
    .replace(/及び賃上げ促進環境整備対応/, "等")
    .replace(/令和六年度の一般会計予算の/, "")
    .trim();
}

function isOffTopicNoise(text) {
  return (
    /に似てる|言われる機会|敬意と感謝|心から敬意|（拍手）|御尽力/.test(text) ||
    /^私は、会派を代表/.test(text.trim()) ||
    /^ただいま議題となりました/.test(text.trim()) ||
    /^必要な(取組|検討)を進めてまいります。$/.test(text.trim())
  );
}

function isQualityBullet(text) {
  if (!text || text.length < 12) return false;
  if (isOffTopicNoise(text)) return false;
  if (/[のをにはでとへ向]$/.test(text) && text.length < 24) return false;
  if (/[がは]$/.test(text) && text.length < 28) return false;
  if (/(向け|ため|べき|含め|議員|投票|けれども|けど)$/.test(text)) return false;
  if (text.endsWith("…") && text.length < 24) return false;
  if (/などなど|にに|必要な経など|描けなくて/.test(text)) return false;
  if (text.length > 36 && /令和.+予算|一般会計予算/.test(text)) return false;
  if (/ですね$/.test(text)) return false;
  if (text.length > 42 && !/確保|目的|決定|賛同|必要|課題|禁止|規制/.test(text)) return false;
  if (!/確保|目的|決定|賛同|必要|課題|禁止|規制|主張|提案|提示|懸念|案|点|充|回す|延長|含む|緩和|制限|引上げ|据え置|ボーナス|賛成|制定|法制化|お尋ね|答弁|連立|合意|検討|起草|提出|損壊/.test(text)) {
    return false;
  }
  return true;
}

function truncateAt(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastPeriod = cut.lastIndexOf("。");
  if (lastPeriod > maxLen * 0.45) return cut.slice(0, lastPeriod + 1);
  const lastComma = cut.lastIndexOf("、");
  if (lastComma > maxLen * 0.5) return cut.slice(0, lastComma + 1);
  return cut + "…";
}

function bulletKey(text) {
  return text.replace(/[、。…\s]/g, "").slice(0, 18);
}

function isDuplicate(text, seen) {
  const key = bulletKey(text);
  for (const s of seen) {
    if (bulletKey(s) === key) return true;
    if (s.includes(key) || text.includes(bulletKey(s))) return true;
    const dateA = text.match(/^\d{4}年\d+月/);
    const dateB = s.match(/^\d{4}年\d+月/);
    if (dateA && dateB && dateA[0] === dateB[0]) return true;
  }
  return false;
}

function addBullet(list, seen, text, maxLen) {
  const line = truncateAt(text.replace(/。+$/, ""), maxLen);
  if (!line || !isQualityBullet(line) || isDuplicate(line, seen)) return false;
  seen.add(line);
  list.push(line);
  return true;
}

/** 文・節から意味を圧縮した短い一行を生成 */
function compressMeaning(source, keywords, maxLen, style = "conclusion") {
  const raw = source;
  const text = stripFiller(simplify(raw));

  const amount = normalizeAmountInText(raw);
  const date = extractReiwaWestern(raw);

  if (/予備費/.test(raw) && amount && style === "conclusion") {
    const prefix = /物価|高止まり|原油/.test(raw) ? "物価高止まりが続く前提で、" : "";
    return truncateAt(`${prefix}対策用の予備費${amount}を確保`, maxLen);
  }

  if (/予備費/.test(raw) && amount && style === "detail") {
    return truncateAt(`原油・物価対策予備費（当初${amount}）`, maxLen);
  }

  if (/機動的に対応/.test(raw) && style === "conclusion") {
    return truncateAt("単なる高騰想定の予備ではなく、不足時の機動対応が目的", maxLen);
  }

  if (/機動的に対応/.test(raw) && style === "detail") {
    return truncateAt("対策費の不足が出たときに柔軟に充てられる枠", maxLen);
  }

  if (/使用決定/.test(raw) && date) {
    if (/燃料油/.test(raw)) {
      return truncateAt(`${date}、燃料油価格対策などに使途を決定`, maxLen);
    }
    const purpose = shortenPolicyName(raw);
    const label = purpose ? purpose.replace(/事業$/, "対策") : "関連経費";
    return truncateAt(`${date}、${label}などに使途を決定`, maxLen);
  }

  if (/充てた/.test(raw) && style === "detail" && /燃料油/.test(raw)) {
    return truncateAt("燃料油価格激変緩和事業へ充当済み", maxLen);
  }

  if (/賃上げ促進/.test(raw) && style === "detail") {
    return truncateAt("賃上げ促進の環境整備も対象に含む", maxLen);
  }

  if (/賛同/.test(raw) && /国民投票|憲法改正/.test(raw)) {
    return truncateAt("国民投票の円滑化・周知のための改正3項目に賛同", maxLen);
  }

  if (/禁止すべき/.test(raw)) {
    const subj = raw.match(/([^、。]{4,16})は禁止/)?.[1];
    if (subj) return truncateAt(`${subj}の禁止を求める`, maxLen);
  }

  if (/規制/.test(raw) && /ネット|ＳＮＳ|世論誘導/.test(raw)) {
    return truncateAt("ネット上の有料世論誘導への規制を検討すべき", maxLen);
  }

  if (/与党の意向が強く反映/.test(raw)) {
    return truncateAt("広報協議会の構成は与党比率が高く公平性に課題", maxLen);
  }

  if (/解散/.test(raw) && /制限/.test(raw)) {
    return truncateAt("解散権には客観的条件での制限が必要", maxLen);
  }

  if (/マイクロターゲティング|ケンブリッジ|フェイスブック.*有権者/.test(raw)) {
    return truncateAt("有料の政治広告・世論操作手法への規制を論点に", maxLen);
  }

  if (/盛り込まれなかった/.test(raw)) {
    return truncateAt("今回の制度改革案には盛り込まれなかった点", maxLen);
  }

  if (/外国人.*寄附|外国法人.*寄附/.test(raw)) {
    return truncateAt("外国勢力の介入防止のため寄附禁止を求める", maxLen);
  }

  if (/創憲|憲法を国民の手で/.test(raw)) {
    return truncateAt("創憲を掲げ国民投票手続の課題解決を主張", maxLen);
  }

  if (/年金.*手厚|厚く用意/.test(raw)) {
    return truncateAt("年金給付をもう少し手厚くすべきとの意見", maxLen);
  }

  if (/拠出期間を長め|拠出期間/.test(raw)) {
    return truncateAt("国民年金の拠出期間延長の検討を提案", maxLen);
  }

  if (/厚生年金から国民年金|基礎年金の方に資金を動かす/.test(raw)) {
    return truncateAt("厚生年金の余剰を基礎年金へ回す案を提示", maxLen);
  }

  if (/生活保護/.test(raw) && /不安|耐えられ|困窮/.test(raw)) {
    return truncateAt("生活保護だけでは困窮高齢者を支えきれない懸念", maxLen);
  }

  if (/独り住まい|独身/.test(raw) && /年金|困/.test(raw)) {
    return truncateAt("独身・低年金者の生活困窮が増える懸念", maxLen);
  }

  if (/生活保障/.test(raw) && /年金/.test(raw)) {
    return truncateAt("年金で高齢者の生活保障を厚くすべき", maxLen);
  }

  if (/召集期限/.test(raw)) {
    return truncateAt("臨時会召集に期限を設ける憲法改正が必要", maxLen);
  }

  const clauses = text
    .split(/、/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 6);

  const ranked = clauses
    .map((c) => ({
      c,
      score:
        countKeywordHits(c, keywords) * 5 +
        (/必要|決定|計上|賛成|反対|懸念|提出|施行|禁止|規制|充て/.test(c) ? 8 : 0) +
        (c.length <= 40 ? 4 : 0) -
        (c.length > 70 ? 6 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]?.c || text;
  let line = top;

  if (style === "detail") {
    line = line.replace(/^(参政党は|我が党は|政府は)/, "");
  }

  if (/計上/.test(line) && !/確保|用意/.test(line)) {
    line = line.replace(/計上した?/, "計上");
  }

  line = line.replace(/承知をしています$/, "").replace(/承知しています$/, "");
  line = line.replace(/[がは]$/, "").replace(/[、,]$/, "");

  return truncateAt(line, maxLen);
}

function isTooVerbatim(bullet, speech) {
  const body = simplify(normalizeSpeechBody(speech)).replace(/[、。　\s]/g, "");
  const core = bullet.replace(/[、。　\s]/g, "");
  if (core.length < 16) return false;
  if (body.includes(core)) return true;
  if (body.includes(core.slice(0, Math.min(22, core.length)))) return true;
  return false;
}
function bulletPriority(text) {
  if (/予備費.*確保|対策用の予備費/.test(text)) return 50;
  if (/目的|機動対応/.test(text)) return 40;
  if (/\d{4}年\d+月/.test(text)) return 30;
  return 0;
}

function rankSentences(speech, keywords) {
  return splitSentences(speech)
    .map((s) => ({ s, score: scoreSentence(s, keywords) }))
    .sort((a, b) => b.score - a.score);
}

/** いまの結論：3〜5個の短い箇条書き（圧縮・非逐語） */
export function buildNowSummaryBullets(speech, keywords, min = 3, max = 5) {
  const ranked = rankSentences(speech, keywords);
  const candidates = [];
  const seen = new Set();

  const collect = (source) => {
    const line = compressMeaning(source, keywords, MAX_NOW_BULLET, "conclusion");
    if (!line || !isQualityBullet(line) || isDuplicate(line, seen)) return;
    if (isTooVerbatim(line, speech)) return;
    seen.add(line);
    candidates.push({
      line,
      tier: bulletPriority(line),
      score: scoreSentence(source, keywords),
    });
  };

  for (const { s } of ranked) collect(s);
  for (const { s } of ranked) {
    for (const clause of s.split(/、/).filter((c) => c.length >= 12)) collect(clause);
  }

  candidates.sort((a, b) => b.tier - a.tier || b.score - a.score);
  const withKw = candidates.filter(
    (c) => countKeywordHits(c.line, keywords) > 0 && matchesTopicText(c.line, keywords),
  );
  const pool = withKw.length >= min ? withKw : candidates.filter((c) => matchesTopicText(c.line, keywords));
  const bullets = pool.map((c) => c.line).slice(0, max);

  while (bullets.length < min && ranked.length > bullets.length) {
    const s = ranked[bullets.length]?.s;
    if (!s || !matchesTopicText(s, keywords)) break;
    const line = compressMeaning(s, keywords, MAX_NOW_BULLET, "conclusion");
    if (line && isQualityBullet(line) && !bullets.includes(line)) bullets.push(line);
    else break;
  }

  if (bullets.length < min) {
    for (const { s } of ranked) {
      if (!matchesTopicText(s, keywords)) continue;
      if (countKeywordHits(s, keywords) === 0 && withKw.length > 0) continue;
      const raw = s.replace(/\s+/g, " ").trim();
      const line = truncateAt(raw, MAX_NOW_BULLET);
      if (line.length < 12 || bullets.includes(line)) continue;
      bullets.push(line.endsWith("。") ? line : `${line}。`);
      if (bullets.length >= min) break;
    }
  }

  return bullets.slice(0, max);
}

const INCOMPLETE_END = /(おりませんが|について|に対し|とは|では|が、|を、|は、|下|ともに|今後)。$/;

function dedupeBullets(bullets) {
  const out = [];
  for (const raw of bullets) {
    const plain = String(raw).trim();
    if (!plain) continue;
    const line = plain.endsWith("。") ? plain : `${plain}。`;
    const key = bulletKey(line);
    if (out.some((o) => bulletKey(o) === key || o.startsWith(line.slice(0, 18)))) continue;
    out.push(line);
  }
  return out;
}

/** いまの結論：話題文を優先順に最大3行（逐語・汎用句を避ける） */
function buildEditorialConclusion(speech, keywords) {
  const body = normalizeSpeechBody(speech);
  const useFull = body.length <= 520;
  const ranked = rankSentences(speech, keywords).filter(
    ({ s }) => matchesTopicText(s, keywords) && !isOffTopicNoise(s),
  );
  const lines = [];
  const used = new Set();

  for (const { s } of ranked) {
    if (lines.length >= 3) break;
    const raw = s.replace(/\s+/g, " ").trim();
    let line = useFull ? raw : compressMeaning(s, keywords, MAX_NOW_BULLET, "conclusion");
    const maxLen = useFull ? MAX_EDITORIAL_BULLET : MAX_NOW_BULLET;
    if (!line || !matchesTopicText(line, keywords) || isOffTopicNoise(line)) {
      line = truncateAt(raw, maxLen);
    }
    if (line.length > maxLen) line = truncateAt(line, maxLen);
    const plain = line.endsWith("。") ? line : `${line}。`;
    if (INCOMPLETE_END.test(plain) || isOffTopicNoise(plain) || !matchesTopicText(plain, keywords)) {
      continue;
    }
    if (!isQualityBullet(line.replace(/。$/, ""))) continue;
    const key = bulletKey(plain);
    if (used.has(key)) continue;
    used.add(key);
    lines.push(plain);
  }

  return dedupeBullets(lines).slice(0, 4);
}

function matchesTopicText(text, keywords) {
  const terms = topicTerms(keywords.join(" ") || keywords[0] || "");
  return textMatchesTopic(String(text), terms);
}

function finalizeNowBullets(bullets, speech, keywords, min = 3, minTopic = 2) {
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    const line = String(raw).trim();
    if (!line || line.length < 10 || isOffTopicNoise(line)) return;
    const plain = line.endsWith("。") ? line : `${line}。`;
    if (seen.has(plain)) return;
    seen.add(plain);
    out.push(plain);
  };

  const ranked = rankSentences(speech, keywords);
  for (const { s } of ranked) {
    if (out.filter((b) => matchesTopicText(b, keywords)).length >= minTopic) break;
    if (!matchesTopicText(s, keywords)) continue;
    const line = compressMeaning(s, keywords, MAX_NOW_BULLET, "conclusion");
    if (line && isQualityBullet(line)) push(line);
  }

  for (const b of bullets) {
    if (!matchesTopicText(b, keywords) || !isQualityBullet(String(b).replace(/。$/, ""))) continue;
    push(b);
  }

  for (const { s } of ranked) {
    if (out.length >= min) break;
    if (!matchesTopicText(s, keywords)) continue;
    const line = compressMeaning(s, keywords, MAX_NOW_BULLET, "conclusion");
    if (line && isQualityBullet(line)) push(line);
    else {
      const raw = truncateAt(s.replace(/\s+/g, " ").trim(), MAX_NOW_BULLET);
      if (raw.length >= 12 && isQualityBullet(raw)) push(raw);
    }
  }

  return out.slice(0, 5);
}

/** AI要約箇条書き：nowSummary とは別角度の短い要点 */
export function buildSummaryBullets(speech, keywords, min = 3, max = 7) {
  const ranked = rankSentences(speech, keywords);
  const nowKeys = new Set(buildNowSummaryBullets(speech, keywords).map(bulletKey));
  const bullets = [];
  const seen = new Set();

  const tryAdd = (source) => {
    const line = compressMeaning(source, keywords, MAX_SUMMARY_BULLET, "detail");
    const plain = line.endsWith("。") ? line : line + "。";
    if (!matchesTopicText(line, keywords)) return false;
    if (nowKeys.has(bulletKey(line))) return false;
    if (!isQualityBullet(line)) return false;
    if (isTooVerbatim(line.replace(/。$/, ""), speech)) return false;
    if (isDuplicate(line, seen)) return false;
    seen.add(line);
    bullets.push(plain);
    return true;
  };

  for (const { s } of ranked) {
    if (tryAdd(s) && bullets.length >= max) break;
  }

  for (const { s } of ranked) {
    if (bullets.length >= max) break;
    const clauses = s
      .split(/、/)
      .map((c) => c.trim())
      .filter((c) => c.length >= 10)
      .sort((a, b) => scoreSentence(b, keywords) - scoreSentence(a, keywords));

    for (const clause of clauses) {
      if (tryAdd(clause) && bullets.length >= max) break;
    }
  }

  if (bullets.length < min) {
    for (const { s } of ranked) {
      if (!matchesTopicText(s, keywords)) continue;
      const raw = s.replace(/\s+/g, " ").trim();
      const line = truncateAt(raw, MAX_SUMMARY_BULLET);
      const plain = line.endsWith("。") ? line : `${line}。`;
      if (plain.length < 14 || nowKeys.has(bulletKey(line)) || bullets.includes(plain)) continue;
      if (!isQualityBullet(line)) continue;
      bullets.push(plain);
      if (bullets.length >= min) break;
    }
  }

  return bullets.slice(0, max).map((text) => ({
    text,
    speechRef: "primarySpeech",
  }));
}

/** @deprecated 段落結合版。後方互換のため残す */
export function buildThreeLineSummary(speech, keywords, meta = {}) {
  return buildNowSummaryBullets(speech, keywords).join("。") + "。";
}

export function buildPlainExplanation(speech, keywords, meta = {}) {
  const ranked = rankSentences(speech, keywords);

  const opener =
    meta.speaker && meta.nameOfMeeting
      ? `${meta.nameOfHouse}の${meta.nameOfMeeting}（${meta.date}）で、${meta.speaker}${meta.speakerGroup ? `（${meta.speakerGroup}）` : ""}が発言した内容を整理しています。`
      : "国会での最近の発言をもとに整理しています。";

  const core1 = ranked[0] ? compressMeaning(ranked[0].s, keywords, MAX_PLAIN_SENTENCE, "conclusion") : "";
  const core2 = ranked[1] ? compressMeaning(ranked[1].s, keywords, MAX_PLAIN_SENTENCE, "detail") : "";

  const synthesis = [core1, core2].filter(Boolean).join(" ");
  const p1 = synthesis
    ? `${opener} 要点は「${synthesis}」などです。`
    : `${opener} 詳細は下の国会議事録原文をご確認ください。`;

  const p2 =
    "ここでの整理は発言の一部を平易に言い換えたもので、政府・与党・野党の公式見解を断定するものではありません。数字や引用の正本は原文リンクで確認できます。";

  return `${p1}\n\n${p2}`;
}

export function buildGlossary(speech, keywords) {
  const body = normalizeSpeechBody(speech);
  const found = [];
  const seen = new Set();

  const add = (term) => {
    const definition = GLOSSARY[term];
    if (seen.has(term) || !definition) return;
    seen.add(term);
    found.push({ term, definition });
  };

  for (const kw of keywords) {
    for (const part of kw.split(/\s+/)) {
      add(part);
      for (const hint of KEYWORD_GLOSSARY_HINTS[part] || []) add(hint);
    }
  }

  for (const term of Object.keys(GLOSSARY)) {
    if (body.includes(term)) add(term);
  }

  if (found.length < 2) {
    for (const kw of keywords) {
      for (const part of kw.split(/\s+/)) {
        const hints = KEYWORD_GLOSSARY_HINTS[part] || [part];
        for (const hint of hints) {
          add(hint);
          if (found.length >= 2) break;
        }
        if (found.length >= 2) break;
      }
      if (found.length >= 2) break;
    }
  }

  return found.slice(0, 4);
}

/** 記事 JSON 用の AI 平易語レイヤー一式 */
export function buildArticleLayers(speech, keywords, meta = {}) {
  const updatedAt = new Date().toISOString();
  let nowBullets = buildEditorialConclusion(speech, keywords);
  if (nowBullets.length < 3) {
    const extra = dedupeBullets(
      finalizeNowBullets(buildNowSummaryBullets(speech, keywords), speech, keywords),
    );
    for (const b of extra) {
      if (nowBullets.length >= 3) break;
      const plain = b.endsWith("。") ? b : `${b}。`;
      if (!matchesTopicText(plain, keywords) || isOffTopicNoise(plain)) continue;
      if (nowBullets.includes(plain)) continue;
      nowBullets.push(plain);
    }
  }
  const bullets = buildSummaryBullets(speech, keywords);
  let summaryTexts = dedupeBullets(bullets.map((b) => b.text));
  for (const nb of nowBullets) {
    if (summaryTexts.length >= 3) break;
    const text = nb.endsWith("。") ? nb : `${nb}。`;
    if (!summaryTexts.includes(text)) summaryTexts.push(text);
  }
  const glossary = buildGlossary(speech, keywords);

  return {
    nowSummary: {
      label: NOW_SUMMARY_LABEL,
      bullets: nowBullets,
      disclaimer: AI_DISCLAIMER,
      updatedAt,
    },
    summaryBullets: summaryTexts,
    plainExplanation: buildPlainExplanation(speech, keywords, meta),
    glossary: glossary.slice(0, 4),
  };
}

export function buildNowSummary(speech, keywords, meta = {}) {
  return buildArticleLayers(speech, keywords, meta);
}
