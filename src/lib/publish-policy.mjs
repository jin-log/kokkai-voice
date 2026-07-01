/**
 * 一般公開の最終条件（オーナー方針 A）
 * ①〜④は巡回用。/case/ に出すかは「1行目がタイトルに答えているか」だけ。
 */
import {
  isBoilerplateTopicLine,
  textMatchesTopic,
  topicTerms,
} from "./topic-relevance.mjs";

const NUMERIC =
  /[０-９0-9]+[万千億百]|[０-９0-9]+[%％]|約?[０-９0-9,．.]+円|第[０-９0-9]+条/;
const TITLE_ASKS_NUMBERS = /いくら|何円|何人|何%|何％|実績|成果|いつまで|何兆|何万人/;
const TITLE_ASKS_OUTCOME =
  /効いた|効果|成立|通った|決まった|どうなった|行方|最新|いま|進んで|見込み|見通し/;
const OPENING_TEMPLATE =
  /国会で議論された|国会で論じられた|をめぐる.*が国会で|国会で答弁・質疑を行った|が国会で論じた/;
const OUTCOME_WORDS =
  /成立|可決|否決|見送り|協議|合意|施行|開始|終了|据え置き|引き上げ|引き下げ|増額|削減|法制化|導入|拡大|縮小|凍結|見直し|結論|決定|発表|答申/;

/**
 * @param {unknown} article
 * @returns {{ ok: boolean, id: string, detail: string, todo: string }}
 */
export function assessTitleOpeningAnswer(article) {
  const title = String(article.title || "");
  const first = String(article.nowSummary?.bullets?.[0] || "").trim();
  const keyword = article.searchKeyword || "";

  if (!first || first.length < 12) {
    return {
      ok: false,
      id: "P1_opening_missing",
      detail: "いまの結論1行目が空または短すぎる",
      todo: "タイトルの疑問に答える1行を先頭に書く",
    };
  }

  if (isBoilerplateTopicLine(first) || OPENING_TEMPLATE.test(first)) {
    return {
      ok: false,
      id: "P1_opening_template",
      detail: "1行目が「国会で議論された」等の定型だけ",
      todo: "可決・金額・合意内容など、読者が知りたい答えを1行目に書く",
    };
  }

  if (keyword && !textMatchesTopic(first, topicTerms(keyword))) {
    return {
      ok: false,
      id: "P1_opening_off_topic",
      detail: `1行目が案件キーワード（${keyword}）と一致しない`,
      todo: "1行目に案件のキーワードと具体答えを入れる",
    };
  }

  if (TITLE_ASKS_NUMBERS.test(title) && !NUMERIC.test(first)) {
    return {
      ok: false,
      id: "P1_opening_no_number",
      detail: "タイトルが金額・人数等を問うのに1行目に数値がない",
      todo: "円・%・万人など公表数値を1行目に入れる",
    };
  }

  if (
    TITLE_ASKS_OUTCOME.test(title) &&
    !NUMERIC.test(first) &&
    !OUTCOME_WORDS.test(first)
  ) {
    return {
      ok: false,
      id: "P1_opening_no_outcome",
      detail: "「効果・行方」系タイトルなのに1行目に結果の記述がない",
      todo: "成立/見送り/予算額など、いまどうなっているかを1行目に書く",
    };
  }

  return {
    ok: true,
    id: "P1_opening_ok",
    detail: "1行目がタイトルに回答している",
    todo: "",
  };
}

/** @param {unknown} article */
export function isTitleAnsweredInOpeningLine(article) {
  return assessTitleOpeningAnswer(article).ok;
}
