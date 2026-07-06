/**
 * ショート背景 — 案件・ビート内容に合うストッククリップを選ぶ
 * カタログ: data/short-stock-clips.json
 */
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

/** @typedef {{ id: string, label: string, tags: string[], vertical?: string, horizontal?: string }} ClipEntry */

/** slug → beatId → clipId（手書き優先） */
/** @type {Record<string, Record<string, string>>} */
export const SLUG_BEAT_CLIPS = {
  "komei-kokumin": {
    hook: "diet-exterior-day",
    enact: "flag-waving",
    digital: "diet-exterior-day",
    school: "diet-exterior-day",
  },
  shoshika: {
    hook: "newborn-sleeping",
    gap: "newborn-sleeping",
    kokkai: "diet-exterior-day",
    why: "newborn-sleeping",
  },
  "shussho-budget-seika": {
    hook: "newborn-sleeping",
    budget: "yen-salary-envelope",
    rate: "newborn-sleeping",
    born: "newborn-sleeping",
  },
  "case-mqzxgs3f": {
    hook: "justice-gavel",
    status: "diet-exterior-day",
    bill: "diet-exterior-day",
    gap: "flag-waving",
  },
  "case-mqwdrley": {
    hook: "justice-gavel",
  },
  "case-mr0jbdpc": {
    hook: "flag-waving",
    paradox: "diet-exterior-day",
    penalty: "justice-gavel",
    status: "flag-waving",
  },
  "osaka-to-metropolis": {
    hook: "osaka-castle",
  },
};

/** @type {{ re: RegExp, clipId: string, score: number }[]} */
const TEXT_RULES = [
  { re: /スパイ防止|スパイ活動|スパイ法制/, clipId: "spy-hoodie", score: 58 },
  { re: /不法移民|不法滞在|オーバーステイ|在留外国/, clipId: "illegal-overstay", score: 55 },
  { re: /大阪都|大阪市|副首都|都構想/, clipId: "osaka-castle", score: 55 },
  { re: /学校教育|大学|学生|教科書|文教/, clipId: "study-school-student", score: 50 },
  { re: /演説|政治家|選挙|知事|首相/, clipId: "politician-speech", score: 48 },
  { re: /刑事|告発|裁判|公選法|スパイ防止|司法/, clipId: "justice-gavel", score: 55 },
  { re: /学校教育|教科書|教員|文部科学|デジタル教科/, clipId: "diet-exterior-day", score: 50 },
  { re: /成立|法案|改正法|附帯決議|憲法/, clipId: "flag-waving", score: 45 },
  { re: /出生率|少子化|こども未来|出生数|合計特殊出生/, clipId: "newborn-sleeping", score: 45 },
  { re: /予算|兆円|歳出|税|給与|年金|物価|3\.6兆/, clipId: "yen-salary-envelope", score: 45 },
  { re: /エネルギ|再エネ|ソーラ|電力|原発|太陽光/, clipId: "solar-energy-field", score: 48 },
  { re: /介護|高齢|医療費|福祉|社会保障/, clipId: "elderly-care", score: 48 },
  { re: /労働|賃金|雇用|最低賃金|インフラ|建設/, clipId: "worker-hardhat", score: 40 },
  { re: /地方創生|ローカル線|交通|地方/, clipId: "train-rural", score: 40 },
  { re: /経済|企業|GDP|ビジネス/, clipId: "businessman-suit", score: 35 },
  { re: /国会|議員|議事堂|政治|都知事|選挙|内閣/, clipId: "diet-exterior-day", score: 35 },
  { re: /子育|こども|子ども/, clipId: "newborn-sleeping", score: 12 },
];

/** @type {Record<string, string>} */
const STYLE_FALLBACK = {
  hook: "diet-exterior-day",
  question: "diet-exterior-day",
  number: "flag-waving",
  body: "diet-exterior-day",
  diet: "diet-exterior-day",
};

/**
 * @param {string} root
 * @returns {Promise<ClipEntry[]>}
 */
