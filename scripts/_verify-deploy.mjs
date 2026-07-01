const t = await fetch("https://seiji1192.site/dev/articles/").then((r) => r.text());
console.log("shell", t.includes("shell-patrol-alert"));
console.log("stall1", (t.match(/data-stall="1"/g) || []).length);
const scriptIdx = t.indexOf("<script");
const alertIdx = t.indexOf("進行停止");
console.log("SSR alert", alertIdx > 0 && alertIdx < scriptIdx);
