/** Shared helpers — patterns from scripts/generate-case-pages.mjs */
import { citizenTitle } from "./title-format.mjs";

export const ASSET_V = "20260629a";

export const SYMBOL_LEGEND = [
  { sym: "○", label: "公言通り実施済み（完了）" },
  { sym: "▲", label: "方向一致で動いている（進行中）" },
  { sym: "×", label: "方向が違う、または動きがない" },
];

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function reactionNums(article) {
  const good = article.reactions?.good ?? 0;
  const neutral = article.reactions?.neutral ?? 0;
  const bad = article.reactions?.bad ?? 0;
  const total = good + neutral + bad || 1;
  return {
    good,
    neutral,
    bad,
    goodPct: Math.round((good / total) * 100),
    neutralPct: Math.round((neutral / total) * 100),
    badPct: Math.round((bad / total) * 100),
  };
}

export function symbolTone(sym) {
  if (sym === "○") return "match";
  if (sym === "▲") return "partial";
  if (sym === "×") return "mismatch";
  return "mismatch";
}

export function articlePolicyTitle(article, matrix) {
  if (matrix?.policyLabel) return matrix.policyLabel;
  return (article.title || "").replace(/\s*—\s*あの話どうなった？\s*$/, "").trim();
}

/** 表示用短タイトル（【】形式） */
export function articleShortTitle(article) {
  return citizenTitle(article);
}

/** Exclude parties with sourceUrl null + 要出典 (legal L3). */
export function shouldPublishParty(p) {
  const st = p.stance;
  if (!st?.sourceUrl && String(st?.sourceType || "").includes("要出典")) return false;
  return true;
}

export function getGlossary(article) {
  return article.glossary ?? article.nowSummary?.glossary ?? [];
}

export function getFloatTocItems(article, hasStance) {
  const items = [{ href: "#sec-now", label: "いまの結論" }];
  if (article.prosCons?.merits?.length || article.prosCons?.demerits?.length) {
    items.push({ href: "#sec-proscons", label: "メリデメ" });
  }
  if (article.arcSummary?.length) {
    items.push({ href: "#sec-arc", label: "経緯" });
  }
  items.push({ href: "#sec-mood", label: "みんなのキモチ" });
  if (article.summaryBullets?.length) {
    items.push({ href: "#sec-detail", label: "根拠" });
  }
  if (hasStance) {
    items.push({ href: "#stance-matrix-title", label: "公言と行動" });
  }
  if (getGlossary(article).length) {
    items.push({ href: "#glossary-title", label: "用語" });
  }
  items.push(
    { href: "#sec-timeline", label: "タイムライン" },
    { href: "#comments-title", label: "コメント" }
  );
  return items;
}

export function caseCardMeta(article) {
  const xCount = (article.xPosts || []).filter((p) => p.post_url).length;
  const eventCount = 1 + (article.xPosts?.length || 0);
  const { goodPct } = reactionNums(article);
  const updated = article.nowSummary?.updatedAt?.slice(5, 10).replace("-", "/") ||
    article.fetchedAt?.slice(5, 10).replace("-", "/") ||
    "";
  const tagLine = [...(article.tags || [])].slice(0, 2).join(" · ");
  const summary =
    article.nowSummary?.bullets?.slice(0, 2).join("。") + "。" ||
    article.summaryBullets?.slice(0, 2).join("。") + "。" ||
    "";
  return { xCount, eventCount, goodPct, updated, tagLine, summary };
}
