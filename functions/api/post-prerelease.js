/**
 * POST /api/post-prerelease?pin=1192
 * 本番の BUFFER_API_KEY（CF Pages env）でプレリリース 1/7 を投稿
 */
const API_URL = "https://api.buffer.com";

const TEXT = `【プレリリース】サイト「日本の政治なう」を公開しました。

「あの話、どうなった？」を案件ごとに追います。
国会議事録・政府資料・報道を出典付きで整理。

https://seiji1192.site

プレリリース中です。読みやすさ・誤り・追ってほしい案件のフィードバック歓迎 → @seiji1192site`;

export async function onRequestPost(context) {
  const { BUFFER_API_KEY, BUFFER_CHANNEL_ID, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");

  if (!ADMIN_PIN || pin !== ADMIN_PIN) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!BUFFER_API_KEY) {
    return json({ error: "BUFFER_API_KEY not configured" }, 503);
  }

  try {
    const channelId = await resolveTwitterChannel(BUFFER_API_KEY, BUFFER_CHANNEL_ID || null);
    const post = await createXPost(BUFFER_API_KEY, channelId, TEXT);
    return json({ ok: true, post, postedAt: new Date().toISOString() });
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
}

async function resolveTwitterChannel(apiKey, preferredChannelId) {
  const orgs = await gql(apiKey, `query { account { organizations { id } } }`);
  for (const org of orgs?.account?.organizations ?? []) {
    const data = await gql(
      apiKey,
      `query($orgId: OrganizationId!) {
        channels(input: { organizationId: $orgId }) { id service }
      }`,
      { orgId: org.id },
    );
    const twitter = (data?.channels ?? []).filter((c) => c.service === "twitter");
    if (!twitter.length) continue;
    if (preferredChannelId) {
      const picked = twitter.find((c) => c.id === preferredChannelId);
      if (picked) return picked.id;
    }
    return twitter[0].id;
  }
  throw new Error("X channel not found in Buffer");
}

async function createXPost(apiKey, channelId, text) {
  const data = await gql(
    apiKey,
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text status } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        text,
        channelId,
        schedulingType: "automatic",
        mode: "shareNow",
      },
    },
  );
  const result = data?.createPost;
  if (result?.message) throw new Error(result.message);
  if (!result?.post?.id) throw new Error("Buffer did not return post id");
  return result.post;
}

async function gql(apiKey, query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(body.errors[0].message || "Buffer API error");
  }
  return body.data;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
