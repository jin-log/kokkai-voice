/**
 * 重複整理:
 * 1) サイト: テーマ重複のうちスキ無しを adminHidden
 * 2) note: 同一タイトルの二重投稿のうちスキ0を削除
 *
 * node scripts/apply-dup-cleanup.mjs           # dry-run
 * node scripts/apply-dup-cleanup.mjs --apply   # 実行
 * node scripts/apply-dup-cleanup.mjs --apply --site-only
 * node scripts/apply-dup-cleanup.mjs --apply --note-only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchPromoBrowser, closePromoBrowser } from "./lib/promo-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const siteOnly = process.argv.includes("--site-only");
const noteOnly = process.argv.includes("--note-only");
const doSite = !noteOnly;
const doNote = !siteOnly;

const MIN_MATCH = 50;

async function fetchNotes() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://note.com/api/v2/creators/seiji1192/contents?kind=note&page=${page}`;
    const r = await fetch(url);
    const j = await r.json();
    all.push(...(j.data?.contents || []));
    if (j.data?.isLastPage) break;
  }
  return all.map((c) => ({
    noteId: c.key,
    title: c.name,
    likes: c.likeCount ?? 0,
  }));
}

function norm(s) {
  return String(s)
    .replace(/^["']+|["']+$/g, "")
    .replace(/["'[\]【】\s　]/g, "")
    .replace(/国会・政府出典付きで.*$/, "")
    .toLowerCase();
}

function titleScore(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) return 80;
  let i = 0;
  while (i < Math.min(na.length, nb.length) && na[i] === nb[i]) i++;
  if (i >= 12) return 50 + i;
  return 0;
}

function likesForTitle(title, notes) {
  let best = 0;
  let noteId = null;
  for (const n of notes) {
    if (titleScore(title, n.title) >= MIN_MATCH) {
      if (n.likes > best) {
        best = n.likes;
        noteId = n.noteId;
      }
    }
  }
  return { likes: best, noteId };
}

function loadArticle(slug) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return { path: p, data: JSON.parse(fs.readFileSync(p, "utf8")) };
}

function hideArticle(slug, reason) {
  const art = loadArticle(slug);
  if (!art) {
    console.log("  skip missing", slug);
    return false;
  }
  if (art.data.adminHidden === true) {
    console.log("  already hidden", slug);
    return false;
  }
  if (!apply) {
    console.log("  [dry] hide", slug, art.data.title);
    return true;
  }
  art.data.adminHidden = true;
  art.data.adminHiddenAt = new Date().toISOString();
  art.data.adminHiddenBy = "dup-cleanup";
  art.data.adminHiddenReason = reason;
  fs.writeFileSync(art.path, `${JSON.stringify(art.data, null, 2)}\n`);
  console.log("  hidden", slug);
  return true;
}

const notes = await fetchNotes();
console.log("note_total", notes.length);

/** @type {{ id: string, label: string, slugs: string[] }[]} */
const dupGroups = [
  { id: "wage", label: "賃上げ・最低賃金", slugs: ["chingin", "minimum-wage-2026"] },
  { id: "pension", label: "年金", slugs: ["nenkin", "pension-kuriage-70"] },
  { id: "birth", label: "少子化・出生", slugs: ["shoshika", "shussho-budget-seika"] },
  { id: "defense", label: "防衛", slugs: ["boeeihi", "boei-tokubetsuzei"] },
  { id: "money", label: "政治とカネ", slugs: ["nichigyo", "seiji-shikin"] },
  { id: "foreign", label: "外国人・不法", slugs: ["gaikokujin-seisaku", "fuhou-immin-trend"] },
  { id: "kishida", label: "岸田政権", slugs: ["kishida-resign", "kishida-seiken-jisshi"] },
];

const siteDel = [];
const siteKeep = [];

