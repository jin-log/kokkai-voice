import { getGoogleAccessToken } from "./google-service-auth.js";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
const SITE_HOST = "seiji1192.site";
const SITE_CANDIDATES = [
  `https://${SITE_HOST}/`,
  `sc-domain:${SITE_HOST}`,
  `http://${SITE_HOST}/`,
];

/** @param {number} days */
function gscDateRange(days) {
  const d = Math.max(1, Math.min(90, Number(days) || 7));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - d);
  const fmt = (dt) => dt.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** @param {string} token @param {string} siteUrl encoded */
async function querySearchAnalytics(token, siteUrl, body) {
  const res = await fetch(
    `${SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

/** @param {string} token */
async function resolveSiteUrl(token) {
  const res = await fetch(SITES_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && Array.isArray(data.siteEntry)) {
    const match = data.siteEntry.find((s) => {
      const url = String(s.siteUrl || "");
      return url.includes(SITE_HOST);
    });
    if (match?.siteUrl) return match.siteUrl;
  }
  return SITE_CANDIDATES[0];
}

function countryFilter(country) {
  if (!country || country === "all") return undefined;
  return [
    {
      filters: [
        {
          dimension: "country",
          operator: "equals",
          expression: "jpn",
        },
      ],
    },
  ];
}

function mapQueryRows(rows = []) {
  return rows
    .map((row) => ({
      keyword: String(row.keys?.[0] || "").trim(),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }))
    .filter((r) => r.keyword && r.impressions > 0)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function mapPageRows(rows = []) {
  return rows
    .map((row) => ({
      path: gscPageToPath(row.keys?.[0]),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }))
    .filter((r) => r.path && r.impressions > 0)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function gscPageToPath(pageUrl) {
  const raw = String(pageUrl || "").trim();
  if (!raw) return "/";
  try {
    const u = new URL(raw);
    if (u.hostname && u.hostname !== SITE_HOST) return u.pathname || "/";
    return `${u.pathname || "/"}${u.search || ""}`;
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

/**
 * @param {object} creds service account JSON
 * @param {{ days?: number, country?: 'Japan'|'all' }} opts
 */
export async function fetchGscSearchReport(creds, opts = {}) {
  const days = opts.days ?? 7;
  const country = opts.country === "all" ? "all" : "Japan";
  const token = await getGoogleAccessToken(creds, GSC_SCOPE);
  const siteUrl = await resolveSiteUrl(token);
  const { startDate, endDate } = gscDateRange(days);
  const filters = countryFilter(country);

  const base = { startDate, endDate, ...(filters ? { dimensionFilterGroups: filters } : {}) };

  const [queries, pages, totals] = await Promise.all([
    querySearchAnalytics(token, siteUrl, {
      ...base,
      dimensions: ["query"],
      rowLimit: 30,
    }),
    querySearchAnalytics(token, siteUrl, {
      ...base,
      dimensions: ["page"],
      rowLimit: 15,
    }),
    querySearchAnalytics(token, siteUrl, {
      startDate,
      endDate,
      ...(filters ? { dimensionFilterGroups: filters } : {}),
    }),
  ]);

  const summaryRow = totals.rows?.[0] || {};
  const keywords = mapQueryRows(queries.rows);
  const landingPages = mapPageRows(pages.rows);

  return {
    ok: true,
    source: "gsc",
    siteUrl,
    range: { startDate, endDate, days },
    summary: {
      clicks: Number(summaryRow.clicks || 0),
      impressions: Number(summaryRow.impressions || 0),
      ctr: Number(summaryRow.ctr || 0),
      position: Number(summaryRow.position || 0),
    },
    keywords,
    landingPages,
  };
}
