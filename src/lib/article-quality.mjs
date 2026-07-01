/**
 * 記事の意味・実績品質監査（形式ゲート page-ready とは別）
 * オーナー目視なしで「中身がクソ」を検出する正本
 */
import { isSpeechFragment } from "./diet-voice.mjs";
import { isXUnavailable } from "./x-research-policy.mjs";

const NUMERIC =
  /[０-９0-9]+[万千億百]|[０-９0-9]+[%％]|約?[０-９0-9,．.]+円|第[０-９0-9]+条/;
const TITLE_ASKS_NUMBERS = /いくら|何円|何人|何%|何％|実績|成果|いつまで|何兆/;
const TEMPLATE_DISCUSSED = /国会で議論された|国会で論じられた|をめぐる.*が国会で/;
const PROCEDURAL =
  /起立を願います|議題とした後|委員長が報告|討論が行われます|採決いたしまして|御異議ありませんか/;
const YEAR_ONLY = /^\d{4}$/;

/** @typedef {{ id: string, severity: 'blocker'|'warn', field: string, message: string, todo: string }} QualityIssue */

/**
 * @param {unknown} article
 * @returns {{ ok: boolean, blockers: QualityIssue[], warnings: QualityIssue[], issues: QualityIssue[] }}
 */
export function auditArticleQuality(article) {
  /** @type {QualityIssue[]} */
  const issues = [];
  const title = String(article.title || "");
  const bullets = article.nowSummary?.bullets ?? [];
  const plain = String(article.plainExplanation || "");
  const arc = article.arcSummary ?? [];
  const sb = (article.summaryBullets ?? []).map((b) =>
    typeof b === "string" ? b : b?.text || "",
  );

  const titleAsksNum = TITLE_ASKS_NUMBERS.test(title);
  const bulletsHaveNum = bullets.some((b) => NUMERIC.test(String(b)));
  if (titleAsksNum && bullets.length >= 1 && !bulletsHaveNum) {
    issues.push({
      id: "Q1_conclusion_numbers",
      severity: "blocker",
      field: "nowSummary",
      message: "タイトルが金額・実績を問うのに、いまの結論に公表数値がない",
      todo: "1行目に円・%・万人などタイトルへの直接回答を入れる（X・報道の数字を要約に反映）",
    });
  }

  const discussed = bullets.filter((b) => TEMPLATE_DISCUSSED.test(String(b)));
  if (discussed.length >= 2) {
    issues.push({
      id: "Q2_template_conclusion",
      severity: "blocker",
      field: "nowSummary",
      message: `いまの結論が「国会で議論された」型の繰り返し（${discussed.length}行）`,
      todo: "可決・支給額・据え置き等、読者が知りたい状態を各行で変える",
    });
  }

  if (titleAsksNum && plain.length > 40 && !NUMERIC.test(plain.split("\n\n").slice(0, 2).join(""))) {
    issues.push({
      id: "Q3_plain_no_answer",
      severity: "blocker",
      field: "plainExplanation",
      message: "つまり欄の冒頭がタイトルの疑問（金額・実績）に答えていない",
      todo: "1段落目を「結論：〇〇万円（日付）」から始める",
    });
  }

  const pcItems = [...(article.prosCons?.merits ?? []), ...(article.prosCons?.demerits ?? [])];
  const weakFigures = pcItems.filter((m) => m?.figure && YEAR_ONLY.test(String(m.figure).trim()));
  if (weakFigures.length >= 2) {
    issues.push({
      id: "Q4_proscons_year_only",
      severity: "blocker",
      field: "prosCons",
      message: `メリデメの figure が年号のみ（${weakFigures.length}件）— 実績数値になっていない`,
      todo: "万円・%・件数など公表数値を figure に入れる（年号だけは不可）",
    });
  }

  const speechDate = article.primarySpeech?.date;
  const latestDates = [
    ...arc.map((a) => a?.date).filter(Boolean),
    ...(article.timeline ?? []).map((e) => e?.date).filter(Boolean),
  ].sort();
  const latest = latestDates.at(-1);
  if (speechDate && latest && speechDate < latest.slice(0, 4) + "-01-01") {
    const gapYears = Number(latest.slice(0, 4)) - Number(speechDate.slice(0, 4));
    if (gapYears >= 2) {
      issues.push({
        id: "Q5_stale_primary_speech",
        severity: "warn",
        field: "primarySpeech",
        message: `一次抜粋が古い（${speechDate}）— 経緯・TLは ${latest} まで更新済み`,
        todo: "complete-article で再取得し、期末手当・歳費法の最新発言を primary に",
      });
    }
  }

  const procArc = arc.filter((a) => a?.text && PROCEDURAL.test(String(a.text)));
  if (procArc.length >= 1) {
    issues.push({
      id: "Q6_procedural_arc",
      severity: "blocker",
      field: "arcSummary",
      message: "経緯に採決手続き・委員長報告など中身のない行が混ざっている",
      todo: "可決内容・支給額・法案名など事実行に差し替え",
    });
  }

  const procSb = sb.filter((t) => PROCEDURAL.test(t) || isSpeechFragment(t));
  if (procSb.length >= 2) {
    issues.push({
      id: "Q7_procedural_evidence",
      severity: "blocker",
      field: "summaryBullets",
      message: "要点が議事手続き・発言断片の羅列",
      todo: "論点・数値・可決結果が分かる第三者要約に差し替え",
    });
  }

  const xTexts = (article.xPosts ?? [])
    .map((p) => p?.post_text)
    .filter(Boolean);
  const xHasNum = xTexts.some((t) => NUMERIC.test(String(t)));
  if (titleAsksNum && xHasNum && !bulletsHaveNum) {
    issues.push({
      id: "Q8_x_numbers_not_in_summary",
      severity: "blocker",
      field: "nowSummary",
      message: "X枠に金額等の数字があるのに、いまの結論に反映されていない",
      todo: "Xの公表数値（例: 319万円）を結論1行目へ",
    });
  }

  const xVerified = (article.xPosts ?? []).filter(
    (p) => p.post_url && p.post_text && p.status === "url_found",
  );
  const xMin = article.xPostsMinRequired ?? 3;
  const xShots = xVerified.filter((p) => p.screenshot && p.captured_at);
  if (!isXUnavailable(article) && xVerified.length >= xMin && xShots.length < xMin) {
    issues.push({
      id: "Q9_x_screenshot",
      severity: "warn",
      field: "xPosts",
      message: `スクショ ${xShots.length}/${xMin} 件 — 後追い予定`,
      todo: "npm run x:capture -- --slug <slug>（巡回が自動実行）",
    });
  }

  const blockers = issues.filter((i) => i.severity === "blocker");
  const warnings = issues.filter((i) => i.severity === "warn");
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    issues,
  };
}

/** 本番公開・プレビュー完成の総合判定 */
export function isArticleFullyReady(article, gate) {
  return Boolean(gate?.ok) && auditArticleQuality(article).ok;
}

/** @param {unknown[]} articles */
export function auditAllArticles(articles) {
  return articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    pageReady: article.pageReady ?? false,
    publishReady: article.publishReady ?? false,
    ...auditArticleQuality(article),
  }));
}
