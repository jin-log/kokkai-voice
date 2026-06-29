/**
 * 起動期 X 投稿ログ（昼3選 + 夜単体）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOG_PATH = path.join(root, "data/x-post-log.json");

export function todayJst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export async function readXPostLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8"));
  } catch {
    return { digest: [], hot: [] };
  }
}

export async function writeXPostLog(log) {
  await writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

/** @param {Awaited<ReturnType<typeof readXPostLog>>} log */
export function digestPostedToday(log, day = todayJst()) {
  return log.digest?.some((p) => p.date === day) ?? false;
}

/** @param {Awaited<ReturnType<typeof readXPostLog>>} log */
export function hotPostedToday(log, day = todayJst()) {
  return log.hot?.some((p) => p.date === day) ?? false;
}

/** @param {Awaited<ReturnType<typeof readXPostLog>>} log */
export function todayDigestSlugs(log, day = todayJst()) {
  const entry = log.digest?.find((p) => p.date === day);
  return new Set(entry?.slugs ?? []);
}

/** @param {Awaited<ReturnType<typeof readXPostLog>>} log */
export function postsTodayCount(log, day = todayJst()) {
  let n = 0;
  if (digestPostedToday(log, day)) n += 1;
  if (hotPostedToday(log, day)) n += 1;
  return n;
}

/** 5日以内に3選に出た slug */
export function recentlyInDigest(log, days = 5) {
  const since = Date.now() - days * 86400000;
  const set = new Set();
  for (const p of log.digest ?? []) {
    if (new Date(p.postedAt).getTime() >= since) {
      for (const s of p.slugs ?? []) set.add(s);
    }
  }
  return set;
}
