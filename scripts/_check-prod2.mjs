const t = await fetch("https://seiji1192.site/dev/articles/").then((r) => r.text());
console.log("stall badge", t.includes("admin-row__badge--stall"));
console.log("data-stall", (t.match(/data-stall/g) || []).length);
console.log("data-filter=stall", t.includes('data-filter="stall"'));
console.log("ループ tab", t.includes("ループ"));
