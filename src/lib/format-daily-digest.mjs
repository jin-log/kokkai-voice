import { articleShortTitle } from "./case-helpers.mjs";
import { buildSharePayload } from "./share.mjs";
import { clip, oneLine } from "./promo-generate.mjs";

/** @param {import('./articles.mjs').Article[]} articles */
export function formatDailyDigestPost(articles) {
  const lines = ["【政治なう 今日の3選】", ""];

  articles.forEach((article, i) => {
    const title = articleShortTitle(article);
    const short = clip(
      oneLine(article.nowSummary?.bullets?.[0] || article.summaryBullets?.[0] || ""),
      36,
    );
    const { pageUrl } = buildSharePayload(article);
    const head = /^【/.test(title) ? title.replace(/^【|】$/g, "") : title;
    lines.push(`${["①", "②", "③"][i] || `${i + 1}.`} ${head}`);
    if (short) lines.push(short);
    lines.push(pageUrl);
    lines.push("");
  });

  lines.push("出典付きで「あの話どうなった？」を追います");
  return lines.join("\n").trim();
}
