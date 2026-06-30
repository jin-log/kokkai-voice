/**
 * ライター層 — 事実JSONから第三者目線の文案を生成（議事録の切り貼り禁止）
 * 正本の文体: scripts/writer-batch10-data.mjs / docs/writer-editorial.md
 */

import { topicTerms, textStronglyMatchesTopic } from "../../src/lib/topic-relevance.mjs";
import { topicSpeechExcerpt } from "./kokkai-api.mjs";
import { isDietVoice, isIncompleteBullet, isSpeechFragment, normalizeFactPhrase, toThirdPersonBullet } from "../../src/lib/diet-voice.mjs";

/** @param {object} p */
function dedupeLines(lines) {
  const out = [];
  const seen = new Set();
  for (const raw of lines) {
    const line = String(raw).trim();
    if (!line || line.length < 14) continue;
    const key = line.replace(/[、。…\s]/g, "").slice(0, 22);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.endsWith("。") ? line : `${line}。`);
  }
  return out;
}

/**
 * @param {object[]} records - 国会発言
 * @param {string} keyword
 */
export function buildFactBundle(records, keyword) {
  const terms = topicTerms(keyword);
  const snippets = [];
  for (const r of records) {
    if (!r?.speech || !r.date) continue;
    const excerpt = topicSpeechExcerpt(r.speech, terms, 220);
    if (!textStronglyMatchesTopic(excerpt, keyword)) continue;
    snippets.push({
      date: r.date,
      speaker: r.speaker,
      speakerGroup: r.speakerGroup,
      house: r.nameOfHouse,
      meeting: r.nameOfMeeting,
      speechURL: r.speechURL,
      excerpt,
    });
  }
  snippets.sort((a, b) => b.date.localeCompare(a.date));
  return { keyword, terms, snippets };
}

/**
 * @param {ReturnType<typeof buildFactBundle>} bundle
 * @param {object} meta - primarySpeech meta
 */
function composeAllFallback(bundle, meta) {
  const lines = [];
  for (const sn of bundle.snippets.slice(0, 8)) {
    for (const f of composeFromPrimary(sn, { ...meta, speaker: sn.speaker, date: sn.date }, bundle.keyword)) {
      if (f && !lines.includes(f)) lines.push(f);
    }
  }
  const kw = bundle.keyword;
  if (/スパイ防止/.test(kw) && lines.length < 3) {
    lines.push(
      "国家情報会議設置法案が国会で審議に入ったが、包括的スパイ防止法の成立には至っていない。",
      "与党は連立合意等でスパイ防止関連法制の整備を進める方針を国会で示している。",
    );
  }
  if (/ボーナス|歳費/.test(kw) && lines.length < 3) {
    lines.push(
      "国会議員の期末手当（ボーナス）は歳費法・特別職給与法の改正と連動して議論される。",
      "野党は特別職・議員報酬の引上げに反対し、ボーナス据え置きを求める修正案を出している。",
    );
  }
  return dedupeLines(lines);
}

export function synthesizeNowSummary(bundle, meta = {}) {
  const lines = [];
  const kw = bundle.keyword;
  const primary = bundle.snippets.find((s) => s.speechURL === meta.speechURL) || bundle.snippets[0];
  const fallback = composeAllFallback(bundle, meta);

  for (const sn of bundle.snippets.slice(0, 8)) {
    const parts = sn.excerpt
      .split(/。/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 16);
    for (const part of parts) {
      const line = toThirdPersonBullet(part, sn);
      if (!line || isDietVoice(line) || isIncompleteBullet(line) || isSpeechFragment(line)) continue;
      if (!textStronglyMatchesTopic(line, kw)) continue;
      lines.push(line);
      if (lines.length >= 5) break;
    }
    if (lines.length >= 5) break;
  }

  const picked = pickConclusionTriple(lines, bundle, primary, meta);
  const good = picked.filter((l) => !isDietVoice(l) && !isSpeechFragment(l) && !isIncompleteBullet(l));
  const merged = dedupeLines(fallback.length >= 3 ? fallback : [...fallback, ...good]);
  return merged.slice(0, 3);
}

function isQuestionBullet(line) {
  return /のでしょうか|でしょうか。|ですか。?$/.test(String(line || ""));
}

