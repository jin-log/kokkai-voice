/**
 * 週次プロモスプリント — Xローテ・文案バリエーション
 */
import { articleShortTitle } from "./case-helpers.mjs";
import { buildSharePayload } from "./share.mjs";
import {
  formatXMainPost,
  buildHatena,
  buildPromoPack,
  buildXPosts,
  clip,
  oneLine,
} from "./promo-generate.mjs";
import { SITE } from "./site-config.mjs";

const DAY_LABELS = ["月", "火", "水", "木", "金"];

/** @param {Date} [date] */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** @param {Date} [date] */
export function getWeekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** @param {import('./articles.mjs').Article} article */
export function findTimelineXPosts(article) {
  /** @type {object[]} */
  const posts = [];
  const seen = new Set();
  for (const item of article.timeline || []) {
    if (item.type === "x_post" && item.xPost?.post_text) {
      const key = item.xPost.post_url || item.xPost.post_text;
      if (!seen.has(key)) {
        seen.add(key);
        posts.push(item.xPost);
      }
    }
  }
  for (const xp of article.xPosts || []) {
    if (xp?.post_text) {
      const key = xp.post_url || xp.post_text;
      if (!seen.has(key)) {
        seen.add(key);
        posts.push(xp);
      }
    }
  }
  return posts;
}

/** @param {import('./articles.mjs').Article} article */
export function findDeletedX(article) {
  return findTimelineXPosts(article).find(
    (p) => p.status === "deleted" || p.deleted === true,
  );
}

/** @param {import('./articles.mjs').Article} article */
export function findTopXPost(article) {
  const posts = findTimelineXPosts(article);
  return posts.sort((a, b) => (b.engagement?.score || 0) - (a.engagement?.score || 0))[0];
}

/** @param {import('./articles.mjs').Article} article */
export function buildXVariants(article) {
  const { pageUrl, xUrl } = buildSharePayload(article);
  const shortTitle = articleShortTitle(article);
  const main = formatXMainPost(article);

  /** @type {{ id: string; label: string; text: string }[]} */
  const variants = [{ id: "main", label: "本投稿（標準）", text: main }];

  const b1 = article.nowSummary?.bullets?.[0] || "";
  const b2 = article.nowSummary?.bullets?.[1] || "";
  if (b2 && /[\d.]+(?:兆|億|万|%|人)/.test(b2)) {
    variants.push({
      id: "data",
      label: "数字フック",
      text: clip(
        `【数字で見る】${shortTitle}\n\n${b2}\n\n出典付きで整理 👇\n${pageUrl}`,
        280,
      ),
    });
  }

  variants.push({
    id: "question",
    label: "問いかけ",
    text: clip(
      `【あの話どうなった？】${shortTitle}\n\n${oneLine(b1).split("。")[0]}。\n\n国会・政府の出典付きで追います。\n${pageUrl}`,
      280,
    ),
  });

  const pc = article.prosCons;
  if (pc?.merits?.[0] && pc?.demerits?.[0]) {
    const m = clip(pc.merits[0].headline || pc.merits[0].text || "", 45);
    const d = clip(pc.demerits[0].headline || pc.demerits[0].text || "", 45);
    variants.push({
      id: "proscons",
      label: "メリデメ対比",
      text: clip(`【${shortTitle}】\n\n✅ ${m}\n❌ ${d}\n\n出典リンク付き →\n${pageUrl}`, 280),
    });
  }

  const topX = findTopXPost(article);
  if (topX?.account_label && topX?.post_text) {
    const who = topX.account_label.split("@")[0]?.trim() || topX.account_label;
    const snippet = clip(topX.post_text, 55);
    variants.push({
      id: "x-contrast",
      label: "X×国会",
      text: clip(
        `【国会 vs X】${shortTitle}\n\nX：${who}「${snippet}」\n\nタイムライン整理 👇\n${pageUrl}`,
        280,
      ),
    });
  }

  const deleted = findDeletedX(article);
  if (deleted) {
    variants.push({
      id: "deleted-x",
      label: "削除X（スクショ残し）",
      text: clip(
        `【削除された投稿】${shortTitle}関連\n\n${deleted.account_label} の投稿（取得時スクショあり）\n\n${pageUrl}`,
        280,
      ),
    });
  }

  return { pageUrl, xUrl, variants };
}

/**
 * @param {import('./articles.mjs').Article[]} articles
 * @param {Date} [weekStart]
 */
export function pickWeeklyRotation(articles, weekStart = getWeekStart()) {
  const pool = articles
    .filter((a) => !a.adminHidden && a.pageReady)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  const weekNum = Math.floor(weekStart.getTime() / (7 * 86400000));
  const startIdx = pool.length ? weekNum % pool.length : 0;
  const ordered = [...pool.slice(startIdx), ...pool.slice(0, startIdx)];

  /** @type {{ dayLabel: string; date: string; slug: string | null; title: string | null; article: import('./articles.mjs').Article | null }[]} */
  const days = [];
  for (let i = 0; i < 5; i++) {
    const art = ordered[i % ordered.length] || null;
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push({
      dayLabel: DAY_LABELS[i],
      date: localDateStr(d),
      slug: art?.slug ?? null,
      title: art ? articleShortTitle(art) : null,
      article: art,
    });
  }

  return {
    weekStart: localDateStr(weekStart),
    featured: ordered[0] || null,
    days,
    poolSize: pool.length,
  };
}

