/**
 * 管理画面：状態の意味・自動化ポリシー・1行説明
 */
import { activityWhenShort } from "./article-activity.mjs";

/** @type {{ channel: string, mode: "auto"|"manual"|"semi", note: string }[]} */
export const AUTOMATION_POLICY = [
  { channel: "記事生成・①〜④", mode: "auto", note: "巡回がライター/X/法務で自動処理" },
  { channel: "品質NGの修正", mode: "auto", note: "巡回が試行。直らなければ要対応のまま" },
  { channel: "一般公開（/case/）", mode: "manual", note: "管理画面「公開する」のみ。自動公開なし" },
  { channel: "非表示", mode: "manual", note: "あなたの操作のみ。自動では戻らない" },
  { channel: "本番サイト反映", mode: "auto", note: "git push 後 Cloudflare デプロイ" },
  { channel: "X投稿", mode: "semi", note: "Buffer連携時はキュー自動。未設定なら手動" },
  { channel: "はてブ / note", mode: "semi", note: "公開後キュー→ブラウザ半自動（要ログイン）" },
  { channel: "ショート動画", mode: "manual", note: "オーナー手作り（生成スクリプトは別途）" },
];

/** @type {{ id: string, label: string, meaning: string, autoFix: string, autoRevert: string }[]} */
export const STATUS_DEFINITIONS = [
  {
    id: "action",
    label: "要対応",
    meaning: "①〜④のゲートが未完了。記事は非公開。",
    autoFix: "巡回が順に自動処理（◌=今動いている項目）",
    autoRevert: "—",
  },
  {
    id: "draft",
    label: "公開待ち",
    meaning: "①〜④完了。プレビュー可だが一般公開はまだ。",
    autoFix: "巡回は内容改善のみ（公開はしない）",
    autoRevert: "—",
  },
  {
    id: "live",
    label: "公開済み",
    meaning: "/case/ に表示中。",
    autoFix: "巡回で品質改善を継続",
    autoRevert: "—",
  },
  {
    id: "hidden",
    label: "非表示",
    meaning: "トップ・一覧から除外。データは残る。",
    autoFix: "巡回はスキップ（修正しない）",
    autoRevert: "自動復帰なし。「表示に戻す」が必要",
  },
  {
    id: "quality",
    label: "品質NG",
    meaning: "監査不合格のバッジ。公開状態とは別軸。",
    autoFix: "巡回がライター等で修正試行",
    autoRevert: "公開/非公開は変えない",
  },
];

/**
 * @param {object} s project-status slug row
 * @param {import('./articles.mjs').Article} article
 */
export function buildStatusExplain(s, article) {
  const fixing = s.runState === "active" || (s.workItems ?? []).some((w) => w.state === "active");

  if (s.adminHidden) {
    const by =
      article.adminHiddenBy === "batch"
        ? "一括投入"
        : article.adminHiddenBy === "owner"
          ? "あなたが手動"
          : "手動";
    const when = article.adminHiddenAt ? activityWhenShort(article.adminHiddenAt) : "";
    return `非表示（${by}）。自動では戻らない。${when ? `${when}〜` : ""}`;
  }

  if (fixing) {
    return "巡回が自動修正中 — ◌ が今処理している項目";
  }

  if (s.publishState === "draft") {
    return "①〜④完了・非公開。一般公開はあなたの「公開する」のみ（自動公開なし）";
  }

  if (s.publishState === "live") {
    const when = article.publishedAt ? activityWhenShort(article.publishedAt) : "";
    const by = article.publishedBy === "owner" ? "手動公開" : "公開済";
    const q = s.needsQualityFix ? "。品質NGバッジあり（公開は継続）" : "";
    return `${by}${when ? ` ${when}` : ""}${q}`;
  }

  const q = s.needsQualityFix ? "品質NGあり。" : "";
  return `${q}要対応 — ゲート未達。巡回が順に自動処理`;
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
