/**
 * ローカル dev 用 /api/article-revisions
 * data/article-revisions.json と data/articles/*.json へ直接書き込む。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyProposalToArticle,
  createRevisionJob,
  normalizeRevisionStore,
} from "../functions/lib/article-revisions-core.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const revisionsPath = path.join(root, "data/article-revisions.json");

/** @returns {import('vite').Plugin} */
export function articleRevisionsDevApi() {
  return {
    name: "article-revisions-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "", "http://localhost");
        if (url.pathname !== "/api/article-revisions") return next();

        try {
          if (req.method === "GET") {
            const pin = url.searchParams.get("pin");
            if (pin !== "1192") return send(res, { error: "unauthorized" }, 401);
            const slug = url.searchParams.get("slug") || "";
            const store = await loadStore();
            const jobs = slug ? store.jobs.filter((j) => j.slug === slug) : store.jobs;
            return send(res, { ok: true, jobs, rules: store.rules });
          }

          if (req.method !== "POST") return send(res, { error: "Method Not Allowed" }, 405);
          const body = await readBody(req);
          if (body.pin !== "1192") return send(res, { error: "unauthorized" }, 401);

          const action = body.action || "create";
          if (action === "create") return send(res, await createJob(body));
          if (action === "apply") return send(res, await applyJob(body));
          if (action === "reject") return send(res, await rejectJob(body));
          return send(res, { error: `unknown action: ${action}` }, 400);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return send(res, { error: msg }, 500);
        }
      });
    },
  };
}

async function createJob(body) {
  const slug = String(body.slug || "").trim();
  const sectionId = String(body.sectionId || "").trim();
  const instruction = String(body.instruction || "").trim();
  if (!slug || !sectionId || !instruction) throw new Error("slug, sectionId, instruction は必須です");

  const article = await loadArticle(slug);
  const job = createRevisionJob({
    article,
    slug,
    sectionId,
    instruction,
    current: body.current || "",
  });
  const store = await loadStore();
  store.jobs.unshift(job);
  store.generatedAt = new Date().toISOString();
  await saveStore(store);
  return { ok: true, job };
}

async function applyJob(body) {
  const jobId = String(body.jobId || "").trim();
  if (!jobId) throw new Error("jobId は必須です");
  const store = await loadStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("job が見つかりません");
  if (job.status !== "proposed") throw new Error(`この job は保存できません: ${job.status}`);

  const article = await loadArticle(job.slug);
  const next = applyProposalToArticle(article, job.sectionId, job.proposal?.after || "");
  await saveArticle(job.slug, next);

  job.status = "applied";
  job.appliedAt = new Date().toISOString();
  job.updatedAt = job.appliedAt;
  store.rules.unshift({
    id: `rule-${Date.now().toString(36)}`,
    sectionId: job.sectionId,
    instruction: job.instruction,
    createdAt: job.appliedAt,
    sourceJobId: job.id,
  });
  await saveStore(store);
  return { ok: true, job, article: next };
}

async function rejectJob(body) {
  const jobId = String(body.jobId || "").trim();
  if (!jobId) throw new Error("jobId は必須です");
  const store = await loadStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("job が見つかりません");
  job.status = "rejected";
  job.rejectedAt = new Date().toISOString();
  job.updatedAt = job.rejectedAt;
  await saveStore(store);
  return { ok: true, job };
}

async function loadArticle(slug) {
  return JSON.parse(await readFile(path.join(root, "data/articles", `${slug}.json`), "utf8"));
}

async function saveArticle(slug, article) {
  await writeFile(
    path.join(root, "data/articles", `${slug}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
    "utf8",
  );
}

async function loadStore() {
  try {
    return normalizeRevisionStore(JSON.parse(await readFile(revisionsPath, "utf8")));
  } catch {
    return normalizeRevisionStore({});
  }
}

async function saveStore(store) {
  await mkdir(path.dirname(revisionsPath), { recursive: true });
  await writeFile(revisionsPath, `${JSON.stringify(normalizeRevisionStore(store), null, 2)}\n`, "utf8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function send(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
