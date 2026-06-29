/**
 * POST /api/post-hot-single?pin=1192
 * 夜の単体 — スコア閾値以上のときだけ（1日最大2本のうち2本目）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.buffer.com";
const LOG_PATH = path.join("data", "x-post-log.json");
const HOT_THRESHOLD = 120;

function todayJst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

async function loadLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    return { digest: [], hot: [] };
  }
}

function hotPostedToday(log, day) {
  return log.hot?.some((p) => p.date === day) ?? false;
}

function postsTodayCount(log, day) {
  let n = 0;
  if (log.digest?.some((p) => p.date === day)) n += 1;
  if (hotPostedToday(log, day)) n += 1;
  return n;
}

async function loadArticles() {
  const index = JSON.parse(await readFile("data/articles/index.json", "utf8"));
  const articles = [];
  for (const slug of index.slugs || []) {
    const a = JSON.parse(await readFile(`data/articles/${slug}.json`, "utf8"));
    if (a.pageReady && !a.adminHidden) articles.push(a);
  }
  return articles;
}

const INTEREST = new Set(["政局", "経済", "物価", "防衛", "社会保障", "税制", "労働", "外交", "選挙", "行政"]);

function score(article, now) {
  let s = 0;
  const pub = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
  if (pub) {
    const h = (now - pub) / 3600000;
    if (h <= 24) s += 100;
    else if (h <= 48) s += 70;
    else if (h <= 168) s += 40;
  }
  const updated = article.nowSummary?.updatedAt ? new Date(article.nowSummary.updatedAt).getTime() : 0;
  if (updated && now - updated <= 48 * 3600000) s += 25;
  for (const t of article.tags || []) if (INTEREST.has(t)) s += 12;
  if (INTEREST.has(article.category)) s += 8;
  if (article.promoHot === true) s += 40;
  return s;
}

function shortTitle(article) {
  const t = article.title || article.slug;
  const s = t.replace(/^【/, "").replace(/】.*$/, "】").replace(/】$/, "") || t;
  return /^【/.test(s) ? s : `【${s}】`;
}

function caseUrl(slug) {
  return `https://seiji1192.site/case/${slug}/`;
}

function formatSingle(article) {
  const headline = shortTitle(article);
  const hook = (article.nowSummary?.bullets?.[0] || article.summaryBullets?.[0] || "").slice(0, 80);
  const lines = [headline, ""];
  if (hook) lines.push(hook);
  lines.push("", caseUrl(article.slug));
  return lines.join("\n").trim();
}

async function gql(apiKey, query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message || "Buffer API error");
  return body.data;
}

async function resolveChannel(apiKey, preferred) {
  const orgs = await gql(apiKey, `query { account { organizations { id } } }`);
  for (const org of orgs?.account?.organizations ?? []) {
    const data = await gql(
      apiKey,
      `query($orgId: OrganizationId!) { channels(input: { organizationId: $orgId }) { id service } }`,
      { orgId: org.id },
    );
    const tw = (data?.channels ?? []).filter((c) => c.service === "twitter");
    if (!tw.length) continue;
    if (preferred) {
      const p = tw.find((c) => c.id === preferred);
      if (p) return p.id;
    }
    return tw[0].id;
  }
  throw new Error("X channel not found");
}

export async function onRequestPost(context) {
  const { BUFFER_API_KEY, BUFFER_CHANNEL_ID, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");
  const force = url.searchParams.get("force") === "1";

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!BUFFER_API_KEY) {
    return json({ error: "BUFFER_API_KEY not configured" }, 503);
  }

  const day = todayJst();
  const log = await loadLog();

  if (!force && hotPostedToday(log, day)) {
    return json({ ok: true, skipped: true, reason: `evening hot already posted ${day}` });
  }
  if (!force && postsTodayCount(log, day) >= 2) {
    return json({ ok: true, skipped: true, reason: "daily cap (2) reached" });
  }

  const articles = await loadArticles();
  const now = Date.now();
  const digestSlugs = new Set(log.digest?.find((p) => p.date === day)?.slugs ?? []);
  const ranked = articles
    .filter((a) => !digestSlugs.has(a.slug))
    .map((a) => ({ a, s: score(a, now) }))
    .sort((x, y) => y.s - x.s);
  const top = ranked[0];

  if (!top || top.s < HOT_THRESHOLD) {
    return json({
      ok: true,
      skipped: true,
      reason: "below_threshold",
      topScore: top?.s ?? 0,
      threshold: HOT_THRESHOLD,
    });
  }

  const article = top.a;
  const text = formatSingle(article);
  const channelId = await resolveChannel(BUFFER_API_KEY, BUFFER_CHANNEL_ID || null);
  const data = await gql(
    BUFFER_API_KEY,
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id status } }
        ... on MutationError { message }
      }
    }`,
    { input: { text, channelId, schedulingType: "automatic", mode: "shareNow" } },
  );
  const result = data?.createPost;
  if (result?.message) throw new Error(result.message);

  log.hot = [
    {
      date: day,
      slot: "evening",
      postedAt: new Date().toISOString(),
      slug: article.slug,
      score: top.s,
      postId: result?.post?.id,
    },
    ...(log.hot || []).slice(0, 30),
  ];
  try {
    await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`);
  } catch {
    /* read-only on CF */
  }

  return json({
    ok: true,
    slot: "evening",
    day,
    slug: article.slug,
    score: top.s,
    post: result?.post,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
