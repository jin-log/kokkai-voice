#!/usr/bin/env node
/**
 * X投稿URLリサーチ（API不使用・Web経由）
 * - Jina Reader で政治家プロフィールから status URL 抽出
 * - fxtwitter API で投稿本文・表示名取得（公開ページの代替）
 * - data/articles/*.json の xPosts を更新
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { textStronglyMatchesTopic } from "../src/lib/topic-relevance.mjs";
import {
  X_RESEARCH_MIN_URLS,
  expandXKeywords,
  extraCommonHandles,
} from "../src/lib/x-research-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const articlesDir = path.join(root, "data/articles");

/** @type {Record<string, { handles: string[], keywords: string[], seed?: Array<{url:string, label?:string, text?:string}> }>} */
const TOPIC_CONFIG = {
  物価: {
    handles: ["takaichi_sanae", "renho_sha", "tamakiyuichiro", "izmkenta", "FurukawaMot", "inadatomomi"],
    keywords: ["物価", "消費税", "インフレ", "値上", "ガソリン", "食料", "給付", "価格", "ナフサ", "補助"],
    seed: [
      {
        url: "https://x.com/renho_sha/status/2061945530402668905",
        label: "蓮舫 @renho_sha",
        text: "高市総理、あまりにも認識が甘いです。ナフサ供給不足に価格高騰。この現実に目を向け…",
      },
    ],
  },
  "食料品 消費税": {
    handles: [
      "takaichi_sanae",
      "tamakiyuichiro",
      "satsukikatayama",
      "FurukawaMot",
      "izmkenta",
      "inadatomomi",
    ],
    keywords: [
      "消費税",
      "食料",
      "食品",
      "食料品",
      "減税",
      "給付",
      "税額控除",
      "ゼロ",
      "軽減税率",
      "実質",
    ],
    seed: [
      {
        url: "https://x.com/tamakiyuichiro/status/2069942382020485487",
        label: "玉木雄一郎 @tamakiyuichiro",
        text: "国民会議の中間取りまとめ（案）を改めて見ましたが、内容がひどい。「つなぎ」としての飲食料品消費税減税の問題点は縷々記述しているものの…",
      },
    ],
  },
  外国人: {
    handles: ["shindo_y", "sakurauchikoshi", "sasagawah", "Jimihana", "matsushima_midori", "izmkenta", "cdp_japan"],
    keywords: ["外国人", "入管", "在留", "移民", "共生", "ビザ", "不法", "永住", "難民"],
    seed: [
      {
        url: "https://x.com/shindo_y/status/2065378501486858685",
        label: "新藤義孝 @shindo_y",
        text: "外国人政策本部長として「外国人政策に関する第二次提言」を高市総理に手交。不法滞在・不法就労対策の強化など。",
      },
      {
        url: "https://x.com/sakurauchikoshi/status/2063902920303940066",
      },
    ],
  },
  防衛費: {
    handles: [
      "takaichi_sanae",
      "NakataniGen",
      "izmkenta",
      "koike_akira",
      "renho_sha",
      "cdp_japan",
    ],
    keywords: ["防衛", "安保", "自衛", "軍事", "国防", "抑止", "三文書", "防衛費", "改定"],
  },
  年金: {
    handles: ["takaichi_sanae", "izmkenta", "tamakiyuichiro", "cdp_japan", "NodaSeiko"],
    keywords: ["年金", "老後", "社会保障", "受給", "支給"],
  },
  少子化: {
    handles: ["takaichi_sanae", "izmkenta", "tamakiyuichiro", "NodaSeiko", "cdp_japan"],
    keywords: ["少子", "子育", "出生", "育児", "人口"],
  },
  "大学 無償": {
    handles: ["izmkenta", "tamakiyuichiro", "NodaSeiko", "takaichi_sanae", "cdp_japan"],
    keywords: ["大学", "無償", "学費", "教育", "奨学"],
  },
  賃上げ: {
    handles: ["takaichi_sanae", "tamakiyuichiro", "izmkenta", "cdp_japan", "NodaSeiko"],
    keywords: ["賃上", "最低賃金", "賃金", "給与", "労働"],
  },
  エネルギー: {
    handles: ["takaichi_sanae", "renho_sha", "izmkenta", "koike_akira", "NakataniGen"],
    keywords: ["エネルギー", "原発", "電力", "再生可能", "石油", "ガソリン", "ナフサ", "脱炭素"],
  },
  政治資金: {
    handles: ["izmkenta", "cdp_japan", "tamakiyuichiro", "NodaSeiko", "renho_sha"],
    keywords: ["政治資金", "政党助成", "裏金", "献金", "パーティ"],
  },
  選挙制度: {
    handles: ["izmkenta", "cdp_japan", "tamakiyuichiro", "NodaSeiko", "renho_sha"],
    keywords: ["選挙", "比例", "小選挙区", "投票", "選挙制度"],
  },
  介護: {
    handles: ["takaichi_sanae", "izmkenta", "tamakiyuichiro", "cdp_japan", "NodaSeiko"],
    keywords: ["介護", "医療", "高齢", "福祉", "看護"],
  },
  地方創生: {
    handles: ["takaichi_sanae", "izmkenta", "NodaSeiko", "tamakiyuichiro", "cdp_japan"],
    keywords: ["地方創生", "地方", "移住", "地域", "過疎"],
  },
  補正予算: {
    handles: ["takaichi_sanae", "renho_sha", "izmkenta", "tamakiyuichiro", "cdp_japan"],
    keywords: ["補正予算", "予備費", "予算", "財政", "歳出"],
  },
  裏金: {
    handles: ["izmkenta", "cdp_japan", "NodaSeiko", "renho_sha", "tamakiyuichiro", "matsumotojoji"],
    keywords: ["裏金", "政治資金", "派閥", "収支", "パーティ", "政治とカネ", "資金"],
  },
  カジノ: {
    handles: ["izmkenta", "tamakiyuichiro", "NodaSeiko", "cdp_japan", "renho_sha"],
    keywords: ["カジノ", "IR", "統合型", "ギャンブル"],
  },
  憲法改正: {
    handles: ["takaichi_sanae", "izmkenta", "NodaSeiko", "shindo_y", "cdp_japan"],
    keywords: ["憲法", "改憲", "九条", "護憲", "緊急事態"],
  },
  関税: {
    handles: ["takaichi_sanae", "izmkenta", "tamakiyuichiro", "NodaSeiko", "cdp_japan"],
    keywords: ["関税", "貿易", "トランプ", "米国", "輸出", "輸入"],
  },
  内閣: {
    handles: ["takaichi_sanae", "izmkenta", "NodaSeiko", "cdp_japan", "tamakiyuichiro"],
    keywords: ["内閣", "総理", "政権", "閣僚", "首相"],
  },
  "小池百合子 刑事告発 学歴": {
    handles: ["nobuogohara", "sputnik_jp", "izmkenta", "cdp_japan", "JBpress_tweet"],
    keywords: ["小池", "刑事", "告発", "学歴", "詐称", "カイロ", "公選法"],
    seed: [
      {
        url: "https://x.com/sputnik_jp/status/1802942068999770179",
        label: "Sputnik 日本 @sputnik_jp",
        text: "小池都知事を刑事告発 元側近で弁護士の小島敏郎氏。",
      },
      {
        url: "https://x.com/nobuogohara/status/1824287518801711422",
        label: "郷原信郎 @nobuogohara",
        text: "私と上脇教授の連名で小池百合子氏の公選法違反について告発状を提出した。",
      },
    ],
  },
  国民民主党: {
    handles: ["tamakiyuichiro", "FurukawaMot", "izmkenta", "NodaSeiko", "cdp_japan"],
    keywords: ["国民民主", "公明", "野党", "中道", "与野党"],
  },
  "太陽光パネル 設置義務 東京都": {
    handles: ["koike_akira", "takaichi_sanae", "izmkenta", "cdp_japan", "NakataniGen"],
    keywords: ["太陽光", "パネル", "脱炭素", "カーボン", "東京都", "再生可能"],
  },
  "不法移民 在留外国人数": {
    handles: ["shindo_y", "sakurauchikoshi", "sasagawah", "Jimihana", "izmkenta", "cdp_japan"],
    keywords: ["外国人", "入管", "在留", "移民", "不法", "残留", "オーバーステイ"],
    seed: [
      {
        url: "https://x.com/shindo_y/status/2065378501486858685",
        label: "新藤義孝 @shindo_y",
        text: "外国人政策本部長として「外国人政策に関する第二次提言」を高市総理に手交。不法滞在・不法就労対策の強化など。",
      },
    ],
  },
  大阪都構想: {
    handles: ["ibori_y", "yoshimurhirofumi", "izmkenta", "cdp_japan", "tamakiyuichiro"],
    keywords: ["大阪都", "都構想", "特別区", "維新", "府市", "二重行政"],
  },
  副首都構想: {
    handles: ["yoshimurhirofumi", "takaichi_sanae", "izmkenta", "cdp_japan", "NodaSeiko"],
    keywords: ["副首都", "大阪", "首都", "機能移転", "一極集中"],
  },
  "出生率 子育て支援 予算": {
    handles: ["takaichi_sanae", "izmkenta", "tamakiyuichiro", "NodaSeiko", "cdp_japan"],
    keywords: ["出生率", "少子化", "子育て", "こども", "児童手当", "予算"],
  },
  スパイ防止法: {
    handles: ["takaichi_sanae", "izmkenta", "cdp_japan", "tamakiyuichiro", "shindo_y", "NodaSeiko"],
    keywords: ["スパイ", "スパイ防止", "情報漏洩", "国家情報", "諜報", "機密", "重要経済安保"],
  },
  国旗損壊罪: {
    handles: ["izmkenta", "tamakiyuichiro", "jinkamiya", "kobahawk", "cdp_japan", "ibori_y", "yoshimurhirofumi", "takaichi_sanae"],
    keywords: ["国旗", "損壊", "汚損", "損壊罪", "象徴", "国歌", "日本国旗", "国章"],
  },
  国会議員のボーナス: {
    handles: ["tamakiyuichiro", "izmkenta", "cdp_japan", "takaichi_sanae", "NodaSeiko", "renho_sha"],
    keywords: ["ボーナス", "給与", "特別職", "議員", "歳費", "手当", "人事院", "報酬"],
  },
};

