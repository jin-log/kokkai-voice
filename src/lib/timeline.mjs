/** Merge article.timeline with legacy primarySpeech + xPosts. */
import { isXPostOnTopic } from "./timeline-sanitize.mjs";

export const TIMELINE_INITIAL_VISIBLE = 7;

/** ビルド公開判定は articles.mjs の filterPublishable（page-ready）を正とする */
export function isPublishable(article) {
  return article.pageReady === true;
}

function legacySpeechEvent(article) {
  const s = article.primarySpeech;
  if (!s?.date) return null;
  return {
    id: `speech-${s.speechID || "primary"}`,
    type: "speech",
    date: s.date,
    summaryPlain:
      (typeof article.summaryBullets?.[0] === "string"
        ? article.summaryBullets[0]
        : [article.summaryBullets?.[0]?.key, article.summaryBullets?.[0]?.detail || article.summaryBullets?.[0]?.text]
            .filter(Boolean)
            .join("：")
      )?.replace(/。$/, "") ||
      "国会での発言。詳細は原文リンクで確認できます。",
    speech: s,
  };
}

function legacyXEvents(article) {
  return (article.xPosts || [])
    .filter((p) => p.post_url && isXPostOnTopic(article, p.post_text || ""))
    .map((p) => ({
      id: `x-slot-${p.slot}`,
      type: "x_post",
      date: p.posted_at?.slice(0, 10) || p.captured_at?.slice(0, 10) || null,
      summaryPlain: p.post_text || null,
      xPost: p,
    }));
}

/** @returns events sorted ascending by date (null dates last) */
export function getTimelineEvents(article) {
  const events = [];
  if (article.timeline?.length) {
    events.push(...article.timeline);
  } else {
    const speech = legacySpeechEvent(article);
    if (speech) events.push(speech);
  }
  const seenX = new Set(
    events.filter((e) => e.type === "x_post").map((e) => e.id),
  );
  for (const xEv of legacyXEvents(article)) {
    if (!seenX.has(xEv.id)) events.push(xEv);
  }
  return events.sort(compareEventDate);
}

function compareEventDate(a, b) {
  const da = a.date || "9999-12-31";
  const db = b.date || "9999-12-31";
  if (da !== db) return da.localeCompare(db);
  const order = { milestone: 0, speech: 1, x_post: 2 };
  return (order[a.type] ?? 9) - (order[b.type] ?? 9);
}

/** @param {'asc'|'desc'} order */
export function sortTimelineEvents(events, order = "asc") {
  const sorted = [...events].sort(compareEventDate);
  return order === "desc" ? sorted.reverse() : sorted;
}

export function groupEventsByYear(events) {
  const groups = [];
  let current = null;
  for (const ev of events) {
    const year = ev.date?.slice(0, 4) || "日付不明";
    if (!current || current.year !== year) {
      current = { year, events: [] };
      groups.push(current);
    }
    current.events.push(ev);
  }
  return groups;
}
