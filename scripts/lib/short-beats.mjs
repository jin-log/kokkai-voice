/**
 * F1 ビート定義 — 0〜2秒フック・疑問投げ・テロップ主役（docs/shorts-consult-research.md）
 *
 * ## 横展開テンプレ（2026-08-05 確定・shohizei-genmen 採用）
 * - テロップは **1行1枚**。ボディは **約2秒台**（TTS短文＋tempo 1.35）
 * - フックは **2枚分割**（数字クレーム → 矛盾）。0〜3秒帯で切る
 * - 背景は `SLUG_BEAT_CLIPS` で **トピック関連素材**を手指定（汎用夜景禁止）
 * - CTAナレは短く（「どう思う？コメントで教えて。」）
 * - 生成: `npm run short:generate -- --slug <slug> --tempo 1.35` → 確認後 upload
 *
 * @typedef {{ id: string, style: 'hook'|'question'|'number'|'body'|'diet'|'cta', telop: string[], narr: string }} ShortBeat
 */
import {
  commentNarration,
  commentTelopLines,
} from "./short-comment-cta.mjs";
import { buildShortHook } from "../../src/lib/headline-hooks.mjs";

/** @param {string} _slug @param {string} [_category] */
function ctaBeat(_slug, _category) {
  return {
    id: "cta",
    style: "cta",
    telop: commentTelopLines(),
    narr: commentNarration(),
  };
}

/** @type {Record<string, ShortBeat[]>} */
export const F1_BEATS = {
  shoshika: [
    {
      id: "hook",
      style: "hook",
      telop: ["8割は結婚したい", "なのに少子化は止まらない"],
      narr: "国会でも論点になっている。8割は結婚したいのに、なぜ少子化は止まらない？",
    },
    {
      id: "gap",
      style: "number",
      telop: ["希望 約80%", "実際 男60% 女70%"],
      narr: "希望は8割。実際に35歳まで結婚したのは、男性6割、女性7割。",
    },
    {
      id: "kokkai",
      style: "diet",
      telop: ["国会で谷浩一郎議員が", "希望と現実のギャップを追及"],
      narr: "国会では、谷浩一郎議員が希望と現実のギャップを追及している。",
    },
    {
      id: "why",
      style: "body",
      telop: ["ギャップの正体", "未婚化・晩婚化"],
      narr: "ギャップの正体は、未婚化と晩婚化。",
    },
    ctaBeat("shoshika", "少子化"),
  ],
  "shussho-budget-seika": [
    {
      id: "hook",
      style: "hook",
      telop: ["3.6兆円かけたのに", "出生率は下がった？"],
      narr: "子育て支援に3.6兆円。なのに、出生率は下がった？",
    },
    {
      id: "budget",
      style: "number",
      telop: ["2023年 こども未来戦略", "加速化プラン 3.6兆円"],
      narr: "2023年12月、こども未来戦略で3.6兆円規模の加速化プランが始まった。",
    },
    {
      id: "rate",
      style: "number",
      telop: ["2025年 出生率 1.14", "前年 1.15 から低下"],
      narr: "2025年の合計特殊出生率は1.14。前年の1.15から低下している。",
    },
    {
      id: "born",
      style: "body",
      telop: ["出生数 約67万人", "前年比 1.4万人減"],
      narr: "出生数は約67万1千人。前年より1万4千人減った。",
    },
    ctaBeat("shussho-budget-seika", "少子化"),
  ],
  "case-mqzxgs3f": [
    {
      id: "hook",
      style: "hook",
      telop: ["スパイ防止法", "なぜまだ成立しない？"],
      narr: "スパイ防止法、なぜ2026年もまだ成立しない？",
    },
    {
      id: "status",
      style: "number",
      telop: ["2026年", "国会で未成立"],
      narr: "包括的スパイ防止法は、2026年時点でも国会で成立していない。",
    },
    {
      id: "bill",
      style: "diet",
      telop: ["国家情報会議", "設置法案は審議中"],
      narr: "一方、国家情報会議設置法案は内閣委員会で審議に入った。",
    },
    {
      id: "gap",
      style: "body",
      telop: ["法制化の射程", "国会で争点に"],
      narr: "スパイ防止法制と何が別で、何がセットか。国会で争点になっている。",
    },
    ctaBeat("case-mqzxgs3f", "スパイ防止法"),
  ],
  /** rank1 — フック0〜3秒で2カット、ボディは2〜3秒/枚 */
  "shohizei-genmen": [
    {
      id: "hook1",
      style: "hook",
      telop: ["食料品の税が1%に？"],
      narr: "来春から1パーセント？",
    },
    {
      id: "hook2",
      style: "hook",
      telop: ["法律はまだない"],
      narr: "法律はまだない。",
    },
    {
      id: "when1",
      style: "number",
      telop: ["2027年4月から2年"],
      narr: "2027年4月から2年。",
    },
    {
      id: "when2",
      style: "number",
      telop: ["飲食料品を1%に"],
      narr: "飲食料品を1パーセントに。",
    },
    {
      id: "when3",
      style: "diet",
      telop: ["首相が準備を指示"],
      narr: "首相が準備を指示。",
    },
    {
      id: "bridge1",
      style: "body",
      telop: ["つなぎの位置づけ"],
      narr: "つなぎの位置づけ。",
    },
    {
      id: "bridge2",
      style: "body",
      telop: ["給付に回す案も"],
      narr: "給付に回す案も出た。",
    },
    {
      id: "bridge3",
      style: "body",
      telop: ["合意はしていない"],
      narr: "合意はしていない。",
    },
    {
      id: "pay1",
      style: "diet",
      telop: ["閣議決定もこれから"],
      narr: "閣議決定もこれから。",
    },
    {
      id: "pay2",
      style: "diet",
      telop: ["法案提出もこれから"],
      narr: "法案提出もこれから。",
    },
    {
      id: "pay3",
      style: "number",
      telop: ["法律ができるまで"],
      narr: "法律ができるまで、",
    },
    {
      id: "pay4",
      style: "number",
      telop: ["税率はいま据え置き"],
      narr: "税率はいま据え置き。",
    },
    {
      id: "cta",
      style: "cta",
      telop: commentTelopLines(),
      narr: "どう思う？コメントで教えて。",
    },
  ],
  /** rank2 — shohizei テンプレ横展開 */
  "tariff-us": [
    {
      id: "hook1",
      style: "hook",
      telop: ["車の対米関税15%"],
      narr: "車の対米関税、15パーセント。",
    },
    {
      id: "hook2",
      style: "hook",
      telop: ["輸出額はもう2割減"],
      narr: "輸出額はもう2割減った。",
    },
    {
      id: "when1",
      style: "number",
      telop: ["日米合意で15%"],
      narr: "日米合意で15パーセント。",
    },
    {
      id: "when2",
      style: "number",
      telop: ["相互も自動車も同率"],
      narr: "相互も自動車も同じ税率。",
    },
    {
      id: "when3",
      style: "body",
      telop: ["日本側の関税下げなし"],
      narr: "日本側の関税引き下げはない。",
    },
    {
      id: "num1",
      style: "number",
      telop: ["対米輸出▲10.2%"],
      narr: "対米輸出は10.2パーセント減。",
    },
    {
      id: "num2",
      style: "number",
      telop: ["自動車輸出額▲22.7%"],
      narr: "自動車の輸出額は22.7パーセント減。",
    },
    {
      id: "num3",
      style: "number",
      telop: ["GDP▲0.4ポイント試算"],
      narr: "GDPは0.4ポイント下押しの試算。",
    },
    {
      id: "pay1",
      style: "body",
      telop: ["年2兆円超の負担減"],
      narr: "関税負担は年2兆円超の削減とも説明。",
    },
    {
      id: "pay2",
      style: "diet",
      telop: ["合意から約1年"],
      narr: "合意から約1年が経った。",
    },
    {
      id: "cta",
      style: "cta",
      telop: commentTelopLines(),
      narr: "どう思う？コメントで教えて。",
    },
  ],
};