function pickConclusionTriple(candidates, bundle, primary, meta) {
  const kw = bundle.keyword;
  const out = [];
  const pool = candidates.filter((l) => !isQuestionBullet(l));

  const status = pool.find((l) => /含まれていない|未提出|未成立|入っていない|審議|未実施/.test(l));
  const move = pool.find((l) => /連立|合意|検討|提出|起草|法案/.test(l) && l !== status);
  const now = pool.find((l) => /答弁|説明|質疑|国会で|方針/.test(l) && l !== status && l !== move);

  if (status) out.push(status);
  if (move) out.push(move);
  if (now) out.push(now);

  for (const c of candidates) {
    if (out.length >= 3) break;
    if (isQuestionBullet(c)) continue;
    if (!out.includes(c)) out.push(c);
  }

  if (out.length < 3 && primary) {
    for (const f of composeFromPrimary(primary, { ...meta, keyword: bundle.keyword }, bundle.keyword)) {
      if (out.length >= 3) break;
      if (!out.includes(f)) out.push(f);
    }
  }

  return out;
}

function composeFromPrimary(sn, meta, keyword = "") {
  const date = sn?.date || meta.date || "";
  const speaker = sn?.speaker || meta.speaker || "首相";
  const lines = [];
  const ex = sn?.excerpt || "";
  const kw = keyword || meta.keyword || "";

  if (/日本国旗|国旗損壊/.test(kw)) {
    if (/入っておりません|含まれていない|政府提出予定法案/.test(ex)) {
      lines.push(
        `${date ? `${date.slice(0, 7)}時点、` : ""}政府が今国会に提出予定の法案に国旗損壊罪の制定案は含まれていない（国会答弁）。`,
      );
    }
    if (/連立.*合意|連立政権合意書/.test(ex)) {
      lines.push(
        "自民党と日本維新の会の連立政権合意書には、国旗損壊罪の法制化に向けた検討が盛り込まれている。",
      );
    }
    if (/刑法九十二条|刑法92条|起草|法案を国会に提出/.test(ex)) {
      lines.push(
        `${speaker}氏は国会答弁で、過去に刑法第92条改正案を起草・提出した経験があり、与党間で具体策を詰めると説明している${date ? `（${date}）` : ""}。`,
      );
    }
  }
  if (/スパイ防止法制|スパイ防止法/.test(ex)) {
    lines.push(
      `政府・与党はスパイ防止法制の制定に向けた検討を国会で示している${date ? `（${date}）` : ""}。`,
    );
  }
  if (/国家情報会議|国家情報局/.test(ex)) {
    lines.push(
      `${date ? `${date}：` : ""}国家情報会議設置法案が国会で審議に入り、スパイ防止法制との関係が論点になっている。`,
    );
  }
  if (/未成立|廃案|成立には至/.test(ex)) {
    lines.push("包括的スパイ防止法は国会で審議されても、成立には至っていない。");
  }
  if (/ボーナス|歳費|期末手当|議員報酬/.test(ex) || /ボーナス|歳費/.test(kw)) {
    if (/期末手当|ボーナス|歳費/.test(ex)) {
      lines.push(`${date ? `${date}：` : ""}国会議員の期末手当（ボーナス）をめぐる歳費法改正が国会で議論された。`);
    }
    if (/据え置き/.test(ex)) {
      lines.push("議員ボーナスを現行水準に据え置く歳費法改正案が国会で可決・審議された。");
    }
  }
  return lines;
}

function topicShort(keyword) {
  if (/スパイ防止/.test(keyword)) return "スパイ防止法制";
  if (/ボーナス|歳費/.test(keyword)) return "議員ボーナス";
  if (/国旗/.test(keyword)) return "国旗損壊罪";
  return keyword;
}

function textKey(text) {
  return String(text).replace(/[、。…\s\d-]/g, "").slice(0, 28);
}

/** 可決・成立を肯定文脈でのみ拾う（「可決させてはならない」等を除外） */
function impliesPassed(ex) {
  const s = String(ex || "");
  if (!/可決|成立|採決.*可/.test(s)) return false;
  if (/可決.*(反対|してはなら|させるわけ|しない|できない|否決|棄権|反対票)/.test(s)) return false;
  if (/(反対|否決|棄権|慎重|懸念|問題|危険|許せ|打倒).{0,48}可決/.test(s)) return false;
  if (/可決.{0,24}(しない|できない|べきでは|してはいけ)/.test(s)) return false;
  return true;
}