console.log("\n=== SITE DUPS ===");
for (const g of dupGroups) {
  const hit = g.slugs
    .map((slug) => {
      const art = loadArticle(slug);
      if (!art) return null;
      const title = String(art.data.title || "").replace(/^["']+|["']+$/g, "");
      const live = art.data.pageReady === true && art.data.adminHidden !== true;
      const { likes, noteId } = likesForTitle(title, notes);
      return { slug, title, live, likes, noteId };
    })
    .filter(Boolean);

  console.log(`\n[${g.label}]`);
  for (const a of hit) {
    console.log(` - ${a.live ? "LIVE" : "----"} suki${a.likes} ${a.slug} | ${a.title.slice(0, 40)}`);
  }

  const withLike = hit.filter((a) => a.likes > 0);
  let keep;
  let del;
  if (withLike.length) {
    keep = withLike;
    del = hit.filter((a) => a.likes === 0);
  } else {
    const ranked = [...hit].sort((a, b) => {
      const sa = (a.live ? 10 : 0) + (a.title.includes("【") ? 1 : 0);
      const sb = (b.live ? 10 : 0) + (b.title.includes("【") ? 1 : 0);
      return sb - sa;
    });
    keep = ranked.slice(0, 1);
    del = ranked.slice(1);
  }
  console.log(" KEEP", keep.map((a) => a.slug).join(", "));
  console.log(" DEL ", del.map((a) => a.slug).join(", "));
  siteKeep.push(...keep.map((a) => a.slug));
  for (const d of del) {
    siteDel.push(d);
  }
}

// note same-title dups
const noteByNorm = new Map();
for (const n of notes) {
  const k = norm(n.title).slice(0, 28);
  if (!noteByNorm.has(k)) noteByNorm.set(k, []);
  noteByNorm.get(k).push(n);
}
const noteDel = [];
console.log("\n=== NOTE SAME-TITLE DUPS ===");
for (const [, arr] of noteByNorm) {
  if (arr.length < 2) continue;
  const ranked = [...arr].sort((a, b) => b.likes - a.likes || a.noteId.localeCompare(b.noteId));
  const keepN = ranked.filter((n) => n.likes > 0);
  const keep = keepN.length ? keepN : [ranked[0]];
  const keepIds = new Set(keep.map((n) => n.noteId));
  for (const n of ranked) {
    if (keepIds.has(n.noteId)) {
      console.log(" KEEP", n.noteId, `suki${n.likes}`, n.title.slice(0, 36));
    } else if (n.likes === 0) {
      console.log(" DEL ", n.noteId, n.title.slice(0, 36));
      noteDel.push(n);
    }
  }
}

// サイト非表示にする記事の note（スキ0）は全部削除。スキ有は残す。
const siteDelNoteIds = new Set();
const keepSiteTitles = new Set(
  siteKeep.map((slug) => {
    const art = loadArticle(slug);
    return art ? norm(String(art.data.title || "")) : "";
  }),
);
for (const d of siteDel) {
  for (const n of notes) {
    if (n.likes > 0) continue;
    if (titleScore(d.title, n.title) >= MIN_MATCH) siteDelNoteIds.add(n.noteId);
  }
}
// 残すサイト記事に対応する note は消さない（同一タイトル二重の片方は除く）
const protectedNoteIds = new Set();
for (const slug of siteKeep) {
  const art = loadArticle(slug);
  if (!art) continue;
  const title = String(art.data.title || "").replace(/^["']+|["']+$/g, "");
  const matches = notes
    .filter((n) => titleScore(title, n.title) >= MIN_MATCH)
    .sort((a, b) => b.likes - a.likes);
  if (matches[0]) protectedNoteIds.add(matches[0].noteId);
}

const noteDeleteIds = [
  ...new Set([...noteDel.map((n) => n.noteId), ...siteDelNoteIds]),
].filter((id) => {
  const n = notes.find((x) => x.noteId === id);
  if (!n) return false;
  if (n.likes > 0) return false;
  // 二重投稿の削除は protected でも「片方」として消してよい。サイト丸ごと削除分は protected 除外。
  if (siteDelNoteIds.has(id) && protectedNoteIds.has(id)) return false;
  return true;
});

console.log("\n=== PLAN SUMMARY ===");
console.log("site hide:", siteDel.map((d) => d.slug).join(", "));
console.log("note delete:", noteDeleteIds.join(", "));
console.log(apply ? "MODE: APPLY" : "MODE: dry-run (pass --apply)");

if (doSite && apply) {
  console.log("\n--- hide site articles ---");
  for (const d of siteDel) {
    hideArticle(d.slug, `dup-cleanup:${d.title}`);
  }
} else if (doSite) {
  console.log("\n--- site dry-run ---");
  for (const d of siteDel) hideArticle(d.slug, "dry");
}

async function deleteNote(page, noteId) {
  const editUrl = `https://editor.note.com/notes/${noteId}/edit/`;
  await page.goto(editUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);

  const tryClick = async (locator) => {
    const n = await locator.count();
    if (!n) return false;
    await locator.first().click({ timeout: 5000 }).catch(() => null);
    return true;
  };

  // メニュー系
  await tryClick(page.locator('button[aria-label*="メニュー"], button[aria-label*="その他"]'));
  await page.waitForTimeout(400);

  if (await tryClick(page.getByRole("button", { name: /記事を削除|削除する/ }))) {
    await page.waitForTimeout(600);
    await tryClick(page.getByRole("button", { name: /削除する|削除/ }));
    await page.waitForTimeout(1500);
    return !page.url().includes(`/notes/${noteId}/edit`);
  }

  if (await tryClick(page.getByText(/記事を削除|このノートを削除|削除する/))) {
    await page.waitForTimeout(600);
    await tryClick(page.getByRole("button", { name: /削除する|削除/ }));
    await page.waitForTimeout(1500);
    return true;
  }

  // 設定パネル
  await tryClick(page.getByRole("button", { name: /設定/ }));
  await page.waitForTimeout(500);
  if (await tryClick(page.getByText(/記事を削除|この記事を削除/))) {
    await page.waitForTimeout(600);
    await tryClick(page.getByRole("button", { name: /削除する|削除/ }));
    await page.waitForTimeout(1500);
    return true;
  }

  // デバッグ用スクショ
  const shot = path.join(root, "output/debug", `note-del-fail-${noteId}.png`);
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
  return false;
}

if (doNote) {
  if (!apply) {
    console.log("\n--- note dry-run ---");
    for (const id of noteDeleteIds) console.log("  [dry] delete note", id);
  } else {
    console.log("\n--- delete notes ---");
    let launched;
    try {
      launched = await launchPromoBrowser("note", { headless: true });
    } catch (e) {
      console.error("note browser:", e.message);
      process.exitCode = 2;
      launched = null;
    }
    if (launched) {
      const page = await launched.context.newPage();
      let ok = 0;
      let fail = 0;
      for (const id of noteDeleteIds) {
        try {
          const deleted = await deleteNote(page, id);
          if (deleted) {
            console.log("  deleted", id);
            ok++;
          } else {
            console.log("  FAIL ui", id);
            fail++;
          }
        } catch (e) {
          console.log("  FAIL", id, e.message);
          fail++;
        }
      }
      await closePromoBrowser(launched);
      console.log(`note delete done ok=${ok} fail=${fail}`);
      if (fail) process.exitCode = 2;
    }
  }
}

fs.mkdirSync(path.join(root, "output"), { recursive: true });
fs.writeFileSync(
  path.join(root, "output/dup-cleanup-plan.json"),
  JSON.stringify(
    {
      apply,
      siteDel: siteDel.map((d) => d.slug),
      siteKeep,
      noteDel: noteDeleteIds,
      keepSiteTitles: [...keepSiteTitles],
    },
    null,
    2,
  ),
);
