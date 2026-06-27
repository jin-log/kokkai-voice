import { SITE } from "./site-config.mjs";

/**
 * @param {string} medium e.g. header, banner, hero, sticky
 * @param {string} [content] slug or page id
 */
export function noteMembershipLink(medium, content) {
  const base = SITE.noteMembershipUrl || SITE.noteUrl;
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set("utm_source", "seiji1192");
  url.searchParams.set("utm_medium", medium);
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
}

export function hasNoteMembership() {
  return Boolean(SITE.noteMembershipUrl);
}