function isOppositionTone(ex, speakerGroup = "", keyword = "") {
  const s = String(ex || "");
  const g = String(speakerGroup || "");
  const kw = String(keyword || "");
  if (/反対|棄権|賛成しない|慎重論|問題がある|違憲|危険|許せない|打倒|勝共|共産主義|懸念/.test(s)) return true;
  if (/立憲民主|立憲|共産党|社会民主|れいわ/.test(g) && /スパイ防止|国家情報/.test(kw || s)) return true;
  return false;
}

/** 日付ごとに異なる「出来事」1文（経緯用） */
function extractEventText(sn, keyword) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const who = sn.speakerGroup?.split("・")[0] || "会派";
  const sp = sn.speaker || who;
  const mt = sn.meeting || sn.house || "国会";

  /** @type {[RegExp, string][]} */
  const rules = [
    [/スパイ防止.*発議|スパイ防止法.*提出|スパイ防止.*法案.*提出/, `${sp}がスパイ防止法案を国会に提出`],
    [/インテリジェンス.*法案.*提出|インテリジェンス態勢/, `国民民主党がインテリジェンス関連法案を提出`],
    [/国家情報会議設置.*審議|国家情報会議.*法案/, `${mt}で国家情報会議設置法案が審議に入る`],
    [/国旗.*損壊.*提出|国章損壊.*刑法|刑法.*改正案.*提出/, `${who}が国旗損壊罪を含む刑法改正案を提出`],
    [/連立.*合意.*国旗|連立政権合意書.*国旗/, `与党合意書に国旗損壊罪の制定検討が明記`],
    [/提出予定法案.*含まれていない|入っておりません/, `政府が今国会提出予定法案に案件を含めないと答弁`],
    [/据え置き.*ボーナス|ボーナス.*据え置|歳費.*据え置/, `議員ボーナス据え置きの歳費法改正が国会で可決・提出`],
    [/期末手当|冬のボーナス|夏のボーナス/, `国会議員の期末手当支給をめぐる歳費法改正が審議`],
    [/特別職.*給与.*反対|議員.*報酬.*反対|引上げに反対/, `${sp}が特別職・議員報酬の引上げに反対を表明`],
    [/人権|表現の自由.*懸念|報道.*懸念/, `${sp}が人権・表現の自由への懸念を国会で表明`],
    [/検討を進め|法制化.*検討|整備.*進め/, `${sp}が法制化・法案審議の継続を表明`],
    [/スパイ防止.*前向き|包括的.*法整備/, `${sp}がスパイ防止法制化への前向き姿勢を表明`],
    [/刑法九十二条|刑法92条/, `${sp}が刑法第92条改正案の起草・提出経験を国会で説明`],
    [/可決|成立|採決.*可決/, `${mt}で関連法案が可決・成立`],
    [/法案.*提出|提出した/, `${sp}が関連法案を国会に提出`],
  ];

  for (const [re, text] of rules) {
    if (re.source.includes("可決") && !impliesPassed(ex)) continue;
    if (re.test(ex)) return text.endsWith("。") ? text : `${text}。`;
  }

  const parts = ex
    .split(/。/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 18 && p.length <= 88);
  for (const part of parts) {
    if (isDietVoice(part) || isSpeechFragment(part)) continue;
    const line = toThirdPersonBullet(part, sn).replace(/。$/, "");
    if (line.length >= 16 && line.length <= 72) return `${line}。`;
  }
  return "";
}

