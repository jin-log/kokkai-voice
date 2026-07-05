import { decodeGitHubBase64Utf8 } from "../lib/github-content.js";
import {
  applyProposalToArticle,
  attachRevisionJobToStore,
  createRevisionJob,
  normalizeRevisionStore,
  recordOwnerInstruction,
  resolveOwnerInstruction,
} from "../lib/article-revisions-core.js";

const REVISIONS_PATH = "data/article-revisions.json";

export async function onRequestGet(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;
  const url = new URL(context.request.url);
  const pin = url.searchParams.get("pin");
  const slug = url.searchParams.get("slug") || "";
  if (!ADMIN_PIN || pin !== ADMIN_PIN) return json({ error: "unauthorized" }, 401);
  if (!GH_TOKEN) return json({ error: "GH_TOKEN 未設定" }, 500);

  const store = await loadStore(GH_TOKEN);
  const jobs = slug ? store.jobs.filter((j) => j.slug === slug) : store.jobs;
  return json({
    ok: true,
    jobs,
    rules: store.rules,
    ownerInstructions: store.ownerInstructions,
    ownerPrinciples: store.ownerPrinciples,
  });
}

export async function onRequestPost(context) {
  const { GH_TOKEN, ADMIN_PIN } = context.env;
  if (!GH_TOKEN) return json({ error: "GH_TOKEN 未設定" }, 500);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  if (!ADMIN_PIN || body.pin !== ADMIN_PIN) return json({ error: "unauthorized" }, 401);

  try {
    const action = body.action || "create";
    if (action === "create") return json(await createJob(GH_TOKEN, body));
    if (action === "apply") return json(await applyJob(GH_TOKEN, body));
    if (action === "reject") return json(await rejectJob(GH_TOKEN, body));
    return json({ error: `unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

async function createJob(token, body) {
  const slug = String(body.slug || "").trim();
  const sectionId = String(body.sectionId || "").trim();
  const instruction = String(body.instruction || "").trim();
  if (!slug || !sectionId || !instruction) throw new Error("slug, sectionId, instruction は必須です");

  const articleMeta = await fetchGhFile(token, `data/articles/${slug}.json`);
  if (!articleMeta?.content) throw new Error("記事JSONが見つかりません");
  const article = JSON.parse(decodeGitHubBase64Utf8(articleMeta.content));
  const job = createRevisionJob({
    article,
    slug,
    sectionId,
    instruction,
    current: body.current || "",
  });

  const { store, sha } = await loadStoreWithSha(token);
  attachRevisionJobToStore(store, job, article);
  await putGhFile(token, REVISIONS_PATH, store, sha, `article revision: ${slug} ${sectionId}`);
  return { ok: true, job };
}

async function applyJob(token, body) {
  const jobId = String(body.jobId || "").trim();
  if (!jobId) throw new Error("jobId は必須です");

  const { store, sha } = await loadStoreWithSha(token);
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("job が見つかりません");
  if (job.status !== "proposed") throw new Error(`この job は保存できません: ${job.status}`);

  const articlePath = `data/articles/${job.slug}.json`;
  const articleMeta = await fetchGhFile(token, articlePath);
  if (!articleMeta?.content) throw new Error("記事JSONが見つかりません");
  const article = JSON.parse(decodeGitHubBase64Utf8(articleMeta.content));
  const next = applyProposalToArticle(article, job.sectionId, job.proposal?.after || "");

  await putGhFile(token, articlePath, next, articleMeta.sha, `article revise apply: ${job.slug} ${job.sectionId}`);

  job.status = "applied";
  job.appliedAt = new Date().toISOString();
  job.updatedAt = job.appliedAt;
  resolveOwnerInstruction(store, jobId, "applied");
  store.rules.unshift({
    id: `rule-${Date.now().toString(36)}`,
    slug: job.slug,
    sectionId: job.sectionId,
    instruction: job.instruction,
    adopted: true,
    createdAt: job.appliedAt,
    sourceJobId: job.id,
  });
  await putGhFile(token, REVISIONS_PATH, store, sha, `article revision applied: ${job.slug} ${job.sectionId}`);
  return { ok: true, job };
}

async function rejectJob(token, body) {
  const jobId = String(body.jobId || "").trim();
  if (!jobId) throw new Error("jobId は必須です");
  const { store, sha } = await loadStoreWithSha(token);
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("job が見つかりません");
  job.status = "rejected";
  job.rejectedAt = new Date().toISOString();
  job.updatedAt = job.rejectedAt;
  resolveOwnerInstruction(store, jobId, "rejected");
  store.rules.unshift({
    id: `rule-${Date.now().toString(36)}`,
    slug: job.slug,
    sectionId: job.sectionId,
    instruction: job.instruction,
    adopted: false,
    createdAt: job.rejectedAt,
    sourceJobId: job.id,
  });
  await putGhFile(token, REVISIONS_PATH, store, sha, `article revision rejected: ${job.slug} ${job.sectionId}`);
  return { ok: true, job };
}

async function loadStore(token) {
  const { store } = await loadStoreWithSha(token);
  return store;
}

async function loadStoreWithSha(token) {
  const meta = await fetchGhFile(token, REVISIONS_PATH);
  if (!meta?.content) return { store: normalizeRevisionStore({}), sha: null };
  return {
    store: normalizeRevisionStore(JSON.parse(decodeGitHubBase64Utf8(meta.content))),
    sha: meta.sha,
  };
}

async function fetchGhFile(token, filePath) {
  const res = await fetch(`https://api.github.com/repos/jin-log/kokkai-voice/contents/${filePath}?ref=main`, {
    headers: ghHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function putGhFile(token, filePath, data, sha, message) {
  const body = {
    message,
    content: encodeBase64Utf8(`${JSON.stringify(data, null, 2)}\n`),
    branch: "main",
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(`https://api.github.com/repos/jin-log/kokkai-voice/contents/${filePath}`, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kokkai-voice-pages/1.0",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
