/** Shared helpers — patterns from scripts/generate-case-pages.mjs */
import { citizenTitle } from "./title-format.mjs";
import { SYMBOL_LEGEND, symbolTone, isValidSymbol, normalizeSymbol } from "./symbol-rules.mjs";
import { usesContentBlocks } from "./case-blocks.mjs";

export { SYMBOL_LEGEND, symbolTone, isValidSymbol, normalizeSymbol };

export const ASSET_V = "20260702d";

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

export function articlePolicyTitle(article, matrix) {
  if (matrix?.policyLabel) return matrix.policyLabel;
  return (article.title || "").replace(/\s*—\s*あの話どうなった？\s*$/, "").trim();
}

/** 表示用短タイトル（【】形式） */
export function articleShortTitle(article) {
  return citizenTitle(article);
}

/** SNS・OGP用 — いまの結論優先（議事録抜粋は使わない） */
export function articleMetaDescription(article, maxLen = 120) {
  const bullets = article.nowSummary?.bullets || [];
  if (bullets.length) {
    const text = bullets
      .slice(0, 2)
      .map((b) => String(b).replace(/。$/, "").trim())
      .filter(Boolean)
      .join("。");
    if (text) {
      const out = text.endsWith("。") ? text : `${text}。`;
      return out.length > maxLen ? `${out.slice(0, maxLen - 1)}…` : out;
    }
  }
  const plain = (article.plainExplanation || "").split(/\n\n/).find((p) => p.length >= 24) || "";
  if (plain) {
    const t = plain.replace(/\s+/g, " ").trim();
    return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
  }
  const ev = article.summaryBullets?.[0];
  if (ev) return String(ev).slice(0, maxLen);
  return "";
}

export function shouldPublishParty(p) {
  const st = p.stance;
  if (!st?.sourceUrl && String(st?.sourceType || "").includes("要出典")) return false;
  return true;
}

export function getGlossary(article) {
  return article.glossary ?? article.nowSummary?.glossary ?? [];
}

/** meritsDemerits と prosCons をマージ（片側だけ空のときフォールバック） */
export function resolveProsCons(article) {
  const md = article.meritsDemerits;
  const pc = article.prosCons;
  if (!md && !pc) return null;
  const merits = md?.merits?.length ? md.merits : (pc?.merits ?? []);
  const demerits = md?.demerits?.length ? md.demerits : (pc?.demerits ?? []);
  if (!merits.length && !demerits.length) return null;
  return {
    disclaimer: md?.disclaimer || pc?.disclaimer || "",
    merits,
    demerits,
  };
}

export function getFloatTocItems(article, hasStance) {
  const items = [{ href: "#sec-now", label: "いまの結論" }];
  const resolved = resolveProsCons(article);
  if (resolved) {
    if (usesContentBlocks(article) && (article.prosCons?.merits?.length || article.prosCons?.demerits?.length)) {
      items.push({ href: "#sec-impact", label: "利害整理" });
    }
    items.push({ href: "#sec-proscons", label: "メリット・デメリット" });
  } else if (article.prosCons?.merits?.length || article.prosCons?.demerits?.length) {
    const blocks = usesContentBlocks(article);
    items.push({
      href: blocks ? "#sec-impact" : "#sec-proscons",
      label: blocks ? "利害整理" : "メリット・デメリット",
    });
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