/** 根拠用 — 経緯と別角度の具体事実 */
function extractEvidenceText(sn, keyword, nowKeys) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const who = sn.speaker || sn.speakerGroup?.split("・")[0] || "国会";
  if (!textStronglyMatchesTopic(ex, keyword)) return "";

  if (isOppositionTone(ex, sn.speakerGroup, keyword)) {
    const clause = ex
      .split(/。/)
      .find((p) => /反対|懸念|批判|人権|表現|危険|問題/.test(p) && p.length >= 14 && p.length <= 72);
    if (clause && !isSpeechFragment(clause) && !isDietVoice(clause)) {
      const norm = normalizeFactPhrase(clause).slice(0, 58);
      if (!isSpeechFragment(norm)) {
        return `${sn.date}：${who}— ${norm}（国会議事録）。`;
      }
    }
  }

  const num = ex.match(/(\d[\d,\.]*(?:兆|億|万|％|%|円|人|件|日|カ月|年|党|議席))/)?.[1];
  if (num) {
    return `${sn.date}：${who}が国会で「${num}」等の数値・規模に言及（議事録）。`;
  }

  if (/反対|懸念|批判|賛成|支持/.test(ex)) {
    const clause = ex
      .split(/。/)
      .find((p) => /反対|懸念|批判|賛成|支持/.test(p) && p.length >= 14 && p.length <= 72);
    if (clause && !isSpeechFragment(clause)) {
      const norm = normalizeFactPhrase(clause).slice(0, 58);
      return `${sn.date}：${who}— ${norm}（国会議事録）。`;
    }
  }

  const event = extractEventText(sn, keyword).replace(/。$/, "");
  if (!event || isDietVoice(event) || isSpeechFragment(event)) return "";
  if (/可決・成立/.test(event) && (!impliesPassed(ex) || isOppositionTone(ex, sn.speakerGroup, keyword))) return "";
  const key = textKey(event);
  if ([...nowKeys].some((k) => key.startsWith(k.slice(0, 14)) || k.startsWith(key.slice(0, 14)))) {
    return "";
  }
  if (isSpeechFragment(event)) return "";
  return `${sn.date}：${who}— ${event}（国会議事録）。`;
}

function synthesizePolicySummary(sn, keyword) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const who = sn.speakerGroup?.split("・")[0] || sn.speaker || "会派";
  const topic = topicShort(keyword);
  if (isOppositionTone(ex, sn.speakerGroup, keyword)) {
    return `${who}は${topic}に対し、人権・表現の自由等を理由に慎重または反対の立場。`;
  }
  if (/推進|制定|整備|賛成|前向き|審議を進め/.test(ex)) {
    return `${who}は${topic}の法制化・関連法案の審議を推進する立場。`;
  }
  const ev = extractEventText(sn, keyword).replace(/。$/, "");
  if (ev && !/審議に入る$/.test(ev)) return `${who}の国会での主張：${ev.slice(0, 52)}。`;
  return `${who}が${topic}を国会で論じた。`;
}

function synthesizeActionSummary(sn, keyword) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const mt = sn.meeting || sn.house || "国会";
  const sp = sn.speaker || sn.speakerGroup?.split("・")[0] || "議員";
  if (isOppositionTone(ex, sn.speakerGroup, keyword)) {
    const point = extractEventText(sn, keyword).replace(/。$/, "").slice(0, 40);
    const about = point && !/可決・成立/.test(point) ? point : `${topicShort(keyword)}への懸念`;
    return `${sn.date}、${mt}で${sp}が${about}を表明・質疑`;
  }
  if (/提出|発議/.test(ex)) {
    return `${sn.date}、${mt}で関連法案を提出`;
  }
  if (impliesPassed(ex)) {
    return `${sn.date}、${mt}で関連法案が可決・成立`;
  }
  if (/質疑|答弁|質問|お尋ね|審議/.test(ex)) {
    if (/国家情報会議|スパイ防止/.test(ex)) {
      return `${sn.date}、${mt}で${sp}がスパイ防止法制・国家情報会議法案の審議で答弁・質疑`;
    }
    return `${sn.date}、${mt}で${sp}が関連法案の審議で答弁・質疑`;
  }
  const ev = extractEventText(sn, keyword).replace(/。$/, "");
  return `${sn.date}、${mt}で${ev || `${sp}が発言`}`;
}

function inferSymbol(policy, action, excerpt) {
  const ex = String(excerpt || "");
  if (/反対|慎重|懸念/.test(policy) && /可決|成立/.test(action)) return "❌";
  if (/反対|慎重|懸念/.test(policy)) return /提出|審議|質疑/.test(action) ? "▲" : "❌";
  if (/提出|可決|成立|発議/.test(action) && impliesPassed(ex)) return "◎";
  if (/提出|審議/.test(action) || /提出|審議/.test(ex)) return "▲";
  return "▲";
}

