/**
 * 1案件ページの公開可否チェック（単一の正本）
 * CLI: node scripts/check-case-page.mjs [--slug X] [--all] [--json]
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPhaseAPublish } from "./diet-pending.mjs";
import { isXUnavailable, X_UNAVAILABLE_ADMIN_MESSAGE } from "./x-research-policy.mjs";
import { countTopicBullets, isTitleReady, countTopicArcLines, countTopicDietTimeline, isMatrixTopicRelevant, isConclusionQuality, textStronglyMatchesTopic } from "./topic-relevance.mjs";
import { isDietVoice, bulletsDistinctFrom, isSpeechFragment } from "./diet-voice.mjs";
import { isValidSymbol } from "./symbol-rules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "../..");

/** @typedef {{ id: string, ok: boolean, detail?: string, blocker?: boolean }} CheckResult */

/** 管理画面・オーナー向けラベル（IDは開発者用） */
export const CHECK_LABELS = {
  A1_title: { label: "タイトル", todo: "タイトルを入力" },
  A1b_title_placeholder: { label: "タイトル確定", todo: "仮タイトル・編集メモを除去" },
  A2_primarySpeech: { label: "一次ソース", todo: "報道URL・国会リンクを追加" },
  B1_nowSummary: { label: "いまの結論", todo: "3行の要約を書く" },
  B2_disclaimer: { label: "AI注記", todo: "disclaimer を追加" },
  B3_topic: { label: "話題一致", todo: "要約が searchKeyword と一致（2行以上）" },
  B4_conclusion: { label: "結論の質", todo: "いまの結論が要点3行（重複・途中切れなし）" },
  B5_writer_voice: { label: "第三者目線", todo: "議事録口調（お尋ね・私自身・御党）を除去" },
  C1_summaryBullets: { label: "要点", todo: "summaryBullets を3点以上" },
  C2_evidence_distinct: { label: "根拠の独自性", todo: "根拠は結論と同文禁止" },
  D1_arcSummary: { label: "経緯", todo: "日付付き経緯を3行以上" },
  D2_arc_topic: { label: "経緯の話題", todo: "経緯3行以上が案件キーワードと一致" },
  E1_timeline_count: { label: "タイムライン", todo: "出来事を6件以上（X3+国会3）" },
  E2_timeline_x: { label: "タイムラインX", todo: "X投稿を3件以上タイムラインに" },
  E3_timeline_diet: { label: "タイムライン国会", todo: "国会発言を3件以上タイムラインに" },
  E4_timeline_diet_topic: { label: "TL国会の話題", todo: "タイムライン国会3件が案件と一致" },
  A2_phaseA_source: { label: "一次ソース（国会待ち）", todo: "報道URLまたはタイムライン出典を追加" },
  J1_prosCons: { label: "メリデメ", todo: "公表数値付きメリット2・デメリット2" },
  F1_glossary: { label: "用語解説", todo: "用語を2語以上" },
  G1_stanceMatrix_ref: { label: "〇×表リンク", todo: "stanceMatrix を設定" },
  G2_policy_matrix_file: { label: "公言と行動ファイル", todo: "policy-matrix JSON を作成" },
  G3_parties_min: { label: "政党数", todo: "2党以上を登録" },
  G4_parties_source: { label: "党の出典URL", todo: "各党に sourceUrl" },
  G5_parties_symbol: { label: "◎〇▲×", todo: "各党の記号を確定（v2）" },
  G6_matrix_topic: { label: "〇×の話題", todo: "公言と行動が案件キーワードと一致（2党）" },
  H1_xPosts: { label: "X投稿", todo: "検証済みX URLを3件以上（x-researcher）" },
  H2_x_topic: { label: "Xの話題", todo: "X投稿本文が案件キーワードと一致（x-researcher）" },
  H3_x_screenshot: { label: "Xスクショ", todo: "npm run x:capture -- --slug <slug>（デバッガー）" },
  I1_legal: { label: "法務", todo: "legal-check を実行" },
};

export function blockerToHuman(blocker) {
  const meta = CHECK_LABELS[blocker.id];
  return {
    id: blocker.id,
    label: meta?.label ?? blocker.id,
    todo: meta?.todo ?? blocker.detail ?? "",
    detail: blocker.detail ?? "",
  };
}

