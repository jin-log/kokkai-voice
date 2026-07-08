import { decodeGitHubBase64Utf8 } from "../lib/github-content.js";
import {
  applyProposalToArticle,
  attachRevisionJobToStore,
  createRevisionJob,
  normalizeRevisionStore,
  recordOwnerInstruction,
  resolveOwnerInstruction,
  applyStanceProposal,
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
  const { GH_TOKEN, ADMIN_PIN, OPENAI_API_KEY } = context.env;
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
    if (action === "create") return json(await createJob(GH_TOKEN, body, OPENAI_API_KEY));
    if (action === "apply") return json(await applyJob(GH_TOKEN, body));
    if (action === "reject") return json(await rejectJob(GH_TOKEN, body));
    return json({ error: `unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

async function createJob(token, body, openaiKey) {
  const slug = String(body.slug || "").trim();
  const sectionId = String(body.sectionId || "").trim();
  const instruction = String(body.instruction || "").trim();
  if (!slug || !sectionId || !instruction) throw new Error("slug, sectionId, instruction は必須です");

  const articleMeta = await fetchGhFile(token, `data/articles/${slug}.json`);
  if (!articleMeta?.content) throw new Error("記事JSONが見つかりません");
  const article = JSON.parse(decodeGitHubBase64Utf8(articleMeta.content));
  const matrix =
    sectionId === "stance" ? await loadPolicyMatrix(token, slug, article) : null;
  const job = createRevisionJob({
    article,
    slug,
    sectionId,
    instruction,
    current: body.current || "",
    matrix,
  });

  // AI生成が有効で「指定モード」以外の場合はOpenAIで提案を上書き
  if (openaiKey && job.proposal && !job.proposal.note?.includes("オーナー指定")) {
    try {
      const aiAfter = await generateWithAI(openaiKey, {
        article,
        sectionId,
        instruction,
        current: body.current || "",
      });
      if (aiAfter) {
        job.proposal.after = aiAfter;
        job.proposal.note = "AI生成（gpt-4o-mini）: オーナー指示と記事データをもとに再構成";
      }
    } catch (e) {
      // AI失敗時はルールベース提案のまま続行
      job.proposal.note = (job.proposal.note || "") + "（AI生成失敗・ルールベース提案）";
    }
  }

  const { store, sha } = await loadStoreWithSha(token);
  attachRevisionJobToStore(store, job, article);
  await putGhFile(token, REVISIONS_PATH, store, sha, `article revision: ${slug} ${sectionId}`);
  return { ok: true, job };
}

/**
 * OpenAI gpt-4o-mini でセクション内容を生成する
 */
async function generateWithAI(apiKey, { article, sectionId, instruction, current }) {
  const ps = article?.primarySpeech ?? {};
  const tl = (article?.timeline ?? []).slice(0, 5).map(t => `${t.date} ${t.event || ""}`.slice(0, 80)).join("\n");
  const excerpt = (ps.excerpt || "").slice(0, 400);
  const speaker = ps.speaker || "";
  const party = ps.speakerGroup || "";
  const date = ps.date || "";
  const title = article?.title || "";

  const sectionFormats = {
    nowSummary: "番号付きリスト3行（1. 〜\n2. 〜\n3. 〜）。各行は事実文で終わる。",
    summaryBullets: "番号付きリスト3行（1. 〜\n2. 〜\n3. 〜）。数値・主体・法案など根拠となる事実。",
    arcSummary: "日付付き経緯（YYYY-MM-DD — 出来事）を3〜6行。",
    title_opening: "タイトル: {新タイトル}\n1行目候補: {疑問に答える1文}",
    glossary: "用語: 説明（20字以内）の形式で2〜4語。",
  };
  const format = sectionFormats[sectionId] || "適切な形式で3〜5行。";

  const systemPrompt = `あなたは「日本の政治なう」（seiji1192.site）の政治記事ライターです。
国会審議・政策案件を事実ベース・中立の第三者目線で読者向けに整理します。
ルール:
- 断定的な評価語を避ける（「悪い」「問題だ」等は使わない）
- 事実と出典（国会・日付・発言者）を必ず明示する
- 議事録の生テキストをそのまま使わない（平易語で要約して「」に入れる）
- 日本語のみで出力する
- 指示された出力形式のみを返す（説明文・前置き不要）`;

  const userPrompt = `記事「${title}」の【${sectionId}】セクションを修正してください。

【オーナーの指示】
${instruction}

【記事データ】
- タイトル: ${title}
- 主要答弁: ${speaker}（${party}）${date}「${excerpt}」
- タイムライン:
${tl}
- 現在の内容:
${current || "（未入力）"}

【出力形式】
${format}
形式通りに出力してください。余計な説明は不要です。`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
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
  let next = article;

  if (job.sectionId === "stance") {
    const matrixPath = policyMatrixPath(article, job.slug);
    const matrixMeta = await fetchGhFile(token, matrixPath);
    if (!matrixMeta?.content) throw new Error("policy-matrix JSON が見つかりません");
    const matrix = JSON.parse(decodeGitHubBase64Utf8(matrixMeta.content));
    const nextMatrix = applyStanceProposal(matrix, job.proposal?.after || "");
    await putGhFile(
      token,
      matrixPath,
      nextMatrix,
      matrixMeta.sha,
      `article revise apply stance: ${job.slug}`,
    );
  } else {
    next = applyProposalToArticle(article, job.sectionId, job.proposal?.after || "");
    await putGhFile(token, articlePath, next, articleMeta.sha, `article revise apply: ${job.slug} ${job.sectionId}`);
  }

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

  const deployTriggered = await triggerDeployWorkflow(token);
  return {
    ok: true,
    job,
    deployTriggered,
    message: deployTriggered
      ? "記事JSONを保存しました。サイト反映はデプロイ完了後（約3〜5分）。"
      : "記事JSONを保存しました。サイト反映は次のデプロイまで待ちます。",
  };
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

async function loadPolicyMatrix(token, slug, article) {
  const matrixPath = policyMatrixPath(article, slug);
  const meta = await fetchGhFile(token, matrixPath);
  if (!meta?.content) return null;
  return JSON.parse(decodeGitHubBase64Utf8(meta.content));
}

function policyMatrixPath(article, slug) {
  const sm = article?.stanceMatrix;
  if (sm?.dataPath) return sm.dataPath.replace(/^\//, "");
  if (sm?.policySlug) return `data/policy-matrix/${sm.policySlug}.json`;
  return `data/policy-matrix/${slug}.json`;
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

/** 保存後すぐ本番HTMLを更新するため deploy.yml を起動 */
async function triggerDeployWorkflow(token) {
  try {
    const res = await fetch(
      "https://api.github.com/repos/jin-log/kokkai-voice/actions/workflows/deploy.yml/dispatches",
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (res.status === 204) return true;
    console.warn(`deploy dispatch ${res.status}: ${await res.text()}`);
    return false;
  } catch (err) {
    console.warn("deploy dispatch failed:", err);
    return false;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
