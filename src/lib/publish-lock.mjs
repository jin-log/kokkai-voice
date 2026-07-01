/**
 * 公開済み記事の自動非公開を防ぐ。
 * pageReady / adminHidden は管理画面の明示操作のみ変更可。
 */

/** 本番 /case/ に載っている状態 */
export function isLiveOnSite(article) {
  return article?.pageReady === true && article?.adminHidden !== true;
}

/**
 * 巡回・バッチが JSON を保存する直前に呼ぶ。
 * @param {object} article
 * @param {boolean} wasLive completeOneSlug 開始時点で公開中だったか
 */
export function enforceLivePublishLock(article, wasLive) {
  if (!wasLive) return article;
  article.pageReady = true;
  article.adminHidden = false;
  delete article.adminHiddenAt;
  delete article.adminHiddenBy;
  return article;
}