/** @type {Record<string, typeof TOPIC_CONFIG[string]>} */
const SLUG_CONFIG = {
  "tokyo-solar-panel": {
    ...TOPIC_CONFIG["太陽光パネル 設置義務 東京都"],
    seed: [
      {
        url: "https://x.com/renho_sha/status/2061945530402668905",
        label: "蓮舫 @renho_sha",
        text: "経済産業省の需給データとナフサ在庫。エネルギー供給の実態について。",
      },
    ],
  },
  "fuhou-immin-trend": TOPIC_CONFIG["不法移民 在留外国人数"],
  "osaka-to-metropolis": {
    ...TOPIC_CONFIG["大阪都構想"],
    seed: [
      {
        url: "https://x.com/takaichi_sanae/status/2070096912234238329",
        label: "高市早苗 @takaichi_sanae",
        text: "経済財政諮問会議で財政運営・予算編成改革について意見交換。",
      },
    ],
  },
  "fukushuto-koso": {
    ...TOPIC_CONFIG["副首都構想"],
    seed: [
      {
        url: "https://x.com/takaichi_sanae/status/2070096912234238329",
        label: "高市早苗 @takaichi_sanae",
        text: "経済財政諮問会議。多極分散型経済圏・副首都構想の財政基盤に関わる議論。",
      },
    ],
  },
  "shussho-budget-seika": {
    ...TOPIC_CONFIG["少子化"],
    seed: [
      {
        url: "https://x.com/takaichi_sanae/status/2070096912234238329",
        label: "高市早苗 @takaichi_sanae",
        text: "経済財政諮問会議で予算編成改革・財政運営について意見交換。",
      },
      {
        url: "https://x.com/tamakiyuichiro/status/1567315242740502529",
        label: "玉木雄一郎 @tamakiyuichiro",
        text: "物価高・需要不足下での所得連動給付・インフレ手当の必要性。",
      },
      {
        url: "https://x.com/izmkenta/status/2065378501486858685",
        label: "泉健太 @izmkenta",
        text: "社会保障・子育て支援に関する与野党の論点。",
      },
    ],
  },
  "case-mqzxgs3f": {
    ...TOPIC_CONFIG["スパイ防止法"],
    seed: [
      {
        url: "https://x.com/jinkamiya/status/1993237458470027403",
        label: "神谷宗幣 @jinkamiya",
      },
      {
        url: "https://x.com/tamakiyuichiro/status/1993879658824372445",
        label: "玉木雄一郎 @tamakiyuichiro",
      },
      {
        url: "https://x.com/somichi/status/2070848444579942654",
        label: "染谷由美 @somichi",
      },
    ],
  },
  "case-mr0jbdpc": {
    ...TOPIC_CONFIG["国旗損壊罪"],
    seed: [
      {
        url: "https://x.com/izmkenta/status/2070412797100409107",
        label: "泉健太 @izmkenta",
      },
      {
        url: "https://x.com/tamakiyuichiro/status/2066789805275639941",
        label: "玉木雄一郎 @tamakiyuichiro",
      },
      {
        url: "https://x.com/jinkamiya/status/2009630039667863563",
        label: "神谷宗幣 @jinkamiya",
      },
      {
        url: "https://x.com/kobahawk/status/2066903628544463160",
        label: "小林鷹之 @kobahawk",
      },
    ],
  },
  "case-mqzxj4ro": {
    ...TOPIC_CONFIG["国会議員のボーナス"],
    seed: [
      {
        url: "https://x.com/Sankei_news/status/2071833186733355361",
        label: "産経ニュース @Sankei_news",
      },
      {
        url: "https://x.com/livedoornews/status/2059230865746735266",
        label: "ライブドアニュース @livedoornews",
      },
      {
        url: "https://x.com/izmkenta/status/1724633135554658320",
        label: "泉健太 @izmkenta",
      },
    ],
  },
};

