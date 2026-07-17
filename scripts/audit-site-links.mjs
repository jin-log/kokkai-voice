/**
 * 本番トップ・案件ページの内部リンク監査（スラッシュなし /case、死リンク）
 */
const BASE = process.env.AUDIT_BASE || "https://seiji1192.site";

const seeds = [
  "/",
  "/search/",
  "/about/",
  "/theme/shoshika/",
  "/theme/gaikokujin/",
  "/theme/kokumin-futan/",
  "/theme/chiho-gyosei/",
  "/case/kojin-joho-kaisei/",
  "/case/chingin/",
];

function abs(href, from) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
    return null;
  }
  if (href.startsWith("http")) {
    if (!href.startsWith(BASE)) return null;
    return href;
  }
  return new URL(href, `${BASE}${from}`).href;
}

const pages = new Map();
const issues = [];

for (const path of seeds) {
  const url = `${BASE}${path}`;
  const r = await fetch(url, { redirect: "follow" });
  const html = await r.text();
  pages.set(path, { status: r.status, final: r.url, html });

  if (r.status !== 200) {
    issues.push({ type: "seed_status", path, status: r.status });
  }

  // トップ誤表示チェック（案件URLなのにヒーロー）
  if (path.startsWith("/case/") && html.includes("あの話 どうなった？") && !html.includes("いまの結論")) {
    issues.push({ type: "case_shows_home", path });
  }

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
  for (const h of hrefs) {
    // スラッシュなし case リンク
    if (/^\/case\/[^/#?]+$/.test(h) || new RegExp(`^${BASE}/case/[^/#?]+$`).test(h)) {
      issues.push({ type: "no_trailing_slash", from: path, href: h });
    }
  }
}

// ユニークな /case/ リンクを本番で叩く
const caseLinks = new Set();
for (const { html } of pages.values()) {
  for (const m of html.matchAll(/href=["']([^"']*\/case\/[^"']+)["']/g)) {
    const a = abs(m[1], "/");
    if (a) caseLinks.add(a.split("#")[0]);
  }
}

let checked = 0;
for (const link of caseLinks) {
  checked++;
  const r = await fetch(link, { redirect: "follow" });
  const html = await r.text();
  const title = (html.match(/<title>([^<]*)/) || [])[1] || "";
  const looksHome = title.includes("あの話どうなった") && !title.includes("｜");
  if (r.status !== 200 || looksHome) {
    issues.push({
      type: "case_link_bad",
      href: link.replace(BASE, ""),
      status: r.status,
      final: r.url.replace(BASE, ""),
      title: title.slice(0, 50),
    });
  }
}

console.log(`seeds ${seeds.length} / case links checked ${checked}`);
if (!issues.length) {
  console.log("OK — 指摘なし");
  process.exit(0);
}
console.log(`NG ${issues.length}件`);
for (const i of issues) console.log(JSON.stringify(i));
process.exit(1);
