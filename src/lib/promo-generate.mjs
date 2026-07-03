import { SITE } from "./site-config.mjs";
import { articleShortTitle, formatDate, ASSET_V } from "./case-helpers.mjs";
import { noteMembershipLink, noteMembershipFooterLabel } from "./note-link.mjs";
import { buildSharePayload } from "./share.mjs";
import { buildOgAssetBrief } from "./og-image.mjs";

const DOMAIN = SITE.domain.replace(/\/$/, "");

/** @param {string} s */
export function oneLine(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

/** @param {string} s @param {number} max */
export function clip(s, max) {
  const t = oneLine(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** @param {string} sentence @param {number} max */
function wrapPromoLine(sentence, max = 26) {
  const out = [];
  let rest = sentence.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 8);
    let cut = -1;
    for (const sep of ["。", "、", "で", "」", " ", "・"]) {
      const i = window.lastIndexOf(sep, max);
      if (i >= 10) {
        cut = i + (sep === "。" ? 1 : sep.length);
        break;
      }
    }
    if (cut <= 0) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** X本投稿 — 【タイトル】＋改行＋装飾 */
/** @param {import('./articles.mjs').Article} article */
export function formatXMainPost(article) {
  const shortTitle = articleShortTitle(article);
  const { pageUrl } = buildSharePayload(article);
  const raw = oneLine(article.nowSummary?.bullets?.[0] || article.summaryBullets?.[0] || "");
  const sentences = raw.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);

  const headline = /^【/.test(shortTitle) ? shortTitle : `【${shortTitle}】`;
  const lines = [headline, ""];

  if (sentences.length >= 2) {
    for (const line of wrapPromoLine(sentences[0])) lines.push(line);
    lines.push("");
    lines.push(sentences.slice(1).join(""));
  } else if (sentences.length === 1) {
    for (const line of wrapPromoLine(sentences[0])) lines.push(line);
  } else {
    lines.push("国会・政府出典付きで「あの話どうなった？」を整理しました。");
  }

  lines.push("", pageUrl);
  return lines.join("\n");
}

/** @param {import('./articles.mjs').Article} article */
export function buildMetaDescriptionDraft(article) {
  const title = articleShortTitle(article);
  const hook = clip(article.nowSummary?.bullets?.[0] || article.summaryBullets?.[0] || "", 70);
  return clip(`${title} — あの話どうなった？ ${hook} 出典付きで整理。`, 120);
}

/** @param {import('./articles.mjs').Article} article */
export function buildXPosts(article) {
  const { pageUrl, xUrl } = buildSharePayload(article);
  const shortTitle = articleShortTitle(article);
  const b1 = clip(article.nowSummary?.bullets?.[0] || "", 90);
  const b2 = clip(article.nowSummary?.bullets?.[1] || article.summaryBullets?.[0] || "", 90);
  const symbol = article.stanceMatrix?.parties?.find((p) => p.symbol)?.symbol || "";

  const mainFormatted = formatXMainPost(article);
  const mainWithUrl = clip(mainFormatted, 280);

  const thread = [
    {
      n: 1,
      text: clip(mainFormatted, 280),
      note: "リード＋URL",
    },
    {
      n: 2,
      text: clip(
        `いまの整理（3行）\n① ${clip(article.nowSummary?.bullets?.[0] || "", 60)}\n② ${clip(article.nowSummary?.bullets?.[1] || "", 60)}\n③ ${clip(article.nowSummary?.bullets?.[2] || "", 60)}`,
        280,
      ),
      note: "nowSummary",
    },
    {
      n: 3,
      text: clip(
        `公言と行動${symbol ? `（例: ${symbol}）` : ""}・タイムライン・用語解説はページ内。\n出典リンク付き。誤り・追ってほしい案件は @seiji1192site へ\n${pageUrl}`,
        280,
      ),
      note: "CTA",
    },
  ];

  const threadsShort = clip(`${shortTitle} — ${b1} ${pageUrl}`, 280);
  const bluesky = clip(`${shortTitle}\n${b1}\n${pageUrl}`, 300);

  return { pageUrl, xUrl, mainFormatted, mainWithUrl, thread, threadsShort, bluesky };
}

/** @param {string} pageUrl */
export function buildHatenaAddUrl(pageUrl) {
  return `https://b.hatena.ne.jp/add?mode=confirm&url=${encodeURIComponent(pageUrl)}`;
}

/** @param {import('./articles.mjs').Article} article */
export function buildHatena(article) {
  const { pageUrl } = buildSharePayload(article);
  const shortTitle = articleShortTitle(article);
  const lines = (article.nowSummary?.bullets || []).slice(0, 3).map((b) => oneLine(b));
  while (lines.length < 3) lines.push("（要約は案件ページ参照）");
  return {
    pageUrl,
    addUrl: buildHatenaAddUrl(pageUrl),
    title: `${shortTitle}｜${SITE.name}`,
    comment: [
      "国会・政府出典付きで「あの話どうなった？」を整理したページです。",
      lines[0],
      lines[1],
      `続き・タイムライン → ${pageUrl}`,
    ].join("\n"),
  };
}

/** @param {import('./articles.mjs').Article} article */
export function buildNoteExcerpt(article) {
  const { pageUrl } = buildSharePayload(article);
  const shortTitle = articleShortTitle(article);
  const plain = (article.plainExplanation || "").split("\n\n")[0] || "";
  const excerpt = clip(plain || article.nowSummary?.bullets?.join(" ") || "", 300);
  const memberUrl =
    SITE.noteMembershipLive && SITE.noteMembershipUrl
      ? noteMembershipLink("note_article", article.slug || "post")
      : null;
  const footer = [
    "—",
    `${SITE.name}（${DOMAIN}）`,
  ];
  if (memberUrl) {
    footer.push(
      "",
      `▼ noteメンバー（${noteMembershipFooterLabel()}）— 週次ダイジェスト・深掘り`,
      memberUrl,
    );
  }
  return {
    pageUrl,
    title: shortTitle,
    excerpt,
    bodyFree: [
      `## ${shortTitle}`,
      "",
      excerpt,
      "",
      "▼ 全文（公言と行動表・タイムライン・用語）",
      pageUrl,
      "",
      ...footer,
    ].join("\n"),
  };
}

/** @param {import('./articles.mjs').Article} article @param {string[]} relatedSlugs */
export function buildSeoChecklist(article, relatedSlugs = []) {
  const { pageUrl } = buildSharePayload(article);
  const meta = buildMetaDescriptionDraft(article);
  const published = article.publishedAt?.slice(0, 10) || "（未公開）";
  return {
    pageUrl,
    metaDescriptionDraft: meta,
    tasks: [
      { id: "gsc-index", text: `Google Indexing API 自動通知（deploy時）。手動確認: ${pageUrl}` },
      { id: "ogp", text: "OGP 1200×630 表示確認（X Card Validator / Slack プレビュー）" },
      { id: "meta-desc", text: `meta description 案（C26未実装時はメモ）: ${meta}` },
      { id: "internal-link", text: `関連案件へ内部リンク3本: ${relatedSlugs.join(", ") || "（手動選定）"}` },
      { id: "sitemap", text: "sitemap-index.xml に slug が含まれるか確認" },
      { id: "indexnow", text: "IndexNow 自動通知（deploy 時 --live）。手動: npm run notify:search" },
    ],
    keywords: [
      `${articleShortTitle(article)} どうなった`,
      `${articleShortTitle(article)} 最新`,
      article.searchKeyword || "",
    ].filter(Boolean),
    publishedAt: published,
  };
}

/** @param {import('./articles.mjs').Article} article */
export function buildPngBrief(article) {
  const og = buildOgAssetBrief(article, ASSET_V);
  const shortTitle = articleShortTitle(article);
  const bullets = (article.summaryBullets || article.nowSummary?.bullets || []).slice(0, 3);
  return {
    size: "1200×630（自動生成済み）",
    primaryPattern: og.primaryPattern,
    recommendedForX: `https://seiji1192.site${og.recommendedForX}`,
    files: og.files.map((f) => ({
      ...f,
      url: `https://seiji1192.site${f.path}`,
    })),
    headline: clip(shortTitle, 40),
    bullets: bullets.map((b) => clip(b, 50)),
    footer: `${SITE.name} · 出典付き`,
    qrUrl: `${DOMAIN}/case/${article.slug}/`,
  };
}

/** @param {import('./articles.mjs').Article} article @param {object} [opts] */
export function buildPromoPack(article, opts = {}) {
  const relatedSlugs = opts.relatedSlugs || [];
  return {
    slug: article.slug,
    title: article.title,
    generatedAt: new Date().toISOString(),
    x: buildXPosts(article),
    hatena: buildHatena(article),
    note: buildNoteExcerpt(article),
    seo: buildSeoChecklist(article, relatedSlugs),
    png: buildPngBrief(article),
    ownerChecklist: [
      "X 本投稿（thread 1/3 最低）",
      `PNG 添付: ${buildOgAssetBrief(article, ASSET_V).primaryPattern} パターン（自動生成・Canva不要）`,
      "はてブ（コメント3行付き）",
      "GSC インデックスリクエスト",
      "note 抜粋は週次ダイジェストに回しても可",
    ],
  };
}

/** @param {import('./articles.mjs').Article} article */
export function formatPromoPackMarkdown(article) {
  const pack = buildPromoPack(article);
  const updated = article.nowSummary?.updatedAt?.slice(0, 10) || article.fetchedAt?.slice(0, 10) || "";

  return `# 公開プロモパック — ${pack.title}

slug: \`${pack.slug}\`  
生成: ${pack.generatedAt.slice(0, 10)} · 更新日: ${updated}

---

## 1. X（@seiji1192site）

### 本投稿（コピペ）

\`\`\`
${pack.x.mainFormatted}
\`\`\`

### スレッド（任意）

${pack.x.thread
  .map(
    (t) => `**${t.n}/3** — ${t.note}
\`\`\`
${t.text}
\`\`\``,
  )
  .join("\n\n")}

### Threads / Bluesky 短縮

\`\`\`
${pack.x.threadsShort}
\`\`\`

---

## 2. はてなブックマーク

- **登録URL（開くだけ）:** ${pack.hatena.addUrl}
- **記事URL:** ${pack.hatena.pageUrl}
- **タイトル（必要なら）:** ${pack.hatena.title}

**コメント（登録画面に貼付）:**

\`\`\`
${pack.hatena.comment}
\`\`\`

---

## 3. note 抜粋（無料記事 or 週次に転用）

\`\`\`markdown
${pack.note.bodyFree}
\`\`\`

---

## 4. SEO チェックリスト

| # | やること |
|---|----------|
${pack.seo.tasks.map((t, i) => `| ${i + 1} | ${t.text} |`).join("\n")}

**meta description 案:** ${pack.seo.metaDescriptionDraft}

**狙うクエリ:** ${pack.seo.keywords.join(" · ")}

---

## 5. PNG（自動生成済み・X添付用）

- **推奨（本投稿）:** ${pack.png.recommendedForX}
- **og:image パターン:** ${pack.png.primaryPattern}

| パターン | URL | 用途 |
|----------|-----|------|
${pack.png.files.map((f) => `| ${f.pattern} | ${f.url} | ${f.use} |`).join("\n")}

- 見出し: ${pack.png.headline}
${pack.png.bullets.map((b, i) => `- bullet${i + 1}: ${b}`).join("\n")}

---

## 6. オーナー投稿チェック（約30分）

${pack.ownerChecklist.map((c) => `- [ ] ${c}`).join("\n")}

---

正本: \`docs/publish-routine.md\` · playbook §F
`;
}