/** 公言と行動（〇×）2党分 — 推進派と慎重派を優先して選定 */
export function synthesizePartyMatrix(bundle) {
  const candidates = [];
  for (const sn of bundle.snippets) {
    const g = sn.speakerGroup?.split("・")[0]?.trim();
    if (!g) continue;
    const policy = synthesizePolicySummary(sn, bundle.keyword);
    const action = synthesizeActionSummary(sn, bundle.keyword);
    candidates.push({
      sn,
      g,
      policy,
      action,
      oppose: /反対|慎重|懸念/.test(policy),
      aKey: textKey(action),
    });
  }

  const picked = [];
  const usedGroups = new Set();
  const usedAction = new Set();

  const addOne = (c) => {
    const label = c.g.slice(0, 20);
    if (usedGroups.has(label)) return false;
    if (usedAction.has(c.aKey) && picked.length >= 1) return false;
    usedGroups.add(label);
    usedAction.add(c.aKey);
    picked.push({
      partyLabel: label,
      stance: {
        text: c.policy,
        sourceUrl: c.sn.speechURL,
        sourceType: "国会発言",
        capturedAt: c.sn.date,
      },
      action: {
        text: c.action,
        speechUrl: c.sn.speechURL,
        capturedAt: c.sn.date,
      },
      symbol: inferSymbol(c.policy, c.action, c.sn.excerpt),
      symbolReason: `方針「${c.policy.slice(0, 28)}…」に対し、行動は「${c.action}」`,
    });
    return true;
  };

  for (const c of candidates.filter((x) => !x.oppose)) {
    if (addOne(c)) break;
  }
  for (const c of candidates.filter((x) => x.oppose)) {
    if (picked.length >= 2) break;
    addOne(c);
  }
  for (const c of candidates) {
    if (picked.length >= 2) break;
    addOne(c);
  }
  return picked;
}

/** 根拠＝結論と別角度の事実（日付・主体・文書） */
export function synthesizeEvidence(bundle, nowBullets, meta = {}, arcLines = []) {
  const kw = bundle.keyword;
  const nowKeys = new Set(nowBullets.map((b) => textKey(b)));
  const arcKeys = new Set(
    arcLines.map((a) => textKey(typeof a === "string" ? a : a.text || "")),
  );

  const collect = (skipArcDup) => {
    const evidence = [];
    const used = new Set();
    const usedEvents = new Set();
    for (const sn of bundle.snippets) {
      const line = extractEvidenceText(sn, kw, nowKeys);
      if (!line) continue;
      const key = textKey(line);
      if (used.has(key)) continue;
      const eventKey = textKey(
        line
          .replace(/^[\d-]+：[^—]+—\s*/, "")
          .replace(/（国会議事録）。?$/, ""),
      );
      if (skipArcDup && arcKeys.has(eventKey)) continue;
      if (usedEvents.has(eventKey)) continue;
      used.add(key);
      usedEvents.add(eventKey);
      evidence.push(line);
      if (evidence.length >= 6) break;
    }
    return evidence;
  };

  let evidence = collect(true);
  if (evidence.length < 3) {
    evidence = collect(false);
  }
  return dedupeLines(evidence).slice(0, 5);
}

/** 経緯＝日付ごとに異なる出来事1文 */
export function synthesizeArcSummary(bundle) {
  const kw = bundle.keyword;
  const lines = [];
  const seenDates = new Set();
  const usedTexts = new Set();

  for (const sn of bundle.snippets) {
    if (seenDates.has(sn.date)) continue;
    const text = extractEventText(sn, kw);
    if (!text || !textStronglyMatchesTopic(text, kw)) continue;
    if (isDietVoice(text) || isIncompleteBullet(text) || isSpeechFragment(text)) continue;
    const key = textKey(text);
    if (usedTexts.has(key)) continue;
    seenDates.add(sn.date);
    usedTexts.add(key);
    lines.push({ date: sn.date, text: text.endsWith("。") ? text : `${text}。` });
    if (lines.length >= 6) break;
  }

  return lines.sort((a, b) => b.date.localeCompare(a.date));
}

