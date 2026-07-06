import { getGoogleAccessToken } from "./google-service-auth.js";
import { fetchGscSearchReport } from "./gsc-search-core.js";

const REPORT_URL = "https://analyticsdata.googleapis.com/v1beta";
const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const PROPERTY_ID = "397089537";
const PRODUCTION_HOST = "seiji1192.site";

/** @param {object} creds */
async function getAnalyticsToken(creds) {
  return getGoogleAccessToken(creds, ANALYTICS_SCOPE);
}

/** @param {string} token @param {object} body */
async function runReport(token, body) {
  const res = await fetch(`${REPORT_URL}/properties/${PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

function rows(data, ...dimKeys) {
  return (data.rows || []).map((row) => {
    /** @type {Record<string, string|number>} */
    const out = {};
    dimKeys.forEach((key, i) => {
      out[key] = row.dimensionValues?.[i]?.value ?? "";
    });
    const metrics = row.metricValues || [];
    out.sessions = Number(metrics[0]?.value || 0);
    out.activeUsers = Number(metrics[1]?.value || metrics[0]?.value || 0);
    if (metrics.length > 2) out.pageViews = Number(metrics[2]?.value || 0);
    if (metrics.length > 3) out.metric4 = Number(metrics[3]?.value || 0);
    return out;
  });
}

function dateRange(days) {
  const d = Math.max(1, Math.min(90, Number(days) || 7));
  return [{ startDate: `${d}daysAgo`, endDate: "today" }];
}

function prodHostFilter() {
  return {
    filter: {
      fieldName: "hostName",
      stringFilter: { matchType: "EXACT", value: PRODUCTION_HOST },
    },
  };
}

function countryFilter(country) {
  if (!country || country === "all") return null;
  return {
    filter: {
      fieldName: "country",
      stringFilter: { matchType: "EXACT", value: country },
    },
  };
}

function organicFilter() {
  return {
    filter: {
      fieldName: "sessionDefaultChannelGroup",
      stringFilter: { matchType: "EXACT", value: "Organic Search" },
    },
  };
}

function mergeFilters(...parts) {
  const expressions = parts.filter(Boolean);
  if (expressions.length === 0) return undefined;
  if (expressions.length === 1) return expressions[0];
  return { andGroup: { expressions } };
}

function formatKeyword(raw) {
  const v = String(raw || "").trim();
  if (!v || v === "(not set)" || v === "(not provided)") return "(not provided)";
  return v;
}

/** @param {string} ym e.g. 202607 */
function formatYearMonth(ym) {
  const s = String(ym);
  if (s.length !== 6) return s;
  return `${s.slice(0, 4)}年${Number(s.slice(4))}月`;
}

/** @param {string} ymd e.g. 20260705 */
function formatDateLabel(ymd) {
  const s = String(ymd);
  if (s.length !== 8) return s;
  return `${Number(s.slice(4, 6))}/${Number(s.slice(6, 8))}`;
}

/**
 * @param {object} creds service account JSON
 * @param {{ days?: number, country?: 'Japan'|'all' }} opts
 */
export async function fetchGa4Dashboard(creds, opts = {}) {
  const days = opts.days ?? 7;
  const country = opts.country === "all" ? "all" : "Japan";
  const dimensionFilter = mergeFilters(prodHostFilter(), countryFilter(country === "Japan" ? "Japan" : null));
  const organicDimFilter = mergeFilters(
    prodHostFilter(),
    countryFilter(country === "Japan" ? "Japan" : null),
    organicFilter(),
  );
  const base = { dateRanges: dateRange(days), limit: 15 };
  const body = dimensionFilter ? { ...base, dimensionFilter } : base;

  const token = await getAnalyticsToken(creds);
  const gscPromise = fetchGscSearchReport(creds, { days, country }).catch((err) => ({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  }));

  const [
    totals,
    countries,
    sources,
    pages,
    channels,
    monthly,
    daily,
    organicKeywords,
    organicLanding,
    devices,
    engagement,
    gsc,
  ] = await Promise.all([
    runReport(token, {
      ...body,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
    }),
    country === "Japan"
      ? Promise.resolve({ rows: [] })
      : runReport(token, {
          dateRanges: dateRange(days),
          dimensionFilter: mergeFilters(prodHostFilter()),
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        }),
    runReport(token, {
      ...body,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    runReport(token, {
      ...body,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    }),
    runReport(token, {
      ...body,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    runReport(token, {
      dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
      dimensionFilter,
      dimensions: [{ name: "yearMonth" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
      limit: 13,
    }),
    runReport(token, {
      dateRanges: dateRange(days),
      dimensionFilter,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 90,
    }),
    runReport(token, {
      dateRanges: dateRange(Math.max(days, 28)),
      dimensionFilter: organicDimFilter,
      dimensions: [{ name: "searchTerm" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 25,
    }),
    runReport(token, {
      dateRanges: dateRange(days),
      dimensionFilter: organicDimFilter,
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
    runReport(token, {
      ...body,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    runReport(token, {
      ...body,
      metrics: [
        { name: "newUsers" },
        { name: "engagementRate" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
    }),
    gscPromise,
  ]);

  const totalRow = totals.rows?.[0]?.metricValues || [];
  const summary = {
    activeUsers: Number(totalRow[0]?.value || 0),
    sessions: Number(totalRow[1]?.value || 0),
    pageViews: Number(totalRow[2]?.value || 0),
  };

  const pageRows = (pages.rows || []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "",
    pageViews: Number(row.metricValues?.[0]?.value || 0),
    sessions: Number(row.metricValues?.[1]?.value || 0),
  }));

  const casePageViews = pageRows
    .filter((p) => String(p.path).startsWith("/case/"))
    .reduce((n, p) => n + p.pageViews, 0);

  const sourceRows = rows(sources, "source", "medium", "channel").map((r) => ({
    label: formatSource(r.source, r.medium),
    channel: r.channel,
    sessions: r.sessions,
    activeUsers: r.activeUsers,
  }));

  const directSessions = sourceRows
    .filter((r) => r.label === "Direct")
    .reduce((n, r) => n + r.sessions, 0);

  const organicSessions = sourceRows
    .filter((r) => r.channel === "Organic Search")
    .reduce((n, r) => n + r.sessions, 0);

  const engRow = engagement.rows?.[0]?.metricValues || [];
  const engagementSummary = {
    newUsers: Number(engRow[0]?.value || 0),
    engagementRate: Number(engRow[1]?.value || 0),
    avgSessionSeconds: Math.round(Number(engRow[2]?.value || 0)),
    bounceRate: Number(engRow[3]?.value || 0),
  };

  const ga4KeywordRows = (organicKeywords.rows || [])
    .map((row) => ({
      keyword: formatKeyword(row.dimensionValues?.[0]?.value),
      sessions: Number(row.metricValues?.[0]?.value || 0),
      activeUsers: Number(row.metricValues?.[1]?.value || 0),
    }))
    .filter((r) => r.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);

  const ga4LandingPages = (organicLanding.rows || []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "/",
    sessions: Number(row.metricValues?.[0]?.value || 0),
    activeUsers: Number(row.metricValues?.[1]?.value || 0),
  }));

  const gscOk = gsc?.ok === true;
  const keywordRows = gscOk
    ? gsc.keywords
    : ga4KeywordRows;
  const organicLandingPages = gscOk
    ? gsc.landingPages.map((p) => ({
        path: p.path,
        clicks: p.clicks,
        impressions: p.impressions,
        position: p.position,
      }))
    : ga4LandingPages;

  const monthlyTrend = (monthly.rows || []).map((row) => ({
    month: String(row.dimensionValues?.[0]?.value ?? ""),
    label: formatYearMonth(row.dimensionValues?.[0]?.value ?? ""),
    activeUsers: Number(row.metricValues?.[0]?.value || 0),
    sessions: Number(row.metricValues?.[1]?.value || 0),
    pageViews: Number(row.metricValues?.[2]?.value || 0),
  }));

  const dailyTrend = (daily.rows || []).map((row) => ({
    date: String(row.dimensionValues?.[0]?.value ?? ""),
    label: formatDateLabel(row.dimensionValues?.[0]?.value ?? ""),
    sessions: Number(row.metricValues?.[0]?.value || 0),
    activeUsers: Number(row.metricValues?.[1]?.value || 0),
    pageViews: Number(row.metricValues?.[2]?.value || 0),
  }));

  const deviceRows = rows(devices, "device").map((r) => ({
    device: formatDevice(r.device),
    sessions: r.sessions,
    activeUsers: r.activeUsers,
  }));

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    rangeDays: days,
    country,
    host: PRODUCTION_HOST,
    summary: { ...summary, casePageViews, organicSessions },
    engagement: engagementSummary,
    channels: rows(channels, "channel").map((r) => ({
      channel: r.channel || "(not set)",
      sessions: r.sessions,
      activeUsers: r.activeUsers,
    })),
    countries: rows(countries, "name").map((r) => ({
      country: r.name,
      activeUsers: r.activeUsers,
      sessions: r.sessions,
    })),
    sources: sourceRows,
    pages: pageRows,
    organicKeywords: keywordRows,
    organicKeywordSource: gscOk ? "gsc" : "ga4",
    gsc: gscOk
      ? {
          siteUrl: gsc.siteUrl,
          summary: gsc.summary,
          range: gsc.range,
        }
      : gsc?.error
        ? { error: gsc.error }
        : null,
    organicLandingPages,
    monthlyTrend,
    dailyTrend,
    devices: deviceRows,
    insights: buildInsights({
      summary: { ...summary, organicSessions },
      sourceRows,
      directSessions,
      country,
      keywordRows,
      keywordSource: gscOk ? "gsc" : "ga4",
      gscSummary: gscOk ? gsc.summary : null,
      gscError: gscOk ? null : gsc?.error || null,
      engagementSummary,
    }),
  };
}

function formatSource(source, medium) {
  if (source === "(direct)" && medium === "(none)") return "Direct";
  if (source === "google" && medium === "organic") return "Google 検索";
  if (source === "bing" && medium === "organic") return "Bing 検索";
  return `${source} / ${medium}`;
}

function formatDevice(device) {
  if (device === "desktop") return "PC";
  if (device === "mobile") return "モバイル";
  if (device === "tablet") return "タブレット";
  return device || "(not set)";
}

function buildInsights({
  summary,
  sourceRows,
  directSessions,
  country,
  keywordRows,
  keywordSource,
  gscSummary,
  gscError,
  engagementSummary,
}) {
  /** @type {string[]} */
  const tips = [];
  tips.push(`計測対象: ${PRODUCTION_HOST} のみ（pages.dev 除外）`);
  if (country === "Japan") tips.push("国内フィルタ ON");
  if (directSessions > 0 && summary.sessions > 0) {
    const pct = Math.round((directSessions / summary.sessions) * 100);
    tips.push(
      `Direct ${directSessions}件（${pct}%）— 参照元なし。ボット・URL直打ち等`,
    );
  }
  if (summary.organicSessions > 0) {
    tips.push(`GA4 オーガニック ${summary.organicSessions} セッション`);
  }
  if (keywordSource === "gsc" && gscSummary) {
    tips.push(
      `GSC 検索 ${gscSummary.clicks} クリック / ${gscSummary.impressions} 表示（平均順位 ${gscSummary.position.toFixed(1)}）`,
    );
    if (keywordRows.length > 0) {
      tips.push(`検索クエリ ${keywordRows.length} 件（Search Console）`);
    }
  } else if (gscSummary === null && keywordSource === "ga4") {
    const namedKw = keywordRows.filter((k) => k.keyword !== "(not provided)");
    if (namedKw.length === 0) {
      tips.push("検索クエリは GSC API から取得（GA4 searchTerm は Google 仕様で非公開）");
    }
    if (gscError) {
      if (/has not been used|is disabled|Enable it/i.test(gscError)) {
        tips.push("GSC API 未有効 → Cloud Console で「Google Search Console API」を有効化");
      } else {
        tips.push(`GSC エラー: ${gscError.slice(0, 120)}`);
      }
    }
  } else {
    const namedKw = keywordRows.filter((k) => k.keyword !== "(not provided)");
    if (namedKw.length === 0 && summary.organicSessions > 0) {
      tips.push("GSC 未取得 — サービスアカウントを Search Console オーナーに追加");
    } else if (namedKw.length > 0) {
      tips.push(`取得できた検索語 ${namedKw.length} 件（GA4・限定的）`);
    }
  }
  if (engagementSummary.engagementRate > 0) {
    tips.push(`エンゲージメント率 ${Math.round(engagementSummary.engagementRate * 100)}%`);
  }
  if (summary.casePageViews === 0 && summary.pageViews > 0) {
    tips.push("記事（/case/）PV が0 — トップだけの訪問が多い可能性");
  }
  return tips;
}

/** @param {Record<string, string|undefined>} env */
export function loadGa4Credentials(env = {}) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON が不正です");
  }
}
