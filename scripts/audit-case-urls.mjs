/**
 * 本番 /case/* のスラッシュ有無・中身が記事かを一括監査
 */
import { getArticleSlugs } from "../src/lib/articles.mjs";

const BASE = process.env.AUDIT_BASE || "https://seiji1192.site";
const slugs = await getArticleSlugs();

const results = [];
for (const slug of slugs) {
  for (const withSlash of [false, true]) {
    const path = `/case/${slug}${withSlash ? "/" : ""}`;
    const url = `${BASE}${path}`;
    try {
      const r = await fetch(url, { redirect: "follow" });
      const html = await r.text();
      const title = (html.match(/<title>([^<]*)/) || [])[1] || "";
      const isHome =
        title.includes("あの話どうなった") && !title.includes("｜");
      const isArticle =
        r.url.includes(`/case/${slug}`) &&
        !isHome &&
        (html.includes("いまの結論") || html.includes("case-page") || title.includes("｜日本の政治"));
      results.push({
        slug,
        path,
        status: r.status,
        final: r.url.replace(BASE, ""),
        isHome,
        isArticle,
        title: title.slice(0, 60),
      });
    } catch (e) {
      results.push({
        slug,
        path,
        status: 0,
        error: String(e.message || e),
        isHome: false,
        isArticle: false,
      });
    }
  }
}

const bad = results.filter((r) => !r.isArticle || r.isHome || r.status !== 200);
const ok = results.filter((r) => r.isArticle && !r.isHome && r.status === 200);

console.log(`OK ${ok.length}/${results.length}`);
if (bad.length) {
  console.log("\nNG:");
  for (const r of bad) console.log(JSON.stringify(r));
  process.exit(1);
}
console.log("全 case URL 正常（スラッシュ有無とも記事）");
