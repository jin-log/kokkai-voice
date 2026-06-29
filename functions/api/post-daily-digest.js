/**
 * POST /api/post-daily-digest?pin=1192
 * 日次3選を Buffer 経由で投稿（1日1回）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.buffer.com";
const LOG_PATH = path.join("data", "daily-digest-log.json");

function todayJst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
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
  for (const t of article.tags || []) if (INTEREST.has(t)) s += 12;
  if (INTEREST.has(article.category)) s += 8;
  return s;
}

function shortTitle(article) {
  const t = article.title || article.slug;
  return t.replace(/^【/, "").replace(/】.*$/, "】").replace(/】$/, "") || t;
}

function caseUrl(slug) {
  return `https://seiji1192.site/case/${slug}/`;
}

function formatDigest(picks) {
  const lines = ["【政治なう 今日の3選】", ""];
  const marks = ["①", "②", "③"];
  picks.forEach((a, i) => {
    const hook = (a.nowSummary?.bullets?.[0] || "").slice(0, 36);
    lines.push(`${marks[i]} ${shortTitle(a)}`);
    if (hook) lines.push(hook);
    lines.push(caseUrl(a.slug));
    lines.push("");
  });
  lines.push("出典付きで「あの話どうなった？」を追います");
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
  let log = { posts: [] };
  try {
    log = JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    /* new */
  }

  if (!force && log.posts?.some((p) => p.date === day)) {
    return json({ ok: true, skipped: true, reason: `already posted ${day}` });
  }

  const articles = await loadArticles();
  const now = Date.now();
  const picks = [...articles]
    .map((a) => ({ a, s: score(a, now) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map((x) => x.a);

  if (picks.length < 1) {
    return json({ error: "no live articles" }, 404);
  }

  const text = formatDigest(picks);
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

  log.posts = [
    { date: day, postedAt: new Date().toISOString(), slugs: picks.map((a) => a.slug), postId: result?.post?.id },
    ...(log.posts || []).slice(0, 30),
  ];
  try {
    await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`);
  } catch {
    /* read-only on CF — log in response only */
  }

  return json({
    ok: true,
    day,
    slugs: picks.map((a) => a.slug),
    post: result?.post,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