/** @param {unknown} article */
export function checkCasePage(article, opts = {}) {
  const { policyMatrix = null } = opts;
  /** @type {CheckResult[]} */
  const checks = [];

  const slug = article.slug || "(no slug)";

  function add(id, ok, detail, blocker = true) {
    checks.push({ id, ok, detail, blocker });
  }

  const phaseA = isPhaseAPublish(article);
  const xUnavailable = isXUnavailable(article);
  const tl = article.timeline ?? [];
  const xInTl = tl.filter((e) => e.type === "x_post" && e.xPost?.post_url);
  const dietInTl = tl.filter(
    (e) =>
      e.type === "speech" &&
      e.speech?.speechURL?.includes("kokkai.ndl.go.jp"),
  );

  // A. メタ
  add("A1_title", Boolean(article.title), article.title || "title なし");
  add("A1b_title_placeholder", isTitleReady(article), isTitleReady(article) ? "確定済み" : "仮タイトル・編集メモあり");
  if (phaseA) {
    const milestones = tl.filter(
      (e) => e.type === "milestone" && (e.milestone?.sourceUrl || e.sourceUrl),
    );
    const hasAltSource =
      Boolean(article.sourceUrls?.length) ||
      milestones.length >= 1 ||
      xInTl.length >= 1;
    add(
      "A2_primarySpeech",
      hasAltSource,
      hasAltSource ? "国会待ち（報道・Xソース）" : "sourceUrls またはタイムライン出典が必要",
    );
  } else {
    add(
      "A2_primarySpeech",
      Boolean(article.primarySpeech?.speechURL),
      article.primarySpeech?.speechURL || "speechURL なし",
    );
  }

  // B. いまの結論
  const bullets = article.nowSummary?.bullets ?? [];
  add("B1_nowSummary", bullets.length >= 3, `${bullets.length}/3 行`);
  add("B2_disclaimer", Boolean(article.nowSummary?.disclaimer), article.nowSummary?.disclaimer ? "あり" : "なし");
  const topicHits = countTopicBullets(article);
  add(
    "B3_topic",
    topicHits >= 2,
    `${topicHits}/2 行がキーワード一致（${article.searchKeyword || "—"}）`,
  );
  add(
    "B4_conclusion",
    isConclusionQuality(bullets),
    isConclusionQuality(bullets) ? "要点3行・重複なし" : "結論が途中切れ・重複・逐語抜粋",
  );
  const voiceOk = bullets.length >= 3 && bullets.every((b) => !isDietVoice(String(b)) && !isSpeechFragment(String(b)));
  add("B5_writer_voice", voiceOk, voiceOk ? "第三者目線" : "議事録口調が残っている");

  // C. 根拠
  const sb = article.summaryBullets ?? [];
  const sbTexts = sb.map((b) => (typeof b === "string" ? b : b.text));
  add("C1_summaryBullets", sbTexts.length >= 3, `${sbTexts.length}/3 点`);
  add(
    "C2_evidence_distinct",
    bulletsDistinctFrom(bullets, sbTexts),
    bulletsDistinctFrom(bullets, sbTexts) ? "結論と別文" : "根拠が結論のコピー",
  );

  // D. 経緯
  const arc = article.arcSummary ?? [];
  const arcDated = arc.filter((x) => typeof x === "object" && x.date && x.text);
  add("D1_arcSummary", arcDated.length >= 3, `${arcDated.length}/3 行（日付付き）`);
  const arcTopic = countTopicArcLines(article);
  add("D2_arc_topic", arcTopic >= 3, `${arcTopic}/3 行が話題一致`);

  // E. タイムライン
  if (phaseA) {
    add("E1_timeline_count", tl.length >= 3, `${tl.length}/3 件（国会待ち）`);
    if (xUnavailable) {
      add("E2_timeline_x", true, X_UNAVAILABLE_ADMIN_MESSAGE, false);
    } else {
      add("E2_timeline_x", xInTl.length >= 3, `${xInTl.length}/3 X`);
    }
    add("E3_timeline_diet", true, "国会待ち — 更新次第掲載", false);
  } else if (xUnavailable) {
    add(
      "E1_timeline_count",
      tl.length >= 3 && dietInTl.length >= 3,
      `${tl.length}件 · 国会${dietInTl.length}/3（X未発見）`,
    );
    add("E2_timeline_x", true, X_UNAVAILABLE_ADMIN_MESSAGE, false);
    add("E3_timeline_diet", dietInTl.length >= 3, `${dietInTl.length}/3 国会`);
    const dietTopic = countTopicDietTimeline(article);
    add("E4_timeline_diet_topic", dietTopic >= 3, `${dietTopic}/3 国会が話題一致`);
  } else {
    add("E1_timeline_count", tl.length >= 6, `${tl.length}/6 件`);
    add("E2_timeline_x", xInTl.length >= 3, `${xInTl.length}/3 X`);
    add("E3_timeline_diet", dietInTl.length >= 3, `${dietInTl.length}/3 国会`);
    const dietTopic = countTopicDietTimeline(article);
    add("E4_timeline_diet_topic", dietTopic >= 3, `${dietTopic}/3 国会が話題一致`);
  }

  // F. 用語
  const gloss = article.glossary ?? article.nowSummary?.glossary ?? [];
  add("F1_glossary", gloss.length >= 2, `${gloss.length}/2 語`);

  // J. メリット・デメリット（公表数値必須）
  const pc = article.prosCons;
  const merits = pc?.merits ?? [];
  const demerits = pc?.demerits ?? [];
  const meritOk =
    merits.length >= 2 &&
    merits.every((m) => m.text && m.figure && m.sourceUrl);
  const demeritOk =
    demerits.length >= 2 &&
    demerits.every((m) => m.text && m.figure && m.sourceUrl);
  add(
    "J1_prosCons",
    meritOk && demeritOk,
    meritOk && demeritOk
      ? `メリ${merits.length}・デメ${demerits.length}`
      : `メリ${merits.length}/2・デメ${demerits.length}/2（各 figure+sourceUrl 必須）`,
  );

  // G. 公言と行動（〇×）— 必須
  const sm = article.stanceMatrix;
  const matrixPath = sm?.dataPath
    ? path.join(root, sm.dataPath)
    : sm?.policySlug
      ? path.join(root, `data/policy-matrix/${sm.policySlug || slug}.json`)
      : path.join(root, `data/policy-matrix/${slug}.json`);

  let parties = policyMatrix?.parties ?? [];
  const hasMatrixRef = Boolean(sm);
  const withSource = parties.filter((p) => p.stance?.sourceUrl);
  const withSymbol = parties.filter((p) => p.symbol && isValidSymbol(p.symbol) && p.symbol !== "？");

  add("G1_stanceMatrix_ref", hasMatrixRef, hasMatrixRef ? "stanceMatrix あり" : "stanceMatrix なし");
  add(
    "G2_policy_matrix_file",
    Boolean(policyMatrix),
    policyMatrix ? matrixPath : `ファイルなし: ${matrixPath}`,
  );
  add(
    "G3_parties_min",
    parties.length >= 2,
    `${parties.length}/2 党以上`,
  );
  add(
    "G4_parties_source",
    withSource.length >= 2,
    `出典URL付き ${withSource.length}/2 党以上`,
  );
  add(
    "G5_parties_symbol",
    withSymbol.length >= 2,
    `◎▲❌ 確定 ${withSymbol.length}/2 党以上`,
  );
  add(
    "G6_matrix_topic",
    isMatrixTopicRelevant(policyMatrix, article.searchKeyword),
    isMatrixTopicRelevant(policyMatrix, article.searchKeyword)
      ? "2党とも話題一致"
      : "公言テキストが案件と無関係",
  );

  // H. X — 公開前必須（未検証URL・空枠では出さない）
  const xPosts = article.xPosts ?? [];
  const xVerified = xPosts.filter(
    (p) => p.post_url && p.post_text && p.status === "url_found",
  );
  const xBad = xPosts.filter((p) => p.post_url && (!p.post_text || p.status !== "url_found"));
  if (article.xPostsPolicy === "deferred") {
    add("H1_xPosts", false, "xPostsPolicy: deferred — 公開不可（X完成後に解除）");
  } else if (xUnavailable) {
    add("H1_xPosts", true, X_UNAVAILABLE_ADMIN_MESSAGE, false);
    add("H2_x_topic", true, "調査完了 — 該当投稿なし", false);
    add("H3_x_screenshot", true, "該当投稿なしのためスキップ", false);
  } else if (xBad.length > 0) {
    add("H1_xPosts", false, `未検証URL ${xBad.length} 件 — reset-xposts または post_text 補完`);
  } else {
    const xMin = article.xPostsMinRequired ?? 3;
    add(
      "H1_xPosts",
      xVerified.length >= xMin,
      xVerified.length >= xMin
        ? `検証済み ${xVerified.length} 件`
        : `検証済み ${xVerified.length}/${xMin} 件（公開前必須）`,
    );
    const xTopicOk = xVerified.filter((p) =>
      textStronglyMatchesTopic(String(p.post_text || ""), article.searchKeyword),
    ).length;
    add(
      "H2_x_topic",
      xTopicOk >= Math.min(3, xMin),
      `${xTopicOk}/${Math.min(3, xMin)} 件が話題一致`,
    );
    const xWithShot = xVerified.filter((p) => p.screenshot && p.captured_at);
    add(
      "H3_x_screenshot",
      true,
      xWithShot.length >= xMin
        ? `スクショ ${xWithShot.length}/${xMin} 件`
        : `スクショ ${xWithShot.length}/${xMin} 件 — 後追い可（公開は可）`,
      false,
    );
  }

  // I. 法務 — デプロイ直前（コンテンツ・〇×・X のあと）
  const legal = article.legalReview?.status;
  add("I1_legal", legal === "ok", legal || "pending");

  const blockers = checks.filter((c) => c.blocker !== false && !c.ok);
  const warnings = checks.filter((c) => c.blocker === false && !c.ok);

  return {
    slug,
    ok: blockers.length === 0,
    checks,
    blockers,
    warnings,
    publishReady: article.publishReady === true,
  };
}

/** @param {import('./check-case-page.mjs') extends never ? never : any} article */
export async function checkCasePageWithFiles(article) {
  const sm = article.stanceMatrix;
  const matrixPath = sm?.dataPath
    ? path.join(root, sm.dataPath)
    : path.join(root, `data/policy-matrix/${sm?.policySlug || article.slug}.json`);

  let policyMatrix = null;
  try {
    await access(matrixPath);
    policyMatrix = JSON.parse(await readFile(matrixPath, "utf8"));
  } catch {
    /* missing */
  }
  return checkCasePage(article, { policyMatrix });
}

export function isPublishablePage(result) {
  return result.ok;
}
