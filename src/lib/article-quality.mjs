/**
 * 記事の意味・実績品質監査（形式ゲート page-ready とは別）
 * オーナー目視なしで「中身がクソ」を検出する正本
 * AdSense有用性（誤マッチ・placeholder・切り出し・動向タイトル）も含む
 */
import { isDietVoice, isSpeechFragment } from "./diet-voice.mjs";
import { isEmptySpeechSummary } from "./timeline-sanitize.mjs";
import { textMatchesTopic, topicTerms } from "./topic-relevance.mjs";
import { isXUnavailable } from "./x-research-policy.mjs";
import { findHubForArticle } from "./content-hubs.mjs";

const NUMERIC =
  /[０-９0-9]+[万千億百]|[０-９0-9]+[%％]|約?[０-９0-9,．.]+円|第[０-９0-9]+条/;
const TITLE_ASKS_NUMBERS = /いくら|何円|何人|何%|何％|実績|成果|いつまで|何兆/;
const TEMPLATE_DISCUSSED = /国会で議論された|国会で論じられた|をめぐる.*が国会で/;
const PROCEDURAL =
  /起立を願います|議題とした後|委員長が報告|討論が行われます|採決いたしまして|御異議ありませんか/;
const YEAR_ONLY = /^\d{4}$/;
const TITLE_DOURYOU = /の動向\s*$|の動向\s*—|動向のみ/;
const EMPTY_CONCLUSION =
  /審議されている|対立している|論点になっている|争点になっている|検討される方針/;
const RAW_NOW_START = /^(○|さて、本日|先生御指摘|の件）|お尋ねの行為が)/;
/** 結論1行目が議事録口語断片か（地の文の長文要約は対象外。length判定は使わない） */
const RAW_NOW_COLLOQUIAL =
  /とか、|とか副|まあ[、]|じゃないですか|じゃないです|けれども、そっち|言うて|っていうか|んですか[。？]?$|ということでもあるし|を計上して。?$|どのように整理|のでしょうか|でしょうか。|んでしょうか/;
const RAW_NOW_SPEECH_HEAD =
  /^(る|ないん|○|私の|私は|ないん|参考人|は賛成|会派を代表|じゃ、|いうか|――――|本日の会議|〔本号|なぜか|まず確認|バックファイア|今、今日|先ほど)/;
const BOILER_NOW =
  /について国会で答弁・質疑を行った|が国会で答弁・質疑を行った|国会で答弁・質疑が継続|が国会で答弁・質疑した/;
const STATS_PLACEHOLDER = /指標\s*[0-9０-９]|指標[一二三四五六七八九十]/;
const TOP_SOURCE_HOSTS = new Set([
  "kokkai.ndl.go.jp",
  "www.kokkai.ndl.go.jp",
  "mofa.go.jp",
  "www.mofa.go.jp",
  "meti.go.jp",
  "www.meti.go.jp",
  "cao.go.jp",
  "www.cao.go.jp",
  "mhlw.go.jp",
  "www.mhlw.go.jp",
]);

function isRawNowSummaryLine(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (/^(答え：|結論：)/.test(s)) return false;
  if (RAW_NOW_START.test(s)) return true;
  if (BOILER_NOW.test(s)) return true;
  if (isDietVoice(s)) return true;
  if (RAW_NOW_SPEECH_HEAD.test(s) || RAW_NOW_COLLOQUIAL.test(s)) return true;
  if (/させていただ|望みまして|認識をしている|質疑とさせ/.test(s)) return true;
  return false;
}

function pcCore(item) {
  const t = typeof item === "string" ? item : String(item?.text || item?.headline || "");
  return t.replace(/\s+/g, "").slice(0, 40);
}

function isTopLevelSourceUrl(u) {
  try {
    const url = new URL(String(u || ""));
    if (!TOP_SOURCE_HOSTS.has(url.hostname)) return false;
    return url.pathname === "/" || url.pathname === "";
  } catch {
    return false;
  }
}

