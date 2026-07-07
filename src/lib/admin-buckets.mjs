/**
 * 管理画面 — オーナー向け4分類（内部ゲートはそのまま、見せ方だけ簡素化）
 */

/** @typedef {"ready"|"prep"|"live"|"hidden"} AdminBucket */

/**
 * @param {{ adminHidden?: boolean, pageReady?: boolean, publishGateOk?: boolean }} s
 * @returns {AdminBucket}
 */
export function adminBucket(s) {
  if (s.adminHidden) return "hidden";
  if (s.pageReady) return "live";
  if (s.publishGateOk) return "ready";
  return "prep";
}

/** @param {AdminBucket} bucket */
export function adminBucketLabel(bucket) {
  const labels = {
    ready: "公開できる",
    prep: "準備中",
    live: "公開中",
    hidden: "非表示",
  };
  return labels[bucket] ?? bucket;
}

/**
 * 行バッジ用の短い1語
 * @param {{ adminHidden?: boolean, pageReady?: boolean, publishGateOk?: boolean, specialPublish?: boolean, stall?: { stalled?: boolean }|null }} s
 */
export function adminBucketBadge(s) {
  if (s.adminHidden) return "非表示";
  if (s.pageReady) return s.specialPublish ? "仮公開" : "公開中";
  if (s.publishGateOk) return "公開できる";
  if (s.stall?.stalled) return "自動停止";
  return "準備中";
}

/**
 * @param {{ adminHidden?: boolean, pageReady?: boolean, publishGateOk?: boolean, stall?: { stalled?: boolean }|null }} s
 */
export function needsOwnerAttention(s) {
  if (s.adminHidden) return false;
  // 巡回ループ（B3_topic等）はCEOが直す。オーナーの「やること」に入れない
  if (s.publishGateOk && !s.pageReady) return true;
  return false;
}

/**
 * @param {AdminBucket} bucket
 * @param {{ stall?: { stalled?: boolean }|null, specialPublish?: boolean, needsQualityFix?: boolean }} [s]
 */
export function adminBucketExplain(bucket, s = {}) {
  if (bucket === "hidden") {
    return "一覧から隠している。表示に戻すと再び管理対象になる。";
  }
  if (bucket === "ready") {
    if (s.stall?.stalled) {
      return "自動処理が同じところで止まっている。プレビューを見て公開するか、非表示にする。";
    }
    return "内容は読める状態。プレビュー確認後「公開する」でサイトに載る。";
  }
  if (bucket === "live") {
    if (s.specialPublish) {
      return "サイトに載っているが、内部チェックは全部終わっていない。";
    }
    if (s.needsQualityFix) {
      return "公開中。細部の品質は巡回が直し続ける。";
    }
    return "サイトに公開中。";
  }
  return "巡回が記事を仕上げている。公開ボタンはまだ出ない。";
}
