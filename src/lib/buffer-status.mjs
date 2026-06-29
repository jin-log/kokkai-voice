/**
 * Buffer 連携状態 — 管理画面・public JSON
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBufferConnection, loadBufferApiKey, loadBufferChannelId } from "./buffer-api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const DATA_PATH = path.join(root, "data/buffer-status.json");
const PUBLIC_PATH = path.join(root, "public/buffer-status.json");

/** @returns {Promise<object>} */
export async function loadBufferStatusFile() {
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf8"));
  } catch {
    return defaultBufferStatus();
  }
}

export function defaultBufferStatus() {
  return {
    updatedAt: null,
    configured: false,
    ok: false,
    status: "not_configured",
    statusLabel: "未設定",
    message: "Buffer API キー未設定",
    channelId: null,
    channelName: null,
    lastCheckAt: null,
    lastCheckOk: false,
    lastPostAt: null,
    lastPostSlug: null,
    lastPostOk: null,
    lastPostError: null,
    postsToday: 0,
    dailyCap: 3,
    recentPosts: [],
    fixSteps: ["docs/buffer-setup.md を参照"],
  };
}

/** @param {object} patch */
export async function saveBufferStatus(patch) {
  const prev = await loadBufferStatusFile();
  const next = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await mkdir(path.dirname(PUBLIC_PATH), { recursive: true });
  await writeFile(PUBLIC_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

/** @param {object} [opts] */
export async function refreshBufferStatus(opts = {}) {
  const apiKey = opts.apiKey ?? loadBufferApiKey();
  const channelId = opts.channelId ?? loadBufferChannelId();
  const check = await checkBufferConnection(apiKey, channelId || undefined);
  const prev = await loadBufferStatusFile();

  return saveBufferStatus({
    ...check,
    lastCheckAt: new Date().toISOString(),
    lastCheckOk: check.ok,
    channelId: check.channelId ?? prev.channelId,
    channelName: check.channelName ?? prev.channelName,
    recentPosts: prev.recentPosts ?? [],
    postsToday: prev.postsToday ?? 0,
    dailyCap: prev.dailyCap ?? 3,
    lastPostAt: prev.lastPostAt,
    lastPostSlug: prev.lastPostSlug,
    lastPostOk: prev.lastPostOk,
    lastPostError: prev.lastPostError,
  });
}

/**
 * @param {{ slug: string, ok: boolean, postId?: string, error?: string }} entry
 */
export async function recordBufferPost(entry) {
  const prev = await loadBufferStatusFile();
  const today = new Date().toISOString().slice(0, 10);
  const postsToday =
    prev.postsTodayDate === today ? (prev.postsToday ?? 0) + (entry.ok ? 1 : 0) : entry.ok ? 1 : 0;

  /** @type {object[]} */
  const recentPosts = [
    {
      slug: entry.slug,
      at: new Date().toISOString(),
      ok: entry.ok,
      postId: entry.postId ?? null,
      error: entry.error ?? null,
    },
    ...(prev.recentPosts ?? []),
  ].slice(0, 20);

  const patch = {
    lastPostAt: new Date().toISOString(),
    lastPostSlug: entry.slug,
    lastPostOk: entry.ok,
    lastPostError: entry.ok ? null : entry.error ?? "unknown",
    postsToday,
    postsTodayDate: today,
    recentPosts,
  };

  if (!entry.ok) {
    patch.ok = false;
    patch.status = "post_failed";
    patch.statusLabel = "投稿失敗";
    patch.message = entry.error ?? "直近の X 投稿に失敗しました";
    patch.fixSteps = [
      "Buffer で X チャンネルが切断されていないか確認",
      "管理画面「Buffer連携」で再チェック",
      "docs/buffer-setup.md",
    ];
  }

  return saveBufferStatus(patch);
}