/** glossary の「公選法」が案件と無関係か */
function isOfftopicKosenho(article, term) {
  if (term !== "公選法") return false;
  const blob = [
    article.searchKeyword,
    article.title,
    ...(article.tags || []),
    ...(article.nowSummary?.bullets || []),
  ].join(" ");
  return !/公選法|選挙|告発|虚偽|学歴|定数|投票/.test(blob);
}

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
    typeof b === "string"
      ? b
      : [b?.key || b?.headline, b?.detail || b?.text].filter(Boolean).join("："),
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
  const hasStatsBlock = (article.statsSeries?.chart?.points?.length ?? 0) >= 2;
  if (!hasStatsBlock && weakFigures.length >= 2 && !article.meritsDemerits) {
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

  // 長文の第三者要約は OK。isSpeechFragment の「88字超＝断片」は国会切り出し用で、要点には使わない
  const procSb = sb.filter((t) => {
    const s = String(t || "").trim();
    if (PROCEDURAL.test(s)) return true;
    if (s.length > 88) return false;
    return isSpeechFragment(s);
  });
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

  // ── AdSense / 有用性（2026-07-31）──
  if (!article.adminHidden && TITLE_DOURYOU.test(title)) {
    issues.push({
      id: "Q10_title_douryou",
      severity: "blocker",
      field: "title",
      message: "タイトルが「〜の動向」型（量産感）",
      todo: "具体的な問いかけ・数字・到達点を含むタイトルに差し替え",
    });
  }

  const tlPlaceholders = (article.timeline ?? []).filter((e) =>
    isEmptySpeechSummary(e?.summaryPlain),
  );
  if (!article.adminHidden && tlPlaceholders.length > 0) {
    issues.push({
      id: "Q11_placeholder_tl",
      severity: "blocker",
      field: "timeline",
      message: `タイムラインにプレースホルダー／要約失敗が ${tlPlaceholders.length} 件`,
      todo: "「本件に関する政府方針を説明」等の行を削除するか中身のある要約に差し替え",
    });
  }

  const now1 = String(bullets[0] || "");
  if (!article.adminHidden && now1 && isRawNowSummaryLine(now1)) {
    issues.push({
      id: "Q12_raw_nowSummary",
      severity: "blocker",
      field: "nowSummary",
      message: "いまの結論が議事録切り出しのまま",
      todo: "地の文の要約（答え：／結論：）に書き直し、引用は根拠・TLへ",
    });
  }

  if (
    !article.adminHidden &&
    now1 &&
    !/答え：|結論：/.test(now1) &&
    EMPTY_CONCLUSION.test(now1)
  ) {
    issues.push({
      id: "Q13_empty_conclusion",
      severity: "blocker",
      field: "nowSummary",
      message: "いまの結論が「審議・対立・争点」止まりで到達点がない",
      todo: "成立／未了／数字／方針指示など、読者が持ち帰れる答えを1行目に",
    });
  }

  const kw = String(article.searchKeyword || "");
  const terms = topicTerms(kw);
  if (!article.adminHidden && terms.length >= 1 && bullets.length >= 2) {
    const off = bullets.filter((b) => !textMatchesTopic(String(b || ""), terms));
    if (off.length >= 2) {
      issues.push({
        id: "Q14_offtopic_conclusion",
        severity: "blocker",
        field: "nowSummary",
        message: `いまの結論 ${off.length} 行が searchKeyword と話題不一致`,
        todo: "案件キーワードに一致する事実だけを残す（誤マッチ発言を削除）",
      });
    }
  }

  const arcCut = (article.arcSummary ?? []).filter((row) => {
    const t = String(row?.text || "");
    return Boolean(t && (RAW_NOW_START.test(t) || /の件）|さて、本日|先生御指摘/.test(t)));
  });
  if (!article.adminHidden && arcCut.length >= 1) {
    issues.push({
      id: "Q15_offtopic_arc",
      severity: "blocker",
      field: "arcSummary",
      message: `経緯に議事録切り出し行が ${arcCut.length} 件`,
      todo: "案件に直結する日付行だけ残す",
    });
  }

  // ── 指示書 1-4〜1-9 追加（2026-07-31）──
  const gloss = article.glossary ?? article.nowSummary?.glossary ?? [];
  const offGloss = gloss.filter((g) => isOfftopicKosenho(article, String(g?.term || "")));
  if (!article.adminHidden && offGloss.length >= 1) {
    issues.push({
      id: "Q16_glossary_offtopic",
      severity: "blocker",
      field: "glossary",
      message: "用語集に案件無関係の「公選法」等が入っている",
      todo: "案件語に差し替え。公選法は選挙・告発案件のみ",
    });
  }

  const merits = article.prosCons?.merits ?? [];
  const demerits = article.prosCons?.demerits ?? [];
  let dupPc = 0;
  for (const m of merits) {
    const mk = pcCore(m);
    if (mk.length < 18) continue;
    for (const d of demerits) {
      const dk = pcCore(d);
      if (dk.length < 18) continue;
      if (mk === dk || mk.includes(dk) || dk.includes(mk)) dupPc += 1;
    }
  }
  if (!article.adminHidden && dupPc >= 1) {
    issues.push({
      id: "Q17_proscons_dup",
      severity: "blocker",
      field: "prosCons",
      message: `メリットとデメリットが同文重複（${dupPc}組）`,
      todo: "デメリットはコスト・未了・反対論点に差し替え。経過型ならメリデメ省略可",
    });
  }

  const statsBlob = JSON.stringify(article.statsSeries || article.keyNumbers || {});
  if (!article.adminHidden && STATS_PLACEHOLDER.test(statsBlob)) {
    issues.push({
      id: "Q18_stats_placeholder",
      severity: "blocker",
      field: "statsSeries",
      message: "数値統計のラベルが「指標N」プレースホルダーのまま",
      todo: "意味のあるラベルにするか statsSeries を外す",
    });
  }

  const hub = findHubForArticle(article.slug);
  if (!article.adminHidden && hub) {
    const blob = `${article.title || ""} ${article.searchKeyword || ""} ${(article.tags || []).join(" ")}`;
    const tagHit = (hub.matchTags || []).some((t) => (article.tags || []).includes(t));
    const kwHit = (hub.matchKeywords || []).some((k) => blob.includes(k));
    if (!tagHit && !kwHit) {
      issues.push({
        id: "Q19_theme_mismatch",
        severity: "blocker",
        field: "theme",
        message: `テーマ「${hub.title}」と記事タグ・キーワードが不一致`,
        todo: "content-hubs.json の articleSlugs から外すか、正しいテーマへ移す",
      });
    }
  }

  const topSrc = [];
  for (const u of article.sourceUrls || []) {
    if (isTopLevelSourceUrl(u)) topSrc.push(u);
  }
  for (const row of [...merits, ...demerits]) {
    if (row?.sourceUrl && isTopLevelSourceUrl(row.sourceUrl)) topSrc.push(row.sourceUrl);
  }
  for (const ev of article.timeline || []) {
    if (ev?.sourceUrl && isTopLevelSourceUrl(ev.sourceUrl)) topSrc.push(ev.sourceUrl);
  }
  if (!article.adminHidden && topSrc.length >= 2) {
    issues.push({
      id: "Q20_source_top_url",
      severity: "blocker",
      field: "sourceUrls",
      message: `出典がサイトトップページのみ ${topSrc.length} 件`,
      todo: "個別議事録・個別ページURLに差し替え",
    });
  }

  for (const g of gloss) {
    if (!article.adminHidden && /の動向/.test(String(g?.relatedTitle || ""))) {
      issues.push({
        id: "Q21_related_douryou",
        severity: "blocker",
        field: "glossary",
        message: "関連リンクのアンカーに「〜の動向」が残っている",
        todo: "relatedTitle を現行記事タイトル（動向なし）に同期",
      });
      break;
    }
  }

  const thinBoiler =
    bullets.length > 0 &&
    bullets.every((b) => BOILER_NOW.test(String(b)) || String(b).length < 28);
  if (!article.adminHidden && thinBoiler) {
    issues.push({
      id: "Q22_empty_article",
      severity: "blocker",
      field: "nowSummary",
      message: "いまの結論が空虚な定型文のみ（情報量ほぼゼロ）",
      todo: "再生成するか adminHidden で非公開化",
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
