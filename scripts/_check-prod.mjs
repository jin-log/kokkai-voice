const t = await fetch("https://seiji1192.site/dev/articles/").then((r) => r.text());
console.log("articles-patrol-alert", t.includes("articles-patrol-alert"));
console.log("shell-patrol-alert", t.includes("shell-patrol-alert"));
console.log("進行停止", t.includes("進行停止"));
const idx = t.indexOf("admin-patrol-alert");
console.log("first admin-patrol-alert at", idx);
if (idx > 0) console.log(t.slice(idx - 50, idx + 200));
