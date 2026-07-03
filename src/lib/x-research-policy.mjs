/**
 * X調査の段階的拡張・「見つからず」公開方針
 */
import { getTopicTerms } from "./topic-relevance.mjs";

export const X_RESEARCH_MIN_URLS = 3;

/** 段3以降で足す共通アカウント（話題テンプレの handles には含めない） */
export const COMMON_X_HANDLE_POOL = [
  "takaichi_sanae",
  "izmkenta",
  "tamakiyuichiro",
  "cdp_japan",
  "NodaSeiko",
  "renho_sha",
  "FurukawaMot",
  "shindo_y",
  "koike_akira",
  "yoshimurhirofumi",
  "inadatomomi",
  "satsukikatayama",
  "NakataniGen",
];

/** 5段階調査後も3本未満 → 公開ゲート上 X 不要 */
export function isXUnavailable(article) {
  return (
    article?.xPostsPolicy === "unavailable" &&
    article?.xResearch?.exhausted === true
  );
}

/** タイムラインに表示できる X 投稿が1件でもあるか */
export function hasVisibleXPosts(article) {
  if ((article?.xPosts || []).some((p) => p?.post_url)) return true;
  return (article?.timeline || []).some(
    (e) => e?.type === "x_post" && e?.xPost?.post_url,
  );
}

/** 読者向け「見つかりませんでした」— X が1件も無いときだけ */
export function showsXUnavailableNotice(article) {
  return isXUnavailable(article) && !hasVisibleXPosts(article);
}

/** 段5: 既存 keywords に同義語を最大 maxAdd 語追加 */
export function expandXKeywords(baseKeywords, searchKeyword, maxAdd = 2) {
  const base = baseKeywords ?? [];
  const existing = new Set(base.map((k) => String(k).toLowerCase()));
  const added = [];
  for (const term of getTopicTerms(searchKeyword)) {
    if (added.length >= maxAdd) break;
    const t = String(term).trim();
    if (t.length < 2 || existing.has(t.toLowerCase())) continue;
    added.push(t);
    existing.add(t.toLowerCase());
  }
  return [...base, ...added];
}

export function extraCommonHandles(baseHandles = []) {
  const have = new Set(baseHandles);
  return COMMON_X_HANDLE_POOL.filter((h) => !have.has(h));
}

export const X_UNAVAILABLE_USER_MESSAGE =
  "この話題に関する X（旧Twitter）上の関連投稿は、複数段階の調査の結果見つかりませんでした。";

export const X_UNAVAILABLE_ADMIN_MESSAGE =
  "X投稿は見つかりませんでした（5段階調査完了）";
