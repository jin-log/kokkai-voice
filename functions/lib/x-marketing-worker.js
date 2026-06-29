/**
 * X マーケ用 — Cloudflare Workers 互換（node:fs 不使用）
 */
const SITE_SHORT = "政治now";
const API_URL = "https://api.buffer.com";
const INTEREST = new Set(["政局", "経済", "物価", "防衛", "社会保障", "税制", "労働", "外交", "選挙", "行政"]);
export const HOT_THRESHOLD = 120;

export function todayJst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export function siteBase(env, requestUrl) {
  const fromEnv = env.SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return new URL(requestUrl).origin;
}

export async function loadLog(base) {
  try {
    const res = await fetch(`${base}/data/x-post-log.json`, { cf: { cacheTtl: 0 } });
    if (!res.ok) return { digest: [], hot: [] };
    return await res.json();
  } catch {
    return { digest: [], hot: [] };
  }
}

export function digestPostedToday(log, day) {
  return log.digest?.some((p) => p.date === day) ?? false;
}

export function hotPostedToday(log, day) {
  return log.hot?.some((p) => p.date === day) ?? false;
}

export function postsTodayCount(log, day) {
  let n = 0;
  if (digestPostedToday(log, day)) n += 1;
  if (hotPostedToday(log, day)) n += 1;
  return n;
}

export async function loadArticles(base) {
  const res = await fetch(`${base}/data/marketing-articles.json`, { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error("marketing-articles.json not found");
  const data = await res.json();
  return (data.articles ?? []).filter((a) => a.pageReady && !a.adminHidden);
}

export function score(article, now, { evening = false } = {}) {
  let s = 0;
  const pub = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
  if (pub) {
    const h = (now - pub) / 3600000;
    if (h <= 24) s += 100;
    else if (h <= 48) s += 70;
    else if (h <= 168) s += 40;
  }
  if (evening) {
    const updated = article.nowSummary?.updatedAt ? new Date(article.nowSummary.updatedAt).getTime() : 0;
    if (updated && now - updated <= 48 * 3600000) s += 25;
    if (article.promoHot === true) s += 40;
  }
  for (const t of article.tags || []) if (INTEREST.has(t)) s += 12;
  if (INTEREST.has(article.category)) s += 8;
  return s;
}

export function shortTitle(article, { bracket = false } = {}) {
  const t = article.title || article.slug;
  const s = t.replace(/^【/, "").replace(/】.*$/, "】").replace(/】$/, "") || t;
  if (!bracket) return s;
  return /^【/.test(s) ? s : `【${s}】`;
}

export function caseUrl(slug) {
  return `https://seiji1192.site/case/${slug}/`;
}

export function formatDigest(picks) {
  const lines = [`【${SITE_SHORT} 今日の3選】`, ""];
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

export function formatSingle(article) {
  const headline = shortTitle(article, { bracket: true });
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

export async function resolveChannel(apiKey, preferred) {
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

export async function postToBuffer(apiKey, channelId, text) {
  const data = await gql(
    apiKey,
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
  return result?.post;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
