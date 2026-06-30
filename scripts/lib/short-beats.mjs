/**
 * F1 ビート定義 — 0〜2秒フック・疑問投げ・テロップ主役（docs/shorts-consult-research.md）
 * @typedef {{ id: string, style: 'hook'|'question'|'number'|'body'|'diet'|'cta', telop: string[], narr: string }} ShortBeat
 */
import {
  commentNarration,
  commentQuestion,
  commentTelopLines,
} from "./short-comment-cta.mjs";
import { buildShortHook } from "../../src/lib/headline-hooks.mjs";

/** @param {string} slug @param {string} [category] */
function ctaBeat(slug, category) {
  const q = commentQuestion(slug, category);
  return {
    id: "cta",
    style: "cta",
    telop: commentTelopLines(),
    narr: commentNarration(q),
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
    ctaBeat(article.slug, kw),
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