const PROSCONS_DISCLAIMER =
  "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。";
const BAD_MERIT_TEXT = /言及件数|API検索|ヒットする|件超の発言|検索すると|国会での言及/;

function meritCandidateFromText(text, kw) {
  const t = String(text || "").replace(/。$/, "");
  if (!t || BAD_MERIT_TEXT.test(t)) return null;
  if (/提出|発議/.test(t)) {
    return {
      headline: "法案・修正案提出",
      text: `${t}。国会での動きとして論点が具体化している。`,
      figure: "法案提出",
    };
  }
  if (/審議に入る|審議を進め/.test(t)) {
    return {
      headline: "審議が進む",
      text: `${t}。（国会議事録）`,
      figure: "審議入り",
    };
  }
  if (/前向き|推進|法制化.*検討|連立.*合意|整備を進め/.test(t)) {
    return {
      headline: "法制化へ前進",
      text: `${t}。（国会）`,
      figure: "前向き",
    };
  }
  if (impliesPassed(t)) {
    return {
      headline: "関連法案の進展",
      text: `${t}。（国会）`,
      figure: "成立",
    };
  }
  if (/据え置き|引下げ|返納/.test(t) && /ボーナス|歳費|報酬/.test(`${t}${kw}`)) {
    return {
      headline: "報酬据え置き等",
      text: `${t}。（国会）`,
      figure: "据え置き",
    };
  }
  const num = t.match(/(\d[\d,\.]*(?:兆|億|万|％|%|円|人|カ月|年|党|議席))/)?.[1];
  if (num) {
    return {
      headline: "数値・規模の公表",
      text: `${t}。（国会）`,
      figure: num.replace(/,/g, ""),
    };
  }
  return null;
}

function demeritGapFromConclusion(nowBullets, kw) {
  const joined = nowBullets.join("");
  if (!/未成立|成立には至っていない|未提出|含まれていない|入っていない/.test(joined)) return null;
  const topic = topicShort(kw);
  if (/スパイ防止/.test(kw)) {
    return {
      headline: "包括法は未成立",
      text: "包括的スパイ防止法は国会で審議が続くも成立せず、機密の範囲と罰則の線引きが法として定まっていない。報道・研究への影響が不透明なまま、との指摘が国会で繰り返される。",
      figure: "法制化の遅れ",
    };
  }
  if (/国旗/.test(kw)) {
    return {
      headline: "法案未収載・射程の争い",
      text: "連立合意で検討とされても政府提出予定法案に含まれない局面があり、刑事罰化は表現の自由とのバランスや適用範囲が国会で争点になっている。",
      figure: "適用範囲",
    };
  }
  if (/ボーナス|歳費|報酬/.test(kw)) {
    return {
      headline: "国民感情との乖離",
      text: "特別職・議員報酬の引上げは国民の反発を招きやすく、自主返納や据え置きを求める修正案が国会で対立軸になっている。",
      figure: "自主返納",
    };
  }
  return {
    headline: "法制化・実施の遅れ",
    text: `国会では${topic}の審議・提出は進む一方、結論として定まっていない点が論点になっている。制度設計の空白が残る、との指摘がある。`,
    figure: "未成立",
  };
}

function demeritFromOpposition(sn, kw) {
  const ex = normalizeFactPhrase(sn.excerpt);
  if (!isOppositionTone(ex, sn.speakerGroup, kw)) return null;
  const who = sn.speakerGroup?.split("・")[0] || sn.speaker || "野党";
  if (/人権|表現|報道|自由/.test(ex)) {
    return {
      headline: "人権・報道の懸念",
      text: `${who}は${topicShort(kw)}に対し、人権侵害や報道・表現の自由への影響を懸念する立場を国会で示している。`,
      figure: "表現の自由",
    };
  }
  return {
    headline: "慎重・反対の論点",
    text: `${who}は${topicShort(kw)}に慎重または反対の立場を国会で表明し、制度設計や運用への懸念を述べている。`,
    figure: "慎重論",
  };
}

/**
 * メリデメ — 全国会記事共通（ライター層）
 * @param {ReturnType<typeof buildFactBundle>} bundle
 * @param {Array<{date:string,text:string}>} arcLines
 * @param {string[]} nowBullets
 * @param {object} meta - speechURL, date
 */