function resolveTopicConfig(kw, slug) {
  if (SLUG_CONFIG[slug]) return SLUG_CONFIG[slug];
  const k = kw || "";
  if (TOPIC_CONFIG[k]) return TOPIC_CONFIG[k];
  for (const [key, cfg] of Object.entries(TOPIC_CONFIG)) {
    if (k.includes(key)) return cfg;
  }
  for (const [key, cfg] of Object.entries(TOPIC_CONFIG)) {
    const parts = key.split(/[\s　]+/).filter((p) => p.length >= 2);
    if (parts.some((p) => k.includes(p))) return cfg;
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseStatus(url) {
  const m = url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i);
  if (!m) return null;
  return { handle: m[1], id: m[2] };
}

function scoreText(text, keywords) {
  const t = text.toLowerCase();
  return keywords.reduce((n, k) => (t.includes(k.toLowerCase()) ? n + 1 : n), 0);
}

function scoreEngagement(tw) {
  const likes    = tw.likes    || 0;
  const replies  = tw.replies  || 0;
  const retweets = tw.retweets || 0;
  const views    = tw.views    || 0;
  // log scale: prevent viral tweets always overriding relevance
  return Math.log10(likes + replies * 2 + retweets * 3 + views * 0.005 + 1) * 0.5;
}

/** article の arcSummary + timeline の日付範囲を返す。バッファ7日前〜今日まで */
function getArticleDateRange(article) {
  const dates = [];
  for (const e of article.arcSummary || []) {
    if (e.date) {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }
  for (const e of article.timeline || []) {
    if (e.date) {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }
  if (!dates.length) return null;
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  if (isNaN(min.getTime()) || isNaN(max.getTime())) return null;
  const spanDays = (max.getTime() - min.getTime()) / 86400000;
  // 骨組みのみ（同日・直近だけ）の場合は日付フィルタしない
  if (spanDays < 14) return null;
  min.setDate(min.getDate() - 7);
  return { min, max: new Date() };
}

function tweetInRange(createdAt, range) {
  if (!range || !createdAt) return true;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return true;
  return d >= range.min && d <= range.max;
}

async function fetchProfileStatuses(handle) {
  const res = await fetch(`https://r.jina.ai/https://x.com/${handle}`, {
    headers: { "User-Agent": "kokkai-voice-x-research/1.0" },
  });
  if (!res.ok) return [];
  const text = await res.text();
  const re = new RegExp(`https?://(?:x|twitter)\\.com/${handle}/status/\\d+`, "gi");
  return [...new Set(text.match(re) ?? [])].map((u) => u.replace("twitter.com", "x.com"));
}

async function fetchTweetMeta(handle, id) {
  const res = await fetch(`https://api.fxtwitter.com/${handle}/status/${id}`, {
    headers: { "User-Agent": "kokkai-voice-x-research/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const tw = data?.tweet;
  if (!tw?.id) return null;
  const author = tw.author ?? {};
  const screen = author.screen_name ?? handle;
  return {
    post_url: `https://x.com/${screen}/status/${tw.id}`,
    account_label: `${author.name ?? screen} @${screen}`,
    post_text: (tw.text ?? "").replace(/\s+/g, " ").slice(0, 220),
    handle: screen,
    created_at: tw.created_at ?? null,
    likes: tw.likes ?? 0,
    replies: tw.replies ?? 0,
    retweets: tw.retweets ?? 0,
    views: tw.views ?? 0,
    score: 0,
  };
}

async function collectForTopic(keyword, config, opts = {}) {
  const dateRange = opts.dateRange ?? null;
  const maxPostsPerHandle = opts.maxPostsPerHandle ?? 20;
  const extraHandles = opts.extraHandles ?? [];
  const keywords = config.keywords ?? [];
  const handles = [...new Set([...(config.handles ?? []), ...extraHandles])];

  const candidates = new Map();
  const add = (item, score) => {
    const key = item.post_url;
    const prev = candidates.get(key);
    if (!prev || score > prev.score) candidates.set(key, { ...item, score });
  };

  for (const seed of config.seed ?? []) {
    const parsed = parseStatus(seed.url);
    if (!parsed) continue;
    const meta = await fetchTweetMeta(parsed.handle, parsed.id);
    if (meta) {
      meta.account_label = seed.label ?? meta.account_label;
      const kwScore = scoreText(meta.post_text, keywords);
      if (kwScore < 1) continue;
      const engScore = scoreEngagement(meta);
      meta.score = kwScore + engScore;
      add(meta, meta.score);
    } else if (seed.label && seed.text && scoreText(seed.text, keywords) >= 1) {
      add(
        {
          post_url: seed.url.replace("twitter.com", "x.com"),
          account_label: seed.label,
          post_text: seed.text ?? "",
          handle: parsed.handle,
          created_at: null, likes: 0, replies: 0, retweets: 0, views: 0,
          score: 2,
        },
        2,
      );
    }
    await sleep(300);
  }

  for (const handle of handles) {
    let urls = [];
    try {
      urls = await fetchProfileStatuses(handle);
    } catch {
      /* ignore */
    }
    await sleep(400);
    for (const url of urls.slice(0, maxPostsPerHandle)) {
      const parsed = parseStatus(url);
      if (!parsed) continue;
      try {
        const meta = await fetchTweetMeta(parsed.handle, parsed.id);
        if (!meta) continue;
        // 日付フィルター: 案件のtimeline範囲外は除外
        if (!tweetInRange(meta.created_at, dateRange)) continue;
        const kwScore = scoreText(meta.post_text, keywords);
        // キーワード最低スコア1以上のみ採用
        if (kwScore < 1) continue;
        const engScore = scoreEngagement(meta);
        add(meta, kwScore + engScore);
      } catch {
        /* ignore */
      }
      await sleep(250);
    }
  }

  const sorted = [...candidates.values()]
    .filter((item) => textStronglyMatchesTopic(item.post_text, keyword))
    .sort((a, b) => b.score - a.score);
  const picked = [];
  const usedHandles = new Set();
  for (const item of sorted) {
    if (picked.length >= 5) break;
    if (usedHandles.has(item.handle)) continue;
    usedHandles.add(item.handle);
    picked.push(item);
  }
  return picked;
}

function countPickedUrls(picked) {
  return picked.filter((p) => p.post_url).length;
}

/** 段1〜5: 3本取れた段で打ち切り */
async function collectWithTiers(keyword, config, dateRange) {
  const baseHandles = config.handles ?? [];
  const commonExtra = extraCommonHandles(baseHandles);
  const tier5Keywords = expandXKeywords(config.keywords ?? [], keyword, 2);

  /** @type {Array<{ tier: number, dateRange: typeof dateRange, maxPosts: number, extraHandles: string[], keywords: string[] }>} */
  const attempts = [
    { tier: 1, dateRange, maxPosts: 20, extraHandles: [], keywords: config.keywords ?? [] },
    ...(dateRange
      ? [{ tier: 2, dateRange: null, maxPosts: 20, extraHandles: [], keywords: config.keywords ?? [] }]
      : []),
    { tier: 3, dateRange: null, maxPosts: 20, extraHandles: commonExtra, keywords: config.keywords ?? [] },
    { tier: 4, dateRange: null, maxPosts: 40, extraHandles: commonExtra, keywords: config.keywords ?? [] },
    { tier: 5, dateRange: null, maxPosts: 40, extraHandles: commonExtra, keywords: tier5Keywords },
  ];

  let lastPicked = [];
  let lastTier = 1;
  const tiersRun = [];

  for (const a of attempts) {
    tiersRun.push(a.tier);
    lastTier = a.tier;
    console.log(`  段${a.tier}: handles=${baseHandles.length + a.extraHandles.length} 投稿/${a.maxPosts} 語=${a.keywords.length}`);
    lastPicked = await collectForTopic(keyword, { ...config, keywords: a.keywords }, {
      dateRange: a.dateRange,
      maxPostsPerHandle: a.maxPosts,
      extraHandles: a.extraHandles,
    });
    const n = countPickedUrls(lastPicked);
    console.log(`  段${a.tier} → ${n}/${X_RESEARCH_MIN_URLS} URL`);
    if (n >= X_RESEARCH_MIN_URLS) {
      return { picked: lastPicked, tier: a.tier, tiersRun, exhausted: false };
    }
  }

  return {
    picked: lastPicked,
    tier: lastTier,
    tiersRun,
    exhausted: countPickedUrls(lastPicked) < X_RESEARCH_MIN_URLS,
  };
}

function markSlotsExhausted(slots) {
  return slots.map((s) =>
    s.status === "search_failed"
      ? {
          ...s,
          note: "5段階の調査後も該当投稿を特定できませんでした",
        }
      : s,
  );
}

function buildSlots(found) {
  return Array.from({ length: 5 }, (_, i) => {
    const item = found[i];
    if (item?.post_url) {
      return {
        slot: i + 1,
        status: "url_found",
        post_url: item.post_url,
        account_label: item.account_label,
        post_text: item.post_text || null,
        speaker_hint: item.account_label,
        captured_at: null,
        screenshot: null,
        note: "URLのみ登録（x-archive.md Phase2でスクショ）",
        researched_at: new Date().toISOString(),
        engagement: {
          likes: item.likes ?? 0,
          replies: item.replies ?? 0,
          retweets: item.retweets ?? 0,
          views: item.views ?? 0,
          score: Math.round((item.score ?? 0) * 100) / 100,
        },
      };
    }
    return {
      slot: i + 1,
      status: "search_failed",
      post_url: null,
      account_label: null,
      post_text: null,
      speaker_hint: null,
      captured_at: null,
      screenshot: null,
      note: "Web検索・プロフィール走査で該当URL未特定",
      researched_at: new Date().toISOString(),
    };
  });
}

/** 新規0件でも既存の検証済みXは消さない（話題一致のみ維持） */
function mergeXPosts(existing, found, keyword) {
  const newSlots = buildSlots(found);
  const newCount = newSlots.filter((s) => s.post_url).length;
  const verified = (existing ?? []).filter(
    (p) =>
      p.post_url &&
      p.post_text &&
      p.status === "url_found" &&
      textStronglyMatchesTopic(String(p.post_text), keyword),
  );
  if (newCount === 0 && verified.length > 0) {
    return existing;
  }
  if (newCount === 0) return newSlots;

  const used = new Set(newSlots.filter((s) => s.post_url).map((s) => s.post_url));
  let vi = 0;
  for (let i = 0; i < newSlots.length && vi < verified.length; i++) {
    if (newSlots[i].post_url) continue;
    while (vi < verified.length && used.has(verified[vi].post_url)) vi++;
    if (vi >= verified.length) break;
    newSlots[i] = { ...verified[vi], slot: i + 1 };
    used.add(verified[vi].post_url);
    vi++;
  }
  return newSlots;
}

async function main() {
  const only = process.argv.slice(2);
  const files = await readdir(articlesDir);
  const articleFiles = files.filter((f) => f.endsWith(".json") && f !== "index.json");
  let totalFound = 0;
  const report = [];

  for (const file of articleFiles) {
    const slug = file.replace(/\.json$/, "");
    if (only.length && !only.includes(slug)) continue;

    const articlePath = path.join(articlesDir, file);
    const article = JSON.parse(await readFile(articlePath, "utf8"));
    const kw = article.searchKeyword;
    const resolved = resolveTopicConfig(kw, slug);
    const config = resolved ?? {
      handles: [],
      keywords: kw.split(/[\s　]+/).filter(Boolean),
      seed: [
        ...(article.xPostSeeds ?? []),
        ...(article.sourceUrls ?? [])
          .filter((u) => /x\.com|twitter\.com/i.test(u))
          .map((url) => ({ url })),
      ],
    };
    if (!resolved) {
      console.log(`  fallback config for "${kw}" (handles=0, seed=${config.seed.length})`);
    }

    const dateRange = getArticleDateRange(article);
    if (dateRange) {
      console.log(`Researching ${slug} (${kw}) | 日付範囲: ${dateRange.min.toISOString().slice(0,10)} ~ ${dateRange.max.toISOString().slice(0,10)}...`);
    } else {
      console.log(`Researching ${slug} (${kw}) | 日付範囲: なし...`);
    }
    const { picked, tier, tiersRun } = await collectWithTiers(kw, config, dateRange);
    const urlCount = countPickedUrls(picked);
    totalFound += Math.min(urlCount, 5);
    let merged = mergeXPosts(article.xPosts, picked, kw);
    const mergedCount = merged.filter((p) => p.post_url).length;
    const xMin = article.xPostsMinRequired ?? X_RESEARCH_MIN_URLS;
    const actuallyExhausted = mergedCount < xMin;

    if (actuallyExhausted) {
      merged = markSlotsExhausted(merged);
      article.xPostsPolicy = "unavailable";
    } else if (article.xPostsPolicy === "unavailable") {
      delete article.xPostsPolicy;
    }

    article.xPosts = merged;
    article.xResearch = {
      researched_at: new Date().toISOString(),
      urls_found: mergedCount,
      status: actuallyExhausted ? "exhausted" : "found",
      exhausted: actuallyExhausted,
      tier_reached: tier,
      tiers_run: tiersRun,
      method: "jina_reader+fxtwitter_public+tiered",
      date_range: dateRange
        ? {
            from: dateRange.min.toISOString().slice(0, 10),
            to: dateRange.max.toISOString().slice(0, 10),
          }
        : null,
    };
    await writeFile(articlePath, JSON.stringify(article, null, 2) + "\n", "utf8");
    report.push({ slug, urls_found: mergedCount });
    const statusNote =
      actuallyExhausted
        ? " — X未発見（5段階調査完了）"
        : tier > 1
          ? ` — 段${tier}で確定`
          : "";
    console.log(
      `  -> ${mergedCount}/5 URLs${mergedCount > urlCount ? " (既存維持含む)" : ""}${statusNote}`,
    );
  }

  console.log("\n=== CEO REPORT ===");
  console.log(`URLs found: ${totalFound} / 100`);
  for (const r of report) console.log(`  ${r.slug}: ${r.urls_found}/5`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