/** @param {import('./articles.mjs').Article[]} articles */
export function formatWeeklyDigestMarkdown(articles, weekLabel) {
  const visible = articles.filter((a) => a.pageReady && !a.adminHidden);
  const lines = [
    `# note 週次ダイジェスト ${weekLabel}`,
    "",
    `生成: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "▼ 無料公開推奨（メンバー限定にする場合は note 側で設定）",
    "",
  ];

  if (visible.length === 0) {
    lines.push("今週の新規・更新案件はありません。サイト固定告知 or 既存案件の再シェアを検討。");
  } else {
    lines.push("## 今週の案件");
    lines.push("");
    for (const a of visible) {
      const url = `${DOMAIN}/case/${a.slug}/`;
      const hook = clip(a.nowSummary?.bullets?.[0] || "", 100);
      lines.push(`### ${articleShortTitle(a)}`);
      lines.push("");
      lines.push(hook);
      lines.push("");
      lines.push(`→ ${url}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("## リード文（note 冒頭にコピペ）");
    lines.push("");
    lines.push(
      clip(
        `今週も「あの話、どうなった？」を${visible.length}本追いました。国会・政府出典付きの整理です。`,
        200,
      ),
    );
    lines.push("");
    lines.push("## X 告知（1本）");
    lines.push("");
    const titles = visible.slice(0, 3).map((a) => articleShortTitle(a)).join(" / ");
    lines.push(
      `\`\`\`\n【週次】${titles}${visible.length > 3 ? " ほか" : ""}\n${DOMAIN}/\n${SITE.hashtag}\n\`\`\``,
    );
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 週次SEO（オーナー15分）");
  lines.push("");
  lines.push("- [ ] GSC → パフォーマンス（7日）クリック・表示");
  lines.push("- [ ] カバレッジ → インデックス未登録があれば URL 検査");
  lines.push("- [ ] 今週公開分すべて GSC リクエスト済みか");
  lines.push("- [ ] X Analytics リンククリック");
  lines.push("");
  lines.push("正本: `docs/weekly-routine.md`");
  return lines.join("\n");
}

/** @param {import('./articles.mjs').Article} a @param {number} sinceMs */
export function articleWeekActivity(a, sinceMs) {
  if (a.adminHidden || !a.pageReady) return false;
  const stamps = [a.publishedAt, a.nowSummary?.updatedAt].filter(Boolean);
  return stamps.some((iso) => new Date(iso).getTime() >= sinceMs);
}
