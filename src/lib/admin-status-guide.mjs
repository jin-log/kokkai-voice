/**
 * 管理画面：状態の意味・自動化ポリシー
 */
import { activityWhenShort } from "./article-activity.mjs";
import { adminBucketExplain } from "./admin-buckets.mjs";

/** @type {{ channel: string, mode: "auto"|"manual"|"semi", note: string }[]} */
export const AUTOMATION_POLICY = [
  { channel: "記事の下書きづくり", mode: "auto", note: "巡回が自動で進める" },
  { channel: "サイトへの公開", mode: "manual", note: "あなたの「公開する」だけ" },
  { channel: "非表示", mode: "manual", note: "あなたの操作のみ" },
  { channel: "本番サイト反映", mode: "auto", note: "公開後に自動デプロイ" },
  { channel: "X / はてブ / note", mode: "semi", note: "公開後に半自動" },
  { channel: "ショート動画", mode: "manual", note: "手作り" },
];

/** @type {{ id: string, label: string, meaning: string, autoFix: string, autoRevert: string }[]} */
export const STATUS_DEFINITIONS = [
  {
    id: "todo",
    label: "あなたがやること",
    meaning: "公開ボタンを押せる、または自動処理が止まっている。",
    autoFix: "止まっている場合は自動では直らない",
    autoRevert: "—",
  },
  {
    id: "prep",
    label: "準備中",
    meaning: "まだサイトに載せない。巡回が仕上げている。",
    autoFix: "巡回が続ける",
    autoRevert: "—",
  },
  {
    id: "live",
    label: "公開中",
    meaning: "サイトに載っている。",
    autoFix: "細部は巡回が改善し続ける",
    autoRevert: "自動では非表示にしない",
  },
  {
    id: "hidden",
    label: "非表示",
    meaning: "一覧から隠している。データは残る。",
    autoFix: "巡回は触らない",
    autoRevert: "「表示に戻す」が必要",
  },
];

/**
 * @param {object} s project-status slug row
 * @param {import('./articles.mjs').Article} article
 */
export function buildStatusExplain(s, article) {
  if (s.adminBucket) {
    return adminBucketExplain(s.adminBucket, s);
  }
  if (s.adminHidden) {
    const when = article.adminHiddenAt ? activityWhenShort(article.adminHiddenAt) : "";
    return `非表示。${when ? `${when}〜` : ""}`;
  }
  if (s.publishState === "live") {
    return s.specialPublish ? "公開中（チェック未完了のまま載せている）" : "公開中";
  }
  if (s.publishGateOk) {
    return "公開できる。プレビュー確認後「公開する」";
  }
  return "準備中。巡回が仕上げている";
}

/**
 * @param {{ x: string|null, hatena: string|null, note: string|null }} promo
 * @param {{ label: string, generated: boolean, uploaded: boolean, uploadedAt?: string|null }} short
 */
export function buildDistributionRows(promo, short) {
  return [
    {
      channel: "X",
      automation: "semi",
      status: promo.x ? `済 ${activityWhenShort(promo.x)}` : "未",
      done: Boolean(promo.x),
    },
    {
      channel: "はてブ",
      automation: "semi",
      status: promo.hatena ? `済 ${activityWhenShort(promo.hatena)}` : "未",
      done: Boolean(promo.hatena),
    },
    {
      channel: "note",
      automation: "semi",
      status: promo.note ? `済 ${activityWhenShort(promo.note)}` : "未",
      done: Boolean(promo.note),
    },
    {
      channel: "ショート",
      automation: "manual",
      status: short.uploaded
        ? `YT ${short.label}${short.uploadedAt ? ` ${activityWhenShort(short.uploadedAt)}` : ""}`
        : short.generated
          ? "生成済・未アップ"
          : "未生成",
      done: short.uploaded,
    },
  ];
}

/** @param {"auto"|"manual"|"semi"} mode */
export function automationModeLabel(mode) {
  if (mode === "auto") return "自動";
  if (mode === "semi") return "半自動";
  return "手動";
}
