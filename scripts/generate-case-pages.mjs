#!/usr/bin/env node
/** data/articles/*.json → samples/case/*.html */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../src/lib/site-config.mjs";
import { isXUnavailable, X_UNAVAILABLE_USER_MESSAGE } from "../src/lib/x-research-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ASSET_V = "20260626f";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function reactionNums(a) {
  const good = a.reactions?.good ?? 0;
  const neutral = a.reactions?.neutral ?? 0;
  const bad = a.reactions?.bad ?? 0;
  const total = good + neutral + bad || 1;
  return {
    good,
    neutral,
    bad,
    goodPct: Math.round((good / total) * 100),
    neutralPct: Math.round((neutral / total) * 100),
    badPct: Math.round((bad / total) * 100),
  };
}

function renderReactionSummary(a) {
  const { good, neutral, bad, goodPct, neutralPct, badPct } = reactionNums(a);
  return `
      <div class="reaction-summary" id="sec-mood" aria-label="みんなのキモチ">
        <span class="reaction-summary__label">みんなのキモチ</span>
        <div class="reaction-bar" role="img" aria-label="賛成${goodPct}%・中立${neutralPct}%・反対${badPct}%">
          <div class="reaction-bar__good" data-good-bar style="width: ${goodPct}%">${goodPct > 0 ? `<span class="reaction-bar__pct">${goodPct}%</span>` : ""}</div>
          <div class="reaction-bar__neutral" data-neutral-bar style="width: ${neutralPct}%">${neutralPct > 0 ? `<span class="reaction-bar__pct">${neutralPct}%</span>` : ""}</div>
          <div class="reaction-bar__bad" data-bad-bar style="width: ${badPct}%">${badPct > 0 ? `<span class="reaction-bar__pct">${badPct}%</span>` : ""}</div>
        </div>
        <span class="reaction-summary__nums">
          <span class="good"><span class="reaction-emoji" aria-hidden="true">😊</span> <span data-good-num>${good}</span></span>
          <span class="neutral"><span class="reaction-emoji" aria-hidden="true">😐</span> <span data-neutral-num>${neutral}</span></span>
          <span class="bad"><span class="reaction-emoji" aria-hidden="true">😠</span> <span data-bad-num>${bad}</span></span>
        </span>
        <button type="button" class="btn btn--primary" data-react="good" hidden>Good</button>
        <button type="button" class="btn" data-react="neutral" hidden>Neutral</button>
        <button type="button" class="btn" data-react="bad" hidden>Bad</button>
      </div>`;
}

function renderGlossary(a) {
  const items = a.glossary ?? a.nowSummary?.glossary ?? [];
  if (!items.length) return "";
  const rows = items
    .map(
      (g) => `
        <dt>${esc(g.term)}</dt>
        <dd>${esc(g.definition)}</dd>`
    )
    .join("\n");
  return `
    <section class="glossary" aria-labelledby="glossary-title">
      <h2 id="glossary-title">この案件の用語（ヒヨコでも分かる版）</h2>
      <dl>${rows}
      </dl>
    </section>`;
}

function renderNowSummary(a) {
  const ns = a.nowSummary ?? {};
  const bullets = ns.bullets ?? [];
  if (bullets.length) {
    const items = bullets.map((b) => `<li>${esc(b)}</li>`).join("\n          ");
    return `
        <ul class="now-box__bullets">
          ${items}
        </ul>`;
  }
  if (ns.text) {
    return `<p class="now-box__text">${esc(ns.text)}</p>`;
  }
  return "";
}

const SYMBOL_LEGEND = [
  { sym: "◎", label: "方向・規模おおむね一致" },
  { sym: "▲", label: "方向一致・規模など一部ずれ" },
  { sym: "❌", label: "方向逆 or 明確な矛盾" },
  { sym: "？", label: "データ不足・未判定" },
];

function symbolTone(sym) {
  if (sym === "◎") return "match";
  if (sym === "▲") return "partial";
  if (sym === "❌") return "mismatch";
  return "unknown";
}

