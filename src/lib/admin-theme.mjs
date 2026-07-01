/** 管理画面 — カテゴリ別トーン（ダッシュボードカード） */
export const ADMIN_CARD_THEMES = {
  articles: {
    tone: "articles",
    icon: "📝",
    gradient: "linear-gradient(145deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)",
    glow: "rgba(59, 130, 246, 0.25)",
  },
  outreach: {
    tone: "outreach",
    icon: "📣",
    gradient: "linear-gradient(145deg, #c2410c 0%, #f97316 55%, #fb923c 100%)",
    glow: "rgba(249, 115, 22, 0.22)",
  },
  ops: {
    tone: "ops",
    icon: "⚙️",
    gradient: "linear-gradient(145deg, #5b21b6 0%, #7c3aed 55%, #a78bfa 100%)",
    glow: "rgba(124, 58, 237, 0.22)",
  },
  analytics: {
    tone: "analytics",
    icon: "📊",
    gradient: "linear-gradient(145deg, #0f766e 0%, #14b8a6 55%, #2dd4bf 100%)",
    glow: "rgba(20, 184, 166, 0.22)",
  },
};

/** @param {string} groupId */
export function themeForGroup(groupId) {
  return ADMIN_CARD_THEMES[groupId] ?? ADMIN_CARD_THEMES.ops;
}
