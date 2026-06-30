import { SITE } from "./site-config.mjs";

/**
 * @param {string} url
 * @param {{ medium?: string, content?: string, campaign?: string }} opts
 */
function withUtm(url, opts = {}) {
  if (!url) return null;
  const u = new URL(url);
  u.searchParams.set("utm_source", "seiji1192");
  if (opts.medium) u.searchParams.set("utm_medium", opts.medium);
  if (opts.content) u.searchParams.set("utm_content", opts.content);
  if (opts.campaign) u.searchParams.set("utm_campaign", opts.campaign);
  return u.toString();
}

/**
 * @param {string} medium e.g. header, banner, hero, sticky
 * @param {string} [content] slug or page id
 */
export function noteMembershipLink(medium, content) {
  const base = SITE.noteMembershipUrl || SITE.noteUrl;
  if (!base) return null;
  return withUtm(base, { medium, content });
}

/**
 * @param {string} medium
 * @param {string} [content]
 */
export function noteTipLink(medium, content) {
  if (!SITE.noteTipUrl) return null;
  return withUtm(SITE.noteTipUrl, { medium, content });
}

export function hasNoteMembership() {
  return Boolean(SITE.noteUrl);
}

export function hasNoteTip() {
  return Boolean(SITE.noteTipUrl);
}

export function noteMembershipButtonLabel() {
  return "¥500/月";
}

export function noteMembershipFooterLabel() {
  return "¥500/月";
}

/** 管理画面 /dev/links/ 用 — クリック可能な一覧 */
export function getOutboundLinkGroups() {
  /** @type {{ title: string, links: { label: string, href: string, note?: string }[] }[]} */
  const groups = [];

  const noteLinks = [];
  const memberHref = noteMembershipLink("dev_links", "membership");
  if (memberHref) {
    noteLinks.push({
      label: SITE.noteMembershipLive ? "noteメンバー（月額）" : "noteメンバー",
      href: memberHref,
      note: SITE.noteMembershipUrl,
    });
  }
  const tipHref = noteTipLink("dev_links", "tip");
  if (tipHref) {
    noteLinks.push({
      label: "チップで応援（任意）",
      href: tipHref,
      note: "単発のお礼",
    });
  }
  if (SITE.noteUrl) {
    noteLinks.push({ label: "noteトップ", href: SITE.noteUrl, note: "プロフィール" });
  }
  if (noteLinks.length) groups.push({ title: "note・支援", links: noteLinks });

  groups.push({
    title: "SNS・はてブ",
    links: [
      { label: SITE.xHandle, href: SITE.xUrl },
      { label: "はてブプロフィール", href: SITE.hatenaProfileUrl },
      { label: "はてブホットエントリー", href: SITE.hatenaHotentryUrl },
    ].filter((l) => l.href),
  });

  groups.push({
    title: "本番サイト",
    links: [
      { label: "トップ", href: `${SITE.domain}/` },
      { label: "案件一覧", href: `${SITE.domain}/search` },
      { label: "このサイトについて", href: `${SITE.domain}/about/` },
    ],
  });

  groups.push({
    title: "アクセス解析（GA4）",
    links: [
      { label: "リアルタイム", href: SITE.gaRealtimeUrl },
      { label: "記事別レポート", href: SITE.gaPagesUrl },
    ].filter((l) => l.href),
  });

  return groups;
}