/**
 * @param {import('../../src/lib/articles.mjs').Article} article
 * @returns {ShortBeat[]}
 */
export function beatsForArticle(article) {
  if (F1_BEATS[article.slug]) return F1_BEATS[article.slug];

  const bullets = article.nowSummary?.bullets ?? [];
  if (bullets.length < 2) {
    throw new Error(`${article.slug}: F1用のビートが足りません`);
  }

  const hook = buildShortHook(article);
  const b1 = String(bullets[1]).replace(/（[^）]+）/g, "").trim();

  return [
    {
      id: "hook",
      style: "hook",
      telop: hook.telop,
      narr: hook.narr,
    },
    {
      id: "q1",
      style: "number",
      telop: splitTelop(b1, 12),
      narr: b1,
    },
    ctaBeat(article.slug, article.searchKeyword || article.category),
  ];
}

/** @param {string} text @param {number} max */
function splitTelop(text, max) {
  if (text.length <= max) return [text];

  const cuts = ["、", "。", "？", "！", "・", "は", "が", "を", "に"];
  const mid = Math.ceil(text.length / 2);
  let best = -1;
  let bestScore = Infinity;

  for (let i = 1; i < text.length; i++) {
    const a = text.slice(0, i).trim();
    const b = text.slice(i).trim();
    if (!a || !b || b.length <= 2) continue;
    const dist = Math.abs(i - mid);
    const bonus = cuts.includes(text[i - 1]) ? -2 : 0;
    const score = dist + bonus;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }

  if (best > 0) {
    return [text.slice(0, best).trim(), text.slice(best).trim()].filter(Boolean);
  }

  return [text.slice(0, max), text.slice(max)].filter((s) => s.length > 2);
}