export function buildSiteFollowPost(poolSize = 21) {
  const domain = SITE.domain.replace(/\/$/, "");
  return [
    "【日本の政治なう】",
    "",
    "国会・政府の出典付きで",
    "「あの話どうなった？」を追います。",
    "",
    `📌 ${poolSize}案件公開中`,
    domain,
    "",
    "#政治 #国会",
  ].join("\n");
}

/** @param {import('./articles.mjs').Article[]} articles */
export function buildPromoSprint(articles) {
  const rotation = pickWeeklyRotation(articles);
  const featuredVariants = rotation.featured ? buildXVariants(rotation.featured) : null;

  const daily = rotation.days.map((day) => {
    if (!day.article) return { ...day, variants: [], xUrl: null, thread2: null, hatenaComment: null, hatenaAddUrl: null };
    const variants = buildXVariants(day.article);
    const hatena = buildHatena(day.article);
    const xPosts = buildXPosts(day.article);
    return {
      dayLabel: day.dayLabel,
      date: day.date,
      slug: day.slug,
      title: day.title,
      variants: variants.variants,
      xUrl: variants.xUrl,
      pageUrl: variants.pageUrl,
      thread2: xPosts.thread[1]?.text ?? null,
      hatenaComment: hatena.comment,
      hatenaAddUrl: hatena.addUrl,
    };
  });

  const todayIso = localDateStr();
  const dow = new Date().getDay();
  const isWeekend = dow === 0 || dow === 6;
  const featuredDay = rotation.featured
    ? (() => {
        const v = buildXVariants(rotation.featured);
        const hatena = buildHatena(rotation.featured);
        const xPosts = buildXPosts(rotation.featured);
        return {
          dayLabel: isWeekend ? "週末" : "目玉",
          date: todayIso,
          slug: rotation.featured.slug,
          title: articleShortTitle(rotation.featured),
          variants: v.variants,
          xUrl: v.xUrl,
          pageUrl: v.pageUrl,
          thread2: xPosts.thread[1]?.text ?? null,
          hatenaComment: hatena.comment,
          hatenaAddUrl: hatena.addUrl,
        };
      })()
    : null;

  const todaySlot =
    (isWeekend && featuredDay) ||
    daily.find((d) => d.date === todayIso) ||
    daily[dow === 0 ? 0 : Math.min(dow - 1, 4)] ||
    daily[0];

  return {
    generatedAt: new Date().toISOString(),
    weekStart: rotation.weekStart,
    poolSize: rotation.poolSize,
    featuredSlug: rotation.featured?.slug ?? null,
    featuredTitle: rotation.featured ? articleShortTitle(rotation.featured) : null,
    featuredPack: rotation.featured ? buildPromoPack(rotation.featured) : null,
    featuredVariants: featuredVariants?.variants ?? [],
    today: todaySlot,
    daily,
    siteFollow: buildSiteFollowPost(rotation.poolSize),
    ownerWeeklyPlan: [
      "月：ローテ1本目 X + はてブ（未登録のみ）",
      "火：2本目 X + スレッド2/3",
      "水：3本目 X（数字フック or メリデメ）",
      "木：note 週次ダイジェスト",
      "金：サイトフォロー促進 + GSC 週次15分",
    ],
  };
}

/** @param {ReturnType<typeof buildPromoSprint>} sprint */
export function formatPromoSprintMarkdown(sprint) {
  const lines = [
    `# プロモスプリント — 週次 ${sprint.weekStart}`,
    "",
    `生成: ${sprint.generatedAt.slice(0, 10)} · 公開案件 ${sprint.poolSize} 件`,
    "",
    "## 今週の目玉",
    "",
    sprint.featuredTitle ? `- **${sprint.featuredTitle}** (\`${sprint.featuredSlug}\`)` : "- （なし）",
    "",
    "## 月〜金ローテ",
    "",
    "| 曜日 | 日付 | 案件 |",
    "|------|------|------|",
  ];

  for (const d of sprint.daily) {
    lines.push(`| ${d.dayLabel} | ${d.date} | ${d.title || "—"} |`);
  }

  lines.push("", "## 今日の推奨", "", sprint.today?.title ? `**${sprint.today.title}**` : "—", "");

  if (sprint.today?.variants?.[0]) {
    lines.push("### X 本投稿", "", "```", sprint.today.variants[0].text, "```", "");
  }

  lines.push("## サイトフォロー促進（金曜推奨）", "", "```", sprint.siteFollow, "```", "");

  lines.push("## オーナー週次プラン", "");
  for (const step of sprint.ownerWeeklyPlan) lines.push(`- ${step}`);

  lines.push("", "---", "", "正本: `/dev/promo/` · `npm run promo:sprint`");
  return lines.join("\n");
}
