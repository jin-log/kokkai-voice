/**
 * ライター層 — 事実JSONから第三者目線の文案を生成（議事録の切り貼り禁止）
 * 正本の文体: scripts/writer-batch10-data.mjs / docs/writer-editorial.md
 */

import {
  topicTerms,
  textStronglyMatchesTopic,
  isBoilerplateTopicLine,
  ensureTopicInLine,
  ensureTopicInLines,
} from "../../src/lib/topic-relevance.mjs";
import { topicSpeechExcerpt } from "./kokkai-api.mjs";
import {
  summarizeFromExcerpt,
  isBadSummaryLine,
  sanitizeMeritText,
  extractConclusionBullets,
} from "./speech-summary.mjs";
import { isDietVoice, isIncompleteBullet, isSpeechFragment, normalizeFactPhrase, toThirdPersonBullet, isWriterReadyLine, isMatrixActionReady } from "../../src/lib/diet-voice.mjs";
import { scorePartySymbol } from "../../src/lib/symbol-rules.mjs";

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
      speakerPosition: r.speakerPosition,
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
export function composeAllFallback(bundle, meta) {
  const lines = [];
  for (const sn of bundle.snippets.slice(0, 12)) {
    for (const f of composeFromPrimary(sn, { ...meta, speaker: sn.speaker, date: sn.date }, bundle.keyword)) {
      if (f && !lines.includes(f)) lines.push(f);
    }
    const ev = extractEventText(sn, bundle.keyword);
    if (ev && isWriterReadyLine(ev) && !isBoilerplateTopicLine(ev)) {
      const line = ev.endsWith("。") ? ev : `${ev}。`;
      const dated = sn.date && !line.startsWith(sn.date) ? `${sn.date}：${line}` : line;
      if (!lines.includes(dated)) lines.push(dated);
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
  return dedupeLines(lines.filter((l) => !isBoilerplateTopicLine(l)));
}

export function synthesizeNowSummary(bundle, meta = {}) {
  const lines = [];
  const kw = bundle.keyword;
  const primary = bundle.snippets.find((s) => s.speechURL === meta.speechURL) || bundle.snippets[0];
  const fallback = composeAllFallback(bundle, meta);

  if (primary?.excerpt) {
    const summarized = summarizeFromExcerpt(primary.excerpt, kw, { ...primary, ...meta });
    if (summarized) {
      const body = summarized.replace(/^[^—]+—\s*/, "");
      if (!isBadSummaryLine(body)) lines.push(body);
    }
  }

  for (const sn of bundle.snippets.slice(0, 8)) {
    const summarized = summarizeFromExcerpt(sn.excerpt, kw, sn);
    if (summarized) {
      const body = summarized.replace(/^[^—]+—\s*/, "");
      if (!isBadSummaryLine(body)) lines.push(body);
    }
    if (lines.length >= 5) break;
  }

  const picked = pickConclusionTriple(lines, bundle, primary, meta);
  const good = picked.filter(
    (l) =>
      !isBadSummaryLine(l) &&
      !isDietVoice(l) &&
      !isSpeechFragment(l) &&
      !isIncompleteBullet(l),
  );
  const merged = dedupeLines(
    [...fallback, ...good].filter((l) => !isBoilerplateTopicLine(l) && !isBadSummaryLine(l)),
  );
  return ensureTopicInLines(merged, kw).slice(0, 3);
}

function isQuestionBullet(line) {
  return /のでしょうか|でしょうか。|ですか。?$/.test(String(line || ""));
}

const OPENING_TEMPLATE_LINE =
  /国会で議論された|国会で論じられた|をめぐる.*が国会で議論|国会で答弁・質疑を行った|が国会で論じた/;

/**
 * タイトル（簡素化後）に合わせて1行目を整える — 定型「国会で議論された」を先頭から外す
 * @param {string[]} bullets
 * @param {string} title
 * @param {string} keyword
 * @param {{ arcSummary?: { date?: string, text?: string }[] }} [hints]
 */
export function finalizeNowBulletsForTitle(bullets, title, keyword, hints = {}) {
  const TITLE_ASKS_NUMBERS = /いくら|何円|何人|何%|何％|実績|成果|何兆|何万人/;
  const TITLE_ASKS_OUTCOME = /効いた|効果|成立|通った|なぜ|どうなった|行方|最新|とは|争点/;
  const OUTCOME_WORDS =
    /成立|可決|否決|見送り|据え置き|引上げ|未成立|法制化|含まれていない|審議|提出|可決・成立|効果|分かれ/;

  const crafted = craftOpeningFromTitle(title, keyword, hints);
  const pool = dedupeLines(
    (bullets || []).filter(
      (b) =>
        !OPENING_TEMPLATE_LINE.test(b) &&
        !isBoilerplateTopicLine(b) &&
        !isQuestionBullet(b) &&
        !isBadSummaryLine(b),
    ),
  );

  let first = crafted;
  if (!first && TITLE_ASKS_NUMBERS.test(title)) {
    first = pool.find((b) => /[０-９0-9]/.test(b) && /円|%|％|万|兆|人|件/.test(b));
  }
  if (!first && TITLE_ASKS_OUTCOME.test(title)) {
    first = pool.find((b) => OUTCOME_WORDS.test(b));
  }
  if (!first) first = pool[0];

  const rest = pool.filter((b) => b !== first).slice(0, 2);
  const merged = first ? [first, ...rest] : pool;
  const out = ensureTopicInLines(merged.length ? merged : bullets, keyword).slice(0, 3);
  return out.length ? out : bullets.slice(0, 3);
}

/** @param {{ arcSummary?: { date?: string, text?: string }[] }} hints */
function craftOpeningFromTitle(title, keyword, hints = {}) {
  const arc = (hints.arcSummary ?? []).map((a) => a.text || "").join(" ");
  const t = title;
  const kw = keyword;

  if (/ボーナス|期末手当/.test(t) && /いくら|給与法/.test(t)) {
    if (/据え置き|可決/.test(arc)) {
      return "2025年12月、国会議員の期末手当（ボーナス）は現行水準の据え置きとする歳費法改正が国会で成立した。2023年の特別職給与法改正では引上げをめぐり野党が反対した。";
    }
    return "国会議員の期末手当（ボーナス）は歳費法・特別職給与法の改正と連動し、据え置きか引上げかが国会で争点になっている。";
  }

  if (/スパイ防止/.test(t) && /なぜ成立しない|成立しない/.test(t)) {
    return "包括的スパイ防止法は国会で繰り返し審議されるが、2026年時点では成立していない。国家情報会議設置法案は審議に入り、法制化の射程が国会で争点になっている。";
  }

  if (/政治資金|献金/.test(t) && /政党助成|ルール/.test(t)) {
    return "政治資金規正法の改正と政党交付金の在り方が国会で継続審議され、献金の上限・報告義務の厳格化が論点になっている。";
  }

  if (/選挙制度/.test(t)) {
    return "選挙制度の見直し（選挙区・議席配分など）をめぐり、与野党が国会でそれぞれ法案・修正案を提示している。";
  }

  if (/物価高/.test(t) || kw === "物価高対策") {
    return "高市内閣は物価高対策を最優先とし、補正予算でガソリン暫定税率廃止・電気ガス支援等を盛り込み、一世帯当たり年8万円超の支援を実施と国会で表明した。";
  }

  if (/消費税/.test(t) || /食料品/.test(kw)) {
    return "食料品の消費税減税は給付つき税額控除との同時並行議論が国民会議で続き、二年間限定のつなぎ策として検討される方針が国会で示されている。";
  }

  if (/カジノ|IR/.test(t) || kw === "カジノ") {
    return "オンラインカジノ誘導の規制強化が国会で審議され、改正ギャンブル等依存症対策基本法に基づく取締りとアクセス抑止の在り方が論点になっている。";
  }

  if (/年金/.test(t) || kw === "年金") {
    return "年金制度の持続可能性と給付水準をめぐり、国会各委員会で財源・積立金運用・実質給付の議論が続いている。";
  }

  if (/外国人/.test(t) || kw === "外国人") {
    return "外国人の受入れと秩序ある共生をめぐる総合対応策が閣僚会議で決定され、不法就労・不適正事業者対策が国会で審議されている。";
  }

  if (/防衛費|安保/.test(t) || kw === "防衛費") {
    return "防衛力強化に必要な予算と財源の在り方が国会で議論され、財政の持続可能性に配慮しつつ安保三文書の方針に沿った議論が続いている。";
  }

  if (/ボーナス|期末手当/.test(t) || /ボーナス|歳費/.test(kw)) {
    return "国会議員の期末手当（ボーナス）は歳費法改正で支給割合が議論され、特別職給与法改正と連動して据え置きか引上げかが争点になっている。";
  }

  if (/補正予算/.test(t)) {
    return "年度途中の補正予算案は追加歳出の規模と使途（防衛・物価対策・復興など）をめぐり、国会で採決・審議されている。";
  }

  if (/政治とカネ|献金問題/.test(t)) {
    return "政治とカネの問題を受け、献金報告の不備や規正法改正が国会で追及・審議されている。";
  }

  if (/教育法改正|超党派/.test(t) || /学校教育法/.test(kw)) {
    return "学校教育法等の改正案が国会で審議され、学校現場への影響（教育内容・運営）が与野党で論点になっている。";
  }

  if (/副首都/.test(t) && /どこ/.test(t)) {
    return "副首都構想は大阪・関西を候補地とする議論が国会で続き、首都機能の代替拠点の具体案と財源が争点になっている。";
  }

  if (/大阪都構想/.test(t)) {
    return "大阪都構想（特別区設置・名称変更）は2026年の国会で関連法案が審議され、メリット・デメリットをめぐり与野党の立場が分かれている。";
  }

  if (/太陽光パネル/.test(t) && /とは/.test(t)) {
    return "東京都の太陽光パネル設置義務化は、都内の新築・改築を対象とする制度案として国会・都議会で議論の材料になっている。";
  }

  if (/刑事告発/.test(t) || /学歴/.test(t)) {
    return "東京都知事をめぐる学歴問題に関する刑事告発は、告発から一定期間経過し、捜査・結論の有無が国会外の論点として追われている。";
  }

  if (/大学無償化/.test(t)) {
    return "大学無償化（授業料等の負担軽減）は対象者の所得要件と財源確保をめぐり、国会で与野党の法案・修正案が対立している。";
  }

  if (/エネルギー政策/.test(t)) {
    return "エネルギー政策は原発再稼働・再エネ拡大・電気料金のバランスをめぐり、国会でエネルギー基本計画と関連法案が審議されている。";
  }

  if (/政権|内閣人事|首相交代/.test(t)) {
    return "首相交代後の内閣人事と政策の継続・変更が国会で説明され、政権の方針と予算・法案の行方が論点になっている。";
  }

  return "";
}

function pickConclusionTriple(candidates, bundle, primary, meta) {
  const kw = bundle.keyword;
  const out = [];
  const pool = candidates.filter(
    (l) => !isQuestionBullet(l) && !OPENING_TEMPLATE_LINE.test(l) && !isBoilerplateTopicLine(l),
  );

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
  if (/スパイ防止法制|スパイ防止法/.test(ex) && /スパイ防止/.test(kw)) {
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
    if (/据え置き/.test(ex)) {
      lines.push("議員ボーナスを現行水準に据え置く歳費法改正案が国会で可決・成立した。");
    }
    if (/引上げ|引き上げ/.test(ex) && /反対|慎重/.test(ex)) {
      lines.push(`${date ? `${date}：` : ""}特別職・議員報酬の引上げをめぐり、野党が国会で反対・慎重論を表明した。`);
    }
  }
  if (/高市.*内閣|内閣発足|組閣|政権/.test(kw) || /高市内閣|内閣発足|高市総理/.test(ex)) {
    if (/閣議決定|閣議に/.test(ex)) {
      lines.push(
        `${date ? `${date}：` : ""}政府が関連法案を閣議決定した旨が国会で答弁された。`,
      );
    }
    if (/事前説明せず|国会に説明.*ない|国会を無視|合同審査会.*説明/.test(ex)) {
      lines.push(`野党が閣議前の国会説明欠如を追及している${date ? `（${date}）` : ""}。`);
    }
    if (/組閣|内閣発足|新内閣/.test(ex)) {
      lines.push(`高市内閣の発足・人事が国会で論点になっている${date ? `（${date}）` : ""}。`);
    }
    if (/一般会計.*兆|歳出総額|予算.*規模|百.*兆円/.test(ex)) {
      lines.push(`高市内閣下の予算・歳出規模が国会で説明された${date ? `（${date}）` : ""}。`);
    }
    if (/連立政権合意|与党.*合意|政策の実現/.test(ex)) {
      lines.push(`与党合意に基づく政策実施が高市内閣の国会答弁で示された${date ? `（${date}）` : ""}。`);
    }
  }
  return lines;
}

function topicShort(keyword) {
  if (/スパイ防止/.test(keyword)) return "スパイ防止法制";
  if (/ボーナス|歳費/.test(keyword)) return "議員ボーナス";
  if (/国旗/.test(keyword)) return "国旗損壊罪";
  if (/副首都/.test(keyword)) return "副首都構想";
  if (/物価高/.test(keyword)) return "物価高対策";
  if (/高市.*内閣|内閣発足|組閣|政権/.test(keyword)) return "高市内閣";
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
  const fromSpeech = summarizeFromExcerpt(sn.excerpt, keyword, sn);
  if (fromSpeech && !isBadSummaryLine(fromSpeech)) {
    return fromSpeech.replace(/^[^—]+—\s*/, "");
  }

  const ex = normalizeFactPhrase(sn.excerpt);
  const who = sn.speakerGroup?.split("・")[0] || "会派";
  const sp = sn.speaker || who;
  const mt = sn.meeting || sn.house || "国会";
  const topic = topicShort(keyword);

  if (/刑法九十二条|刑法92条/.test(ex) && /総理|大臣|内閣/.test(sn.speakerPosition || "")) {
    const line = `${sp}が刑法第92条改正案の起草・提出経験を国会で説明。`;
    if (isWriterReadyLine(line)) return line;
  }

  if (/過去|経験|起草|御協力の下|提出したことも/.test(ex)) {
    /* 答弁での過去経験 — 提出ルールに掛けない */
  } else if (/参政党|和田政宗/.test(ex) && /提出|発議|改正案/.test(ex)) {
    const line = `参政党が${topic}を含む刑法改正案を提出。`;
    if (isWriterReadyLine(line)) return line;
  } else if (
    /(?:を|に)提出|発議/.test(ex) &&
    !/答弁|お答え|総理|大臣/.test(`${sn.speakerPosition || ""}${ex}`)
  ) {
    const line = `${who}が${topic}関連法案を国会に提出。`;
    if (isWriterReadyLine(line)) return line;
  }

  if (/国旗損壊.*制定|国章損壊.*制定|制定について|お尋ねがあり/.test(ex)) {
    if (/総理|大臣|内閣|官房長官|副大臣|政務官/.test(sn.speakerPosition || "")) {
      if (/両党間で具体|連立政権合意書の内容を踏まえ|連立.*合意書/.test(ex)) {
        const line = `${sp}が連立合意に基づき${topic}の具体策検討を表明。`;
        if (isWriterReadyLine(line)) return line;
      }
      const line = `${sp}が${topic}法制化に向けて国会で政府方針を答弁。`;
      if (isWriterReadyLine(line)) return line;
    } else {
      const line = `${sp}が${topic}の制定を国会で質疑。`;
      if (isWriterReadyLine(line)) return line;
    }
  }

  /** @type {[RegExp, string][]} */
  const rules = [
    [/閣議決定|閣議に上程|閣議で決定/, `${sp}が${topic}関連法案の閣議決定を国会で説明`],
    [/事前説明せず|国会に説明.*ない|国会を無視/, `野党が高市内閣の国会説明不足を追及`],
    [/賃上げ.*実質賃金|実質賃金.*プラス/, `高市内閣は賃上げ・実質賃金のプラス転換を重点目標に据える`],
    [/危機管理投資|成長投資/, `高市内閣は危機管理・成長投資で強い経済実現を掲げる`],
    [/見直し.*歳出|重点化.*一方|効果が乏しい施策/, `高市内閣は歳出の重点化と施策見直しを国会で説明`],
    [/一般会計.*兆|歳出総額.*兆/, `高市内閣下の予算・歳出規模が国会で説明`],
    [/女性.*大臣|女性閣僚|片山大臣/, `高市内閣の閣僚人事（女性大臣起用）が国会で論点に`],
    [/組閣|内閣発足|新内閣/, `高市内閣の発足・人事が国会で論点に`],
    [/連立政権合意|政策の実現に向け/, `与党合意に基づく高市内閣の政策実施が国会で説明`],
    [/スパイ防止.*発議|スパイ防止法.*提出|スパイ防止.*法案.*提出/, `${sp}がスパイ防止法案を国会に提出`],
    [/インテリジェンス.*法案.*提出|インテリジェンス態勢/, `国民民主党がインテリジェンス関連法案を提出`],
    [/国家情報会議設置.*審議|国家情報会議.*法案/, `${mt}で国家情報会議設置法案が審議に入る`],
    [/連立.*合意.*国旗|連立政権合意書.*国旗/, `与党合意書に国旗損壊罪の制定検討が明記`],
    [/なぜ今国会|なぜ.*入っていない|入っていないのでしょうか/, `${sp}が政府に${topic}案の未収載を国会で質問`],
    [/含まれるんでしょうか|政府提出予定法案には入って/, `${sp}が今国会提出予定法案への${topic}収載を質疑`],
    [/提出予定法案.*含まれていない|入っておりません/, `政府が今国会提出予定法案に${topic}を含めないと答弁`],
    [/据え置き.*ボーナス|ボーナス.*据え置|歳費.*据え置/, `議員ボーナス据え置きの歳費法改正が国会で可決・提出`],
    [/特別職.*給与.*反対|議員.*報酬.*反対|引上げに反対/, `${sp}が特別職・議員報酬の引上げに反対を表明`],
    [/人権|表現の自由.*懸念|報道.*懸念/, `${sp}が人権・表現の自由への懸念を国会で表明`],
    [/スパイ防止.*前向き|包括的.*法整備/, `${sp}がスパイ防止法制化への前向き姿勢を表明`],
    [/刑法九十二条|刑法92条/, `${sp}が刑法第92条改正案の起草・提出経験を国会で説明`],
  ];

  for (const [re, text] of rules) {
    if (re.source.includes("可決") && !impliesPassed(ex)) continue;
    if (re.source.includes("提出") && /経験|過去に|起草.*提出した/.test(ex)) continue;
    if (re.test(ex)) {
      const line = text.endsWith("。") ? text : `${text}。`;
      if (isWriterReadyLine(line)) return line;
    }
  }

  for (const f of composeFromPrimary(sn, { date: sn.date, speaker: sp }, keyword)) {
    if (isWriterReadyLine(f)) return f.endsWith("。") ? f : `${f}。`;
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
  const header = `${sn.date}：${who}— `;
  const footer = "（国会議事録）。";
  const maxEvent = 88 - header.length - footer.length;
  const eventTrimmed = maxEvent > 0 ? event.slice(0, maxEvent) : event;
  const result = `${header}${eventTrimmed}${footer}`;
  if (isSpeechFragment(result)) return "";
  return result;
}

function policyFromEvent(ev, who, topic) {
  if (/未収載|収載を質疑|含めない/.test(ev)) {
    return `${who}は${topic}の政府提出予定法案未収載を質疑する立場`;
  }
  if (/答弁|法制化に向け|検討を進め|合意書/.test(ev)) {
    return `${who}は${topic}の法制化を推進する立場`;
  }
  if (/提出/.test(ev)) {
    return `${who}は${topic}を含む法案提出で国会に働きかける立場`;
  }
  if (/質疑/.test(ev)) {
    return `${who}は${topic}の制定・運用を国会で質疑する立場`;
  }
  return ev;
}

function synthesizePolicySummary(sn, keyword) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const who = sn.speakerGroup?.split("・")[0] || sn.speaker || "会派";
  const topic = topicShort(keyword);
  let line;
  if (isOppositionTone(ex, sn.speakerGroup, keyword)) {
    line = `${who}は${topic}に対し、人権・表現の自由等を理由に慎重または反対の立場。`;
  } else if (/推進|制定|整備|賛成|前向き|審議を進め|連立.*合意|検討を進め/.test(ex)) {
    line = `${who}は${topic}の法制化・関連法案の審議を推進する立場。`;
  } else {
    const ev = extractEventText(sn, keyword).replace(/。$/, "");
    if (ev && isWriterReadyLine(ev)) {
      const partyLine = policyFromEvent(ev, who, topic);
      if (isWriterReadyLine(partyLine)) {
        line = partyLine.endsWith("。") ? partyLine : `${partyLine}。`;
      }
    }
    if (!line) line = `${who}は${topic}に関する方針を国会で表明。`;
  }
  return ensureTopicInLine(line, keyword) ?? line;
}

function isMatrixActionLine(text) {
  return isMatrixActionReady(text);
}

function synthesizeActionSummary(sn, keyword) {
  const ex = normalizeFactPhrase(sn.excerpt);
  const mt = sn.meeting || sn.house || "国会";
  const sp = sn.speaker || sn.speakerGroup?.split("・")[0] || "議員";
  const topic = topicShort(keyword);
  if (isOppositionTone(ex, sn.speakerGroup, keyword)) {
    const point = extractEventText(sn, keyword).replace(/。$/, "").slice(0, 40);
    const about = point && !/可決・成立/.test(point) ? point : `${topic}への懸念`;
    return `${sn.date}、${mt}で${sp}が${about}を表明・質疑`;
  }
  if (/(?:を|に)提出|発議/.test(ex) && !/経験|過去に|起草.*提出した/.test(ex)) {
    return `${sn.date}、${mt}で${sp}が${topic}関連法案を提出`;
  }
  if (/経験|起草.*提出|刑法九十二条|刑法92条/.test(ex)) {
    return `${sn.date}、${mt}で${sp}が過去の法案起草・提出経験を国会答弁で説明`;
  }
  if (impliesPassed(ex)) {
    return `${sn.date}、${mt}で関連法案が可決・成立`;
  }
  if (/含まれていない|入っておりません|未収載/.test(ex)) {
    if (/総理|大臣|内閣|官房長官|副大臣|政務官/.test(sn.speakerPosition || "")) {
      return `${sn.date}、${mt}で${sp}が${topic}法制化に向けて政府方針を答弁`;
    }
    return `${sn.date}、${mt}で${sp}が政府提出予定法案への${topic}未収載を質疑`;
  }
  if (/質疑|答弁|質問|お尋ね|審議/.test(ex)) {
    if (/国家情報会議|スパイ防止/.test(ex)) {
      return `${sn.date}、${mt}で${sp}がスパイ防止法制・国家情報会議法案の審議で具体論点を答弁`;
    }
    const ev = extractEventText(sn, keyword).replace(/。$/, "");
    if (ev) return `${sn.date}、${mt}で${ev}`;
  }
  const ev = extractEventText(sn, keyword).replace(/。$/, "");
  if (ev) return `${sn.date}、${mt}で${ev}`;
  return ensureTopicInLine(`${sn.date}、${mt}で${sp}が${topic}に関する論点を表明`, keyword);
}

function snippetTopicScore(sn, keyword) {
  let score = textStronglyMatchesTopic(sn.excerpt, keyword) ? 20 : 0;
  const ev = extractEventText(sn, keyword);
  if (ev && textStronglyMatchesTopic(ev, keyword)) score += 15;
  if (/国旗|国章/.test(keyword) && /国旗|国章|刑法92|九十二/.test(sn.excerpt)) score += 20;
  return score;
}

/** 公言と行動（〇×）2党分 — 推進派と慎重派を優先して選定 */
export function synthesizePartyMatrix(bundle) {
  const candidates = [];
  for (const sn of bundle.snippets) {
    if (snippetTopicScore(sn, bundle.keyword) < 15) continue;
    const g = sn.speakerGroup?.split("・")[0]?.trim();
    if (!g) continue;
    const policy = synthesizePolicySummary(sn, bundle.keyword);
    const action = synthesizeActionSummary(sn, bundle.keyword);
    if (!isWriterReadyLine(policy) || !isMatrixActionLine(action)) continue;
    candidates.push({
      sn,
      g,
      policy,
      action,
      oppose: /反対|慎重|懸念/.test(policy),
      aKey: textKey(action),
      score: snippetTopicScore(sn, bundle.keyword),
    });
  }
  candidates.sort((a, b) => b.score - a.score);

  const picked = [];
  const usedGroups = new Set();
  const usedAction = new Set();

  const addOne = (c) => {
    const label = c.g.slice(0, 20);
    if (usedGroups.has(label)) return false;
    if (usedAction.has(c.aKey) && picked.length >= 1) return false;
    usedGroups.add(label);
    usedAction.add(c.aKey);
    const partyDraft = {
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
    };
    const scored = scorePartySymbol(partyDraft);
    picked.push({
      ...partyDraft,
      symbol: scored.symbol,
      symbolReason: scored.symbolReason,
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
      if (isSpeechFragment(line)) continue;
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

  const pushLine = (date, text) => {
    if (!text || !isWriterReadyLine(text)) return false;
    if (!textStronglyMatchesTopic(text, kw)) return false;
    let line = text.endsWith("。") ? text : `${text}。`;
    let key = textKey(line);
    if (usedTexts.has(key)) return false;
    seenDates.add(date);
    usedTexts.add(key);
    lines.push({ date, text: line });
    return true;
  };

  for (const sn of bundle.snippets) {
    if (seenDates.has(sn.date)) continue;
    const candidates = [
      extractEventText(sn, kw),
      ...composeFromPrimary(sn, { date: sn.date, speaker: sn.speaker }, kw),
    ].filter(Boolean);
    for (const c of candidates) {
      if (pushLine(sn.date, c)) break;
    }
    if (lines.length >= 6) break;
  }

  if (lines.length < 3) {
    for (const sn of bundle.snippets) {
      if (seenDates.has(sn.date)) continue;
      for (const f of composeFromPrimary(sn, { date: sn.date, speaker: sn.speaker }, kw)) {
        if (pushLine(sn.date, f)) break;
      }
      if (lines.length >= 6) break;
    }
  }

  return lines
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((line) => ({
      ...line,
      text: ensureTopicInLine(line.text, kw) ?? line.text,
    }))
    .filter((line) => line.text && !isBoilerplateTopicLine(line.text));
}

/** タイムライン国会行の要約（抜粋禁止） */
export function synthesizeTimelinePlain(sn, keyword) {
  const fromSpeech = summarizeFromExcerpt(sn.excerpt, keyword, sn);
  if (fromSpeech && !isBadSummaryLine(fromSpeech)) return fromSpeech;

  const text = extractEventText(sn, keyword);
  if (text && isWriterReadyLine(text) && !isBoilerplateTopicLine(text) && !isBadSummaryLine(text)) {
    const line = text.endsWith("。") ? text : `${text}。`;
    const speaker = sn.speaker || "国会";
    const grp = sn.speakerGroup ? `（${sn.speakerGroup}）` : "";
    const prefixed = line.startsWith(speaker) ? line : `${speaker}${grp}— ${line}`;
    return ensureTopicInLine(prefixed, keyword) ?? prefixed;
  }
  for (const f of composeFromPrimary(sn, { date: sn.date, speaker: sn.speaker }, keyword)) {
    if (isWriterReadyLine(f) && !isBoilerplateTopicLine(f) && !isBadSummaryLine(f)) {
      const line = f.endsWith("。") ? f : `${f}。`;
      const speaker = sn.speaker || "国会";
      const grp = sn.speakerGroup ? `（${sn.speakerGroup}）` : "";
      const prefixed = `${speaker}${grp}— ${line}`;
      return ensureTopicInLine(prefixed, keyword) ?? prefixed;
    }
  }
  return "";
}

const PROSCONS_DISCLAIMER =
  "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。";
const BAD_MERIT_TEXT = /言及件数|API検索|ヒットする|件超の発言|検索すると|国会での言及|のでしょうか|んでしょうか|含まれるんでしょうか|^[\d-]+：/;
const BAD_MERIT_FIGURE = /^\d{4}$|^\d{4}年$|^\d{1,3}$/;

/** 品質監査 Q4 と同期 — 年号のみの figure */
export function isWeakProsConsFigure(fig) {
  const s = String(fig || "").trim();
  if (!s) return true;
  return BAD_MERIT_FIGURE.test(s);
}

function figureFromText(text, fallback) {
  const t = String(text || "");
  const nums = t.match(
    /(\d[\d,\.]*(?:兆|億|万|％|%|円|人|件|カ月|倍|ポイント|世帯|議席))/g,
  );
  if (nums) {
    for (const raw of nums) {
      const n = raw.replace(/,/g, "");
      if (!isWeakProsConsFigure(n)) return n;
    }
  }
  if (/据え置き|返納/.test(t)) return "据え置き";
  if (/可決|成立/.test(t)) return "成立";
  if (/懸念|批判|問題|遅れ|不透明/.test(t)) return "懸念";
  if (/答弁|質疑|提出|審議/.test(t)) return "国会答弁";
  return fallback;
}

function sanitizeProsConsItem(item, role) {
  if (!item || !isWeakProsConsFigure(item.figure)) return item;
  const fallback = role === "merit" ? "国会答弁" : "懸念";
  return { ...item, figure: figureFromText(item.text, fallback) };
}

/** @param {{ merits?: object[], demerits?: object[], disclaimer?: string, methodologyVersion?: string }} pc */
export function sanitizeProsCons(pc) {
  return {
    ...pc,
    merits: (pc.merits ?? []).map((m) => sanitizeProsConsItem(m, "merit")),
    demerits: (pc.demerits ?? []).map((d) => sanitizeProsConsItem(d, "demerit")),
  };
}

function meritCandidateFromText(text, kw) {
  const t = String(text || "").replace(/。$/, "");
  if (!t || BAD_MERIT_TEXT.test(t) || isSpeechFragment(t) || isDietVoice(t) || isBadSummaryLine(t)) {
    return null;
  }
  const clean = sanitizeMeritText(t);
  if (!clean) return null;
  const body = clean.replace(/。$/, "");
  if (/前向き|推進|法制化|連立.*合意|整備を進め|答弁|合意書|具体策/.test(t)) {
    return {
      headline: "法制化へ前進",
      text: clean,
      figure: "国会答弁",
    };
  }
  if (/質疑|提出|収載/.test(t)) {
    return {
      headline: "国会で論点具体化",
      text: clean,
      figure: "国会質疑",
    };
  }
  if (/提出|発議/.test(t)) {
    return {
      headline: "法案・修正案提出",
      text: clean,
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
  const num = t.match(/(\d[\d,\.]*(?:兆|億|万|％|%|円|人|件|カ月|倍|ポイント|世帯|議席))/)?.[1];
  if (num) {
    const figure = num.replace(/,/g, "");
    if (!isWeakProsConsFigure(figure)) {
      return {
        headline: "数値・規模の公表",
        text: `${t}。（国会）`,
        figure,
      };
    }
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
    if (!m.figure || BAD_MERIT_FIGURE.test(String(m.figure))) return;
    if (BAD_MERIT_TEXT.test(m.text || "")) return;
    usedHeadlines.add(m.headline);
    merits.push({ ...m, ...src });
  };
  const pushDemerit = (d) => {
    if (!d || demerits.length >= 2 || usedHeadlines.has(`d:${d.headline}`)) return;
    if (!d.figure || isWeakProsConsFigure(d.figure)) {
      d = { ...d, figure: figureFromText(d.text, "懸念") };
    }
    usedHeadlines.add(`d:${d.headline}`);
    demerits.push({ ...d, ...src });
  };

  for (const line of nowBullets) {
    pushMerit(meritCandidateFromText(line, kw));
    if (merits.length >= 2) break;
  }
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
  if (demerits.length < 2 && /国旗/.test(kw)) {
    pushDemerit({
      headline: "表現の自由への懸念",
      text: "国旗損壊罪の罰則化は表現の自由や罪刑法定主義とのバランスが国会で争点となり、適用範囲への懸念が繰り返し述べられている。",
      figure: "表現の自由",
    });
  }
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

  if (demerits.length < 2) {
    pushDemerit({
      headline: "制度・運用への懸念",
      text: `国会では${topicShort(kw)}の制度設計や運用に慎重論・懸念が述べられている。`,
      figure: "懸念",
    });
  }
  if (demerits.length < 2) {
    pushDemerit({
      headline: "財源・実施の論点",
      text: `${topicShort(kw)}の財源確保や実施時期をめぐり、国会で与野党の論点が対立している。`,
      figure: "財源論",
    });
  }

  if (merits.length < 2) {
    for (const line of arcLines) {
      pushMerit(meritCandidateFromText(line.text, kw));
      if (merits.length >= 2) break;
    }
  }
  if (merits.length < 2) {
    const topic = topicShort(kw);
    pushMerit({
      headline: `${topic}の国会論点`,
      text: `${topic}をめぐる法案・予算・答弁が国会で継続している。`,
      figure: "国会答弁",
    });
  }

  return sanitizeProsCons({
    disclaimer: PROSCONS_DISCLAIMER,
    merits: merits.slice(0, 2),
    demerits: demerits.slice(0, 2),
    methodologyVersion: "v2-writer",
  });
}

/** 記事JSONのみから再生成（バッチ・全slug向け） */
export function synthesizeProsConsFromArticle(article) {
  const arc = article.arcSummary || [];
  const nowBullets = article.nowSummary?.bullets || [];
  const meta = {
    speechURL: article.primarySpeech?.speechURL,
    date: article.primarySpeech?.date || article.nowSummary?.updatedAt?.slice(0, 10),
  };
  const snippets = [
    ...arc.map((a) => ({
      date: a.date,
      speaker: article.primarySpeech?.speaker || "",
      speakerGroup: article.primarySpeech?.speakerGroup || "",
      excerpt: a.text,
    })),
    ...(article.primarySpeech?.excerpt
      ? [
          {
            date: article.primarySpeech.date,
            speaker: article.primarySpeech.speaker,
            speakerGroup: article.primarySpeech.speakerGroup,
            speakerPosition: article.primarySpeech.speakerPosition,
            excerpt: article.primarySpeech.excerpt,
          },
        ]
      : []),
  ];
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
