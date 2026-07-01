const t = await fetch("https://seiji1192.site/dev/articles/").then((r) => r.text());
// SSR body: between admin-gate and script
const gateEnd = t.indexOf("</div>", t.indexOf('id="admin-gate"'));
const scriptStart = t.indexOf("<script", gateEnd);
const body = t.slice(gateEnd, scriptStart);
console.log("SSR articles-patrol-alert id", body.includes('id="articles-patrol-alert"'));
console.log("SSR 進行停止", body.includes("進行停止"));
console.log("SSR admin-row__stall", (body.match(/admin-row__stall/g) || []).length);
