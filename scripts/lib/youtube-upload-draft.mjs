/**
 * YouTube Shorts アップロード用メタデータ（Studio にコピペ）
 */
import { SITE } from "../../src/lib/site-config.mjs";
import {
  buildDescriptionCommentBlock,
  buildPinnedComment,
  commentQuestion,
} from "./short-comment-cta.mjs";

/** @type {Record<string, { title: string; summaryJa: string; summaryEn: string; tagsExtra: string[] }>} */
const SHORT_COPY = {
  "shussho-budget-seika": {
    title: "【少子化】3.6兆円かけたのに出生率は下がった？ #shorts",
    summaryJa: "3.6兆円のこども未来戦略 — 2025年の出生率1.14・出生数約67万人を整理。",
    summaryEn: "Japan spent ¥3.6 trillion on childcare policy — birth rate still 1.14 in 2025.",
    tagsExtra: ["出生率", "子育て支援", "予算", "3.6兆円"],
  },
  shoshika: {
    title: "【少子化】8割は結婚したいのに止まらない理由 #shorts",
    summaryJa: "8割が結婚を望むのに少子化が止まらない — 希望と現実のギャップを整理。",
    summaryEn: "80% hope to marry by 35, but Japan's birth rate keeps falling — the gap explained.",
    tagsExtra: ["結婚", "未婚化", "晩婚化", "国会"],
  },
  "osaka-to-metropolis": {
    title: "【大阪都構想】1100億削減？218億増？どっちが本当 #shorts",
    summaryJa: "大阪都構想 — 賛成側の年間1100億円削減 vs 反対側の218億円増、庁舎241億/637億の試算を整理。",
    summaryEn: "Osaka metropolis plan — ¥110B cut vs ¥21.8B rise; city hall cost estimates compared.",
    tagsExtra: ["大阪都構想", "大阪", "地方分権", "試算"],
    commentQuestion: "どの試算を信じますか？",
  },
  "kojin-joho-kaisei": {
    title: "【個人情報保護法】同意なしで提供へ。政治家は例外？ #shorts",
    summaryJa: "2026年7月成立。AI・統計目的なら同意なしで個人データを企業に渡せる改正の要点。",
    summaryEn: "Japan's 2026 privacy-law amendment — personal data may be shared without consent for AI/statistics.",
    tagsExtra: ["個人情報保護法", "プライバシー", "AI", "同意なし"],
    commentQuestion: "この法案、どう思いますか？",
  },
};

const BASE_TAGS = [
  "政治",
  "国会",
  "日本政治",
  "政治解説",
  "少子化",
  "Japan politics",
  "Japanese Diet",
  "shorts",
  "政治now",
];

/**
 * @param {import('../../src/lib/articles.mjs').Article} article
 * @param {{ videoFile?: string; postOrder?: number }} [opts]
 */
export function buildYoutubeUploadDraft(article, opts = {}) {
  const slug = article.slug;
  const copy = SHORT_COPY[slug];
  const caseUrl = `${SITE.domain}/case/${slug}/`;
  const category = article.searchKeyword?.split(/[\s　]+/)[0] || article.category || slug;

  const title =
    copy?.title ??
    `【${category}】${article.nowSummary?.bullets?.[0]?.slice(0, 40) ?? article.title} #shorts`;

  const summaryJa = copy?.summaryJa ?? String(article.nowSummary?.bullets?.[0] ?? article.title);
  const summaryEn =
    copy?.summaryEn ??
    `Japanese politics explainer — sourced facts on ${category}. Not a government channel.`;

  const question = copy?.commentQuestion ?? commentQuestion(slug, category);

  const description = [
    summaryJa,
    "",
    `EN: ${summaryEn}`,
    "",
    buildDescriptionCommentBlock(question),
    "",
    "▼ 出典付きの続き・数字の整理",
    caseUrl,
    "",
    "---",
    `${SITE.name}（Japan Politics Now）`,
    "国会議事録と公開情報をもとにした解説。非公式・個人運営メディアです。",
    "Not affiliated with the Japanese government or any political party.",
    "",
    `X: ${SITE.xUrl}`,
    `#政治now #国会 #${category} #shorts`,
  ].join("\n");

  const tags = [...new Set([...BASE_TAGS, ...(copy?.tagsExtra ?? []), category])];

  const pinnedComment = buildPinnedComment(question, caseUrl);

  return {
    slug,
    postOrder: opts.postOrder ?? null,
    studioUrl: "https://studio.youtube.com/",
    videoFile: opts.videoFile ?? `output/shorts/${slug}/${slug}-final.mp4`,
    title,
    description,
    tags,
    tagsLine: tags.join(", "),
    pinnedComment,
    category: "ニュースと政治",
    categoryId: "25",
    visibility: "公開",
    madeForKids: false,
    caseUrl,
    checklist: [
      "動画ファイルをドラッグ",
      "タイトルを貼る",
      "説明欄を貼る",
      "「ショート動画としても公開する」をON",
      "子供向け: いいえ",
      "カテゴリ: ニュースと政治",
      "公開後、固定コメント（質問＋サイトURL）をピン留め",
    ],
  };
}

/**
 * @param {ReturnType<typeof buildYoutubeUploadDraft>} draft
 */
export function formatUploadTxt(draft) {
  return [
    `# YouTube アップロード — ${draft.slug}`,
    `生成: ${new Date().toISOString().slice(0, 10)}`,
    draft.postOrder != null ? `投稿順: ${draft.postOrder}本目` : "",
    "",
    "動画ファイル:",
    draft.videoFile,
    "",
    "Studio:",
    draft.studioUrl,
    "",
    "=== タイトル（ここからコピー） ===",
    draft.title,
    "",
    "=== 説明欄（ここからコピー） ===",
    draft.description,
    "",
    "=== タグ（カンマ区切り・ここからコピー） ===",
    draft.tagsLine,
    "",
    "=== 固定コメント（公開後にピン留め） ===",
    draft.pinnedComment,
    "",
    "=== Studio チェックリスト ===",
    ...draft.checklist.map((s, i) => `${i + 1}. ${s}`),
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