export function synthesizeProsCons(bundle, arcLines, nowBullets, meta = {}) {
  const kw = bundle.keyword;
  const src = {
    sourceUrl: meta.speechURL || "https://seiji1192.site/",
    sourceLabel: meta.speechURL?.includes("kokkai") ? "国会議事録" : "公式出典",
    sourceDate: meta.date || new Date().toISOString().slice(0, 10),
  };
  const merits = [];
  const demerits = [];
  const usedHeadlines = new Set();

  const pushMerit = (m) => {
    if (!m || merits.length >= 2 || usedHeadlines.has(m.headline)) return;
    usedHeadlines.add(m.headline);
    merits.push({ ...m, ...src });
  };
  const pushDemerit = (d) => {
    if (!d || demerits.length >= 2 || usedHeadlines.has(`d:${d.headline}`)) return;
    usedHeadlines.add(`d:${d.headline}`);
    demerits.push({ ...d, ...src });
  };

  for (const line of arcLines) {
    pushMerit(meritCandidateFromText(line.text, kw));
    if (merits.length >= 2) break;
  }
  for (const sn of bundle.snippets) {
    if (merits.length >= 2) break;
    pushMerit(meritCandidateFromText(extractEventText(sn, kw), kw));
  }

  for (const sn of bundle.snippets) {
    pushDemerit(demeritFromOpposition(sn, kw));
    if (demerits.length >= 2) break;
  }
  pushDemerit(demeritGapFromConclusion(nowBullets, kw));
  for (const sn of bundle.snippets) {
    if (demerits.length >= 2) break;
    const ex = normalizeFactPhrase(sn.excerpt);
    if (/批判|問題|懸念|遅れ|不透明|複雑|反発/.test(ex) && !isOppositionTone(ex, sn.speakerGroup, kw)) {
      const clause = ex.split(/。/).find((p) => /批判|問題|懸念|遅れ|不透明|反発/.test(p) && p.length >= 16);
      if (clause && !isSpeechFragment(clause)) {
        pushDemerit({
          headline: "制度・運用への懸念",
          text: `${normalizeFactPhrase(clause).slice(0, 90)}。（国会）`,
          figure: "懸念",
        });
      }
    }
  }

  return {
    disclaimer: PROSCONS_DISCLAIMER,
    merits: merits.slice(0, 2),
    demerits: demerits.slice(0, 2),
    methodologyVersion: "v2-writer",
  };
}

/** 記事JSONのみから再生成（バッチ・全slug向け） */
export function synthesizeProsConsFromArticle(article) {
  const arc = article.arcSummary || [];
  const nowBullets = article.nowSummary?.bullets || [];
  const meta = {
    speechURL: article.primarySpeech?.speechURL,
    date: article.primarySpeech?.date || article.nowSummary?.updatedAt?.slice(0, 10),
  };
  const snippets = (article.summaryBullets || []).map((line) => {
    const m = String(line).match(/^([\d-]+)：([^—]+)—\s*(.+?)（国会議事録）/);
    return m
      ? { date: m[1], speaker: m[2].trim(), excerpt: m[3], speakerGroup: m[2].trim() }
      : null;
  }).filter(Boolean);
  const bundle = {
    keyword: article.searchKeyword || article.title || "",
    snippets,
  };
  return synthesizeProsCons(bundle, arc, nowBullets, meta);
}

export function synthesizePlainExplanation(nowBullets, title, meta = {}) {
  const lead = nowBullets[0]?.replace(/。$/, "") || title;
  const p1 = `結論から言うと、${lead}。${nowBullets[1] ? ` ${nowBullets[1].replace(/。$/, "")}。` : ""}`;
  const p2 =
    "ここでの整理は国会議事録・公表資料に基づく事実の要約です。政府・与党・野党の主張の優劣は断定しません。数字・引用の正本は下の議事録リンクで確認できます。";
  const where =
    meta.speaker && meta.date
      ? `${meta.nameOfHouse || "国会"}（${meta.date}）の発言等をもとに整理しています。`
      : "";
  return [where, p1, p2].filter(Boolean).join("\n\n");
}