export async function loadClipCatalog(root) {
  const manifestPath = path.join(root, "data", "short-stock-clips.json");
  try {
    const raw = JSON.parse(await readFile(manifestPath, "utf8"));
    return (raw.clips ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      tags: c.tags ?? [],
      vertical: c.vertical,
      horizontal: c.horizontal,
    }));
  } catch {
    return [];
  }
}

/**
 * @param {string} root
 * @param {string} clipId
 */
export async function resolveClipPath(root, clipId) {
  const catalog = await loadClipCatalog(root);
  const entry = catalog.find((c) => c.id === clipId);
  /** @type {string[]} */
  const candidates = [];
  if (entry?.vertical) candidates.push(path.join(root, entry.vertical));
  if (entry?.horizontal) candidates.push(path.join(root, entry.horizontal));
  candidates.push(
    path.join(root, "assets", "stock", "clips", "vertical", `${clipId}-vert.mp4`),
    path.join(root, "assets", "stock", "clips", `${clipId}.mp4`),
    path.join(root, "public", "remotion", "clips", `${clipId}-vert.mp4`),
  );

  for (const p of candidates) {
    try {
      await access(p);
      const { size } = await stat(p);
      if (size >= 200_000) return p;
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * @param {ClipEntry[]} catalog
 * @param {string} text
 * @param {Set<string>} usedIds
 */
function scoreCatalogClips(catalog, text, usedIds) {
  /** @type {{ id: string, score: number }[]} */
  const ranked = [];
  for (const clip of catalog) {
    let score = 0;
    for (const tag of clip.tags) {
      if (text.includes(tag)) score += 10;
    }
    for (const rule of TEXT_RULES) {
      if (rule.clipId === clip.id && rule.re.test(text)) score += rule.score;
    }
    if (usedIds.has(clip.id)) score -= 8;
    if (score > 0) ranked.push({ id: clip.id, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/**
 * @param {import('../../src/lib/articles.mjs').Article} article
 * @param {{ id: string, style: string, telop?: string[], narr?: string, bgClipId?: string }} beat
 */
function beatText(article, beat) {
  return [
    article.title,
    article.category,
    article.searchKeyword,
    ...(article.tags ?? []),
    beat.narr,
    ...(beat.telop ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {{
 *   root: string;
 *   article: import('../../src/lib/articles.mjs').Article;
 *   beat: { id: string, style: string, telop?: string[], narr?: string, bgClipId?: string };
 *   usedClipIds?: Set<string>;
 * }} opts
 * @returns {Promise<{ clipId: string, path: string | null, reason: string }>}
 */
export async function pickClipForBeat(opts) {
  const { root, article, beat, usedClipIds = new Set() } = opts;
  const catalog = await loadClipCatalog(root);
  const slug = article.slug;

  const explicit =
    beat.bgClipId ?? SLUG_BEAT_CLIPS[slug]?.[beat.id] ?? null;
  if (explicit) {
    const p = await resolveClipPath(root, explicit);
    if (p) return { clipId: explicit, path: p, reason: "override" };
  }

  const text = beatText(article, beat);
  const ranked = scoreCatalogClips(catalog, text, usedClipIds);
  if (ranked[0]) {
    const p = await resolveClipPath(root, ranked[0].id);
    if (p) return { clipId: ranked[0].id, path: p, reason: `score:${ranked[0].score}` };
  }

  for (const rule of TEXT_RULES) {
    if (!rule.re.test(text)) continue;
    const p = await resolveClipPath(root, rule.clipId);
    if (p && !usedClipIds.has(rule.clipId)) {
      return { clipId: rule.clipId, path: p, reason: "rule" };
    }
  }

  const styleId = STYLE_FALLBACK[beat.style] ?? "diet-exterior-day";
  const stylePath = await resolveClipPath(root, styleId);
  if (stylePath) return { clipId: styleId, path: stylePath, reason: "style-fallback" };

  for (const clip of catalog) {
    const p = await resolveClipPath(root, clip.id);
    if (p && !usedClipIds.has(clip.id)) {
      return { clipId: clip.id, path: p, reason: "catalog-fallback" };
    }
  }

  return { clipId: styleId, path: null, reason: "missing" };
}