function renderSourceLink(url, label = "出典を見る ↗") {
  if (!url) return `<span class="stance-cell__pending">出典未登録</span>`;
  return `<a class="stance-cell__link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function renderStanceCell(kind, text, sourceUrl, linkLabel) {
  const mod = kind === "stance" ? "stance" : "action";
  return `
          <div class="stance-cell stance-cell--${mod}">
            <span class="stance-cell__label">${kind === "stance" ? "方針" : "行動"}</span>
            <p class="stance-cell__text">${esc(text)}</p>
            ${renderSourceLink(sourceUrl, linkLabel)}
          </div>`;
}

function articlePolicyTitle(a, matrix) {
  if (matrix?.policyLabel) return matrix.policyLabel;
  return (a.title || "").replace(/\s*—\s*あの話どうなった？\s*$/, "").trim();
}

function shouldPublishParty(p) {
  const st = p.stance;
  if (!st?.sourceUrl && String(st?.sourceType || "").includes("要出典")) return false;
  return true;
}

function renderStanceMatrix(a, matrix, meta, politicians = []) {
  const publishParties = (matrix?.parties ?? []).filter(shouldPublishParty);
  if (!publishParties.length) return "";

  const policyTitle = articlePolicyTitle(a, matrix);
  const sectionTitle = `${policyTitle}に対する公言と行動`;
  const excerpt = meta?.excerpt || matrix.excerpt || {};
  const partyExcerptNote =
    excerpt.parties ||
    "この争点で国会・党文書に立場が確認できる政党を掲載します（全政党ではありません）。";
  const politicianExcerptNote =
    excerpt.politicians ||
    "本案件の国会タイムラインに関係する議員のうち、対比に意味がある発言者を掲載します（全議員ではありません）。";

  const legend = SYMBOL_LEGEND.map(
    (l) => `
        <div class="stance-legend-chip stance-legend-chip--${symbolTone(l.sym)}">
          <span class="stance-legend-chip__sym">${esc(l.sym)}</span>
          <span class="stance-legend-chip__text">${esc(l.label)}</span>
        </div>`
  ).join("\n");

  const partyCards = publishParties
    .map((p) => {
      const tone = symbolTone(p.symbol);
      const isPending = tone === "unknown" && !p.stance?.sourceUrl;
      return `
        <article class="stance-party-card stance-party-card--${tone}${isPending ? " stance-party-card--draft" : ""}">
          <header class="stance-party-card__head">
            <div>
              <h3 class="stance-party-card__party">${esc(p.partyLabel)}</h3>
              ${p.symbolReason ? `<p class="stance-party-card__reason">${esc(p.symbolReason)}</p>` : ""}
            </div>
            <span class="stance-party-card__sym stance-party-card__sym--${tone}" title="${esc(p.symbolReason || "")}">${esc(p.symbol)}</span>
          </header>
          <div class="stance-party-card__body">
            ${renderStanceCell("stance", p.stance?.text, p.stance?.sourceUrl, "出典を見る ↗")}
            <div class="stance-party-card__arrow" aria-hidden="true">→</div>
            ${renderStanceCell("action", p.action?.text, p.action?.speechUrl, "国会・関連 ↗")}
          </div>
        </article>`;
    })
    .join("\n");

  const politicianCards = politicians
    .map((pol) => {
      const claim = pol.claims?.find((c) => c.policySlug === matrix.policySlug);
      if (!claim) return "";
      const tone = symbolTone(claim.symbol);
      const ts = pol.trackingSummary;
      const counts = ts
        ? `<span class="stance-politician__count stance-politician__count--match"><span class="stance-politician__count-sym" aria-hidden="true">◎</span>${ts.match}</span><span class="stance-politician__count stance-politician__count--partial"><span class="stance-politician__count-sym" aria-hidden="true">▲</span>${ts.partial}</span><span class="stance-politician__count stance-politician__count--bad"><span class="stance-politician__count-sym" aria-hidden="true">❌</span>${ts.mismatch}</span><span class="stance-politician__count stance-politician__count--muted"><span class="stance-politician__count-sym" aria-hidden="true">？</span>${ts.unknown}</span>`
        : "";
      return `
        <article class="stance-politician stance-politician--${tone}">
          <div class="stance-politician__top">
            <div>
              <h3 class="stance-politician__name">${esc(pol.name)}</h3>
              <p class="stance-politician__party">${esc(pol.party)}</p>
            </div>
            <span class="stance-politician__sym stance-politician__sym--${tone}">${esc(claim.symbol)}</span>
          </div>
          ${counts ? `<div class="stance-politician__track" aria-label="追跡件数">${counts}</div>` : ""}
          <div class="stance-politician__grid">
            ${renderStanceCell("stance", claim.stance?.text, claim.stance?.sourceUrl, "発言 ↗")}
            ${renderStanceCell("action", claim.action?.text, claim.action?.speechUrl, "関連 ↗")}
          </div>
          ${claim.symbolReason ? `<p class="stance-politician__note">${esc(claim.symbolReason)}</p>` : ""}
        </article>`;
    })
    .filter(Boolean)
    .join("\n");

  const politicianSection = politicianCards
    ? `
      <div class="stance-politicians">
        <h3 class="stance-matrix__subhead">議員の整理（抜粋）</h3>
        <p class="stance-matrix__criteria stance-matrix__criteria--politicians">${esc(politicianExcerptNote)}</p>
        <div class="stance-politicians__grid">${politicianCards}
        </div>
      </div>`
    : "";

  const disclaimer = meta?.disclaimer || matrix.disclaimer || "党・個人の評価ではなく、出典付きの事実整理です。";

  return `
    <section class="stance-matrix" aria-labelledby="stance-matrix-title">
      <div class="stance-matrix__head">
        <span class="stance-matrix__badge">公言 ↔ 行動</span>
        <h2 id="stance-matrix-title">${esc(sectionTitle)}</h2>
        <p class="stance-matrix__lead">「言ったこと（方針）」と「動き（行動）」を並べ、記号で整理します。嘘判定・信頼性スコアは付けません。</p>
      </div>
      <div class="stance-matrix__legend" role="list" aria-label="記号の意味">${legend}
      </div>
      <p class="stance-matrix__criteria"><strong>政党の抜粋:</strong> ${esc(partyExcerptNote)}</p>
      <div class="stance-party-grid">${partyCards}
      </div>
      ${politicianSection}
      <p class="stance-matrix__note">${esc(disclaimer)} · <a href="../index.html">方法論</a>は <code>docs/policy-matrix.md</code> · PoC ${esc(matrix.methodologyVersion || "v1")}</p>
    </section>`;
}

async function loadStanceData(a) {
  const sm = a.stanceMatrix;
  if (!sm) return null;
  const matrixPath = sm.dataPath
    ? path.join(root, sm.dataPath)
    : path.join(root, `data/policy-matrix/${sm.policySlug || a.slug}.json`);
  try {
    const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
    const politicians = [];
    for (const slug of sm.highlightPoliticians || []) {
      try {
        politicians.push(
          JSON.parse(await readFile(path.join(root, `data/politicians/${slug}.json`), "utf8"))
        );
      } catch {
        /* optional */
      }
    }
    return { matrix, politicians, meta: sm };
  } catch {
    return null;
  }
}

function renderSummaryLayers(a) {
  const bullets = (a.summaryBullets || [])
    .map((b) => `<li>${esc(typeof b === "string" ? b : b.text)}</li>`)
    .join("\n          ");
  const bulletsHtml = bullets
    ? `
      <section id="sec-detail" class="summary-layers" aria-label="AI要約">
      <div class="plain-box">
        <p class="plain-box__label">AI要約（箇条書き）</p>
        <ul class="summary-bullets">
          ${bullets}
        </ul>
      </div>`
    : "";
  const plainHtml = a.plainExplanation
    ? `
      <div class="plain-box">
        <p class="plain-box__label">AI平易語解説</p>
        <p>${esc(a.plainExplanation).replace(/\n\n/g, "</p><p>")}</p>
      </div>${bullets ? "\n      </section>" : ""}`
    : bullets
      ? "\n      </section>"
      : "";
  return bulletsHtml + plainHtml;
}

function renderXScreenshot(p) {
  if (!p.screenshot) return "";
  const badge =
    p.status === "deleted"
      ? `<span class="x-shot__badge">削除済み</span>`
      : `<span class="x-shot__badge x-shot__badge--live">投稿存続</span>`;
  return `
          <figure class="x-shot">
            <div class="x-shot__header">
              <span>スクリーンショットアーカイブ</span>
              ${badge}
            </div>
            <div class="x-shot__body">
              <img src="${esc(p.screenshot)}" alt="X投稿のスクリーンショット（枠 ${p.slot}）" loading="lazy">
            </div>
            <figcaption class="x-shot__footer">
              元URL: <a href="${esc(p.post_url)}" target="_blank" rel="noopener">${esc(p.post_url)}</a>
              ${p.captured_at ? ` · 取得: ${esc(p.captured_at.slice(0, 10))}` : ""}
            </figcaption>
          </figure>`;
}

function renderXLinkCard(p) {
  const who = p.account_label || p.speaker_hint || "国会議員";
  const meta = p.captured_at
    ? `取得: ${formatDate(p.captured_at.slice(0, 10))} · スクショ済み`
    : "URL登録済み · スクショ取得待ち";
  return `
      <article class="timeline-item">
        <p class="timeline-item__type">X · 枠 ${p.slot}</p>
        <div class="event-card">
          <p class="event-card__who">${esc(who)}</p>
          <p class="event-card__meta">${esc(meta)}</p>
          ${p.post_text ? `<div class="plain-box"><p class="plain-box__label">投稿内容</p><p>${esc(p.post_text)}</p></div>` : ""}
          <blockquote class="quote-block">
            <a href="${esc(p.post_url)}" target="_blank" rel="noopener">元投稿を見る ↗</a>
          </blockquote>
          ${renderXScreenshot(p)}
        </div>
      </article>`;
}

function renderXPending(p) {
  return `
      <article class="timeline-item">
        <p class="timeline-item__type">X · 枠 ${p.slot}（URL未登録）</p>
        <div class="event-card event-card--pending">
          <p class="event-card__meta">国会議員の関連投稿 — スクショ取得待ち</p>
          <div class="plain-box">
            <p class="plain-box__label">X調査中</p>
            <p>ツイートURLを登録 → Playwrightスクショ → R2保存（API不使用）</p>
          </div>
        </div>
      </article>`;
}

function renderXUnavailableNotice(article) {
  const researchedAt = article.xResearch?.researched_at?.slice(0, 10);
  return `
    <aside class="x-unavailable-notice" aria-label="X投稿について">
      <p class="x-unavailable-notice__title">X（旧Twitter）の関連投稿</p>
      <p class="x-unavailable-notice__body">${esc(X_UNAVAILABLE_USER_MESSAGE)}</p>
      ${researchedAt ? `<p class="x-unavailable-notice__meta">調査日: ${esc(researchedAt)}</p>` : ""}
    </aside>`;
}

function renderXSlots(posts, article) {
  if (isXUnavailable(article)) {
    return renderXUnavailableNotice(article);
  }
  return posts.map((p) => (p.post_url ? renderXLinkCard(p) : renderXPending(p))).join("\n");
}

function renderComments() {
  return `
    <section class="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">コメント（デモ）</h2>
      <form class="comment-form" data-comment-form>
        <input type="text" name="name" placeholder="ニックネーム" maxlength="32" aria-label="ニックネーム">
        <textarea name="body" placeholder="この案件についての意見…" maxlength="500" required aria-label="コメント"></textarea>
        <button type="submit" class="btn btn--primary">投稿（デモ・即表示）</button>
      </form>
      <ul class="comment-list" data-comment-list>
        <li class="comment">
          <div class="comment__author">読者A</div>
          <p class="comment__body">国会の原文がそのまま見られるのは助かる。平易語の要約も欲しい。</p>
          <div class="comment__time">デモ</div>
        </li>
      </ul>
    </section>`;
}

function renderFloatToc(a, hasStance) {
  const items = [{ href: "#sec-now", label: "いまの結論" }];
  items.push({ href: "#sec-mood", label: "みんなのキモチ" });
  if ((a.summaryBullets && a.summaryBullets.length) || a.plainExplanation) {
    items.push({ href: "#sec-detail", label: "AI要約" });
  }
  if (hasStance) {
    items.push({ href: "#stance-matrix-title", label: "公言と行動" });
  }
  const glossary = a.glossary ?? a.nowSummary?.glossary ?? [];
  if (glossary.length) {
    items.push({ href: "#glossary-title", label: "用語" });
  }
  items.push(
    { href: "#sec-timeline", label: "タイムライン" },
    { href: "#comments-title", label: "コメント" }
  );
  const links = items
    .map((item) => `<li><a class="float-toc__link" href="${item.href}">${esc(item.label)}</a></li>`)
    .join("\n          ");
  return `
  <nav class="float-toc" data-float-toc aria-label="ページ目次">
    <button type="button" class="float-toc__toggle" data-float-toc-toggle aria-expanded="false" aria-controls="float-toc-panel">
      目次
    </button>
    <div class="float-toc__panel" id="float-toc-panel">
      <p class="float-toc__title">このページ</p>
      <ol class="float-toc__list">
          ${links}
      </ol>
    </div>
  </nav>`;
}

function renderFloatReact(a) {
  const { good, neutral, bad } = reactionNums(a);
  return `
  <div class="float-react" aria-label="みんなのキモチ">
    <button type="button" class="float-react__btn float-react__btn--good" data-float-good aria-label="賛成（にっこり）">
      <span class="float-react__emoji" aria-hidden="true">😊</span>
      <span class="float-react__count" data-float-good-num>${good}</span>
    </button>
    <button type="button" class="float-react__btn float-react__btn--neutral" data-float-neutral aria-label="真顔（どちらでもない）">
      <span class="float-react__emoji" aria-hidden="true">😐</span>
      <span class="float-react__count" data-float-neutral-num>${neutral}</span>
    </button>
    <button type="button" class="float-react__btn float-react__btn--bad" data-float-bad aria-label="反対（怒り）">
      <span class="float-react__emoji" aria-hidden="true">😠</span>
      <span class="float-react__count" data-float-bad-num>${bad}</span>
    </button>
  </div>`;
}

function renderArticle(a, stanceHtml = "", hasStance = false) {
  const s = a.primarySpeech;
  const tagHtml = a.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("\n        ");
  const updatedNote = a.nowSummary.updatedAt
    ? ` · 要約更新: ${esc(a.nowSummary.updatedAt.slice(0, 10))}`
    : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(a.title)}｜${esc(SITE.name)}</title>
  <meta name="description" content="${esc(s.excerpt.slice(0, 120))}">
  <link rel="icon" href="../assets/favicon.png" type="image/png">
  <link rel="stylesheet" href="../css/tokens.css?v=${ASSET_V}">
  <link rel="stylesheet" href="../css/main.css?v=${ASSET_V}">
</head>
<body data-case="${esc(a.slug)}">
  <header class="site-header">
    <div class="container site-header__inner site-header__inner--search">
      <a class="logo" href="../index.html">
        <img class="logo__img" src="../assets/logo-header-nihon-seiji-naw.png" alt="日本の政治 now. あの話どうなった？" width="1024" height="576">
      </a>
      <nav class="nav" aria-label="メイン">
        <a href="../search.html">一覧</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <header class="case-hero">
      <div class="case-hero__tags">
        ${tagHtml}
        <span class="tag tag--source">国会議事録 API</span>
      </div>
      <h1 class="case-hero__title">${esc(a.title.replace(" — あの話どうなった？", ""))}</h1>

      <div class="now-box" id="sec-now">
        <p class="now-box__label">${esc(a.nowSummary.label)}</p>
${renderNowSummary(a)}
        <p class="now-box__updated">データ取得: ${esc(a.fetchedAt.slice(0, 10))} · APIヒット ${a.apiHits}件${updatedNote} · ${esc(a.nowSummary.disclaimer)}</p>
      </div>
${renderReactionSummary(a)}
${renderSummaryLayers(a)}
    </header>
${stanceHtml}
${renderGlossary(a)}
    <section class="timeline" id="sec-timeline" aria-label="案件タイムライン">
      <article class="timeline-item">
        <time class="timeline-item__date" datetime="${esc(s.date)}">${formatDate(s.date)}</time>
        <p class="timeline-item__type">国会 · ${esc(s.nameOfHouse)} · ${esc(s.nameOfMeeting)}</p>
        <div class="event-card">
          <p class="event-card__who">${esc(s.speaker)}${s.speakerGroup ? `（${esc(s.speakerGroup)}）` : ""}</p>
          <p class="event-card__meta">第${esc(s.session)}回国会 · 号 ${esc(s.issue)} · speechID ${esc(s.speechID)}</p>
          <div class="plain-box">
            <p class="plain-box__label">原文抜粋（speechFull 参照）</p>
            <p>${esc(s.excerpt)}</p>
          </div>
          <blockquote class="quote-block">
            <a href="${esc(s.speechURL)}" target="_blank" rel="noopener">国会議事録で原文を見る ↗</a>
            · <a href="${esc(s.meetingURL)}" target="_blank" rel="noopener">会議全文 ↗</a>
          </blockquote>
        </div>
      </article>
      ${renderXSlots(a.xPosts, a)}
    </section>
${renderComments()}
    <p class="demo-note">※ 発言は国会議事録APIの実データ。X枠は構造のみ（URL・スクショ未）。YouTubeショートは未実装。</p>
  </main>
${renderFloatToc(a, hasStance)}
${renderFloatReact(a)}
  <script src="../js/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

const dir = path.join(root, "data/articles");
const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "index.json");
const outDir = path.join(root, "samples/case");
await mkdir(outDir, { recursive: true });

for (const f of files) {
  const a = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  const stance = await loadStanceData(a);
  const stanceHtml = stance ? renderStanceMatrix(a, stance.matrix, stance.meta, stance.politicians) : "";
  const html = renderArticle(a, stanceHtml, Boolean(stanceHtml));
  await writeFile(path.join(outDir, `${a.slug}.html`), html, "utf8");
  console.log(`html: ${a.slug}${stanceHtml ? " +stance" : ""}`);
}
