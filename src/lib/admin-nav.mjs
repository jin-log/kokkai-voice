/**
 * 管理画面 IA — 左カラム・ホームカードの正本
 */
export const ADMIN_HOME = {
  id: "home",
  href: "/dev/",
  label: "ホーム",
};

/** @type {{ id: string, label: string, items: { id: string, href: string, label: string, desc: string }[] }[]} */
export const ADMIN_NAV_GROUPS = [
  {
    id: "articles",
    label: "記事",
    items: [
      {
        id: "articles",
        href: "/dev/articles/",
        label: "記事一覧",
        desc: "検索・絞り込み・公開・進捗",
      },
      {
        id: "new",
        href: "/dev/articles/#new-article",
        label: "新規作成",
        desc: "キーワードから記事を生成",
      },
    ],
  },
  {
    id: "outreach",
    label: "発信",
    items: [
      {
        id: "promo",
        href: "/dev/promo/",
        label: "プロモ文案",
        desc: "SNS・紹介文の生成・確認",
      },
      {
        id: "hatena",
        href: "/dev/hatena/",
        label: "はてなブックマーク",
        desc: "はてブ投稿文",
      },
      {
        id: "shorts",
        href: "/dev/shorts/",
        label: "ショート動画",
        desc: "YouTube Shorts 素材",
      },
      {
        id: "buffer",
        href: "/dev/buffer/",
        label: "Buffer（自動投稿ログ）",
        desc: "deploy時のX自動投稿の状態確認。手動操作は不要",
      },
    ],
  },
  {
    id: "ops",
    label: "運用",
    items: [
      { id: "tasks", href: "/dev/tasks/", label: "今日のタスク", desc: "CEOキュー・優先作業" },
      { id: "automation", href: "/dev/automation/", label: "自動化ログ", desc: "deploy・生成の履歴" },
      { id: "agents", href: "/dev/agents/", label: "エージェント", desc: "担当とコマンド一覧" },
      { id: "trends", href: "/dev/trends/", label: "関心ワード", desc: "トレンド取得" },
      { id: "links", href: "/dev/links/", label: "リンク", desc: "内部リンク管理" },
      { id: "comments", href: "/dev/comments/", label: "コメント", desc: "読者コメント管理" },
    ],
  },
];

/** @param {string} path */
export function adminNavActiveId(path) {
  const p = path.replace(/\/$/, "") || "/dev";
  if (p === "/dev" || p === "/dev/index") return "home";
  for (const g of ADMIN_NAV_GROUPS) {
    for (const item of g.items) {
      const h = item.href.replace(/#.*$/, "").replace(/\/$/, "");
      if (p === h || p.startsWith(h + "/")) return item.id;
    }
  }
  if (p.startsWith("/dev/preview")) return "articles";
  if (p === "/dev/status" || p === "/dev/status-v2") return "articles";
  return "";
}
