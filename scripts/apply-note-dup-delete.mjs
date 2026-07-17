/**
 * note 二重投稿・サイト非表示分を API で削除（スキ>0 は絶対消さない）
 * node scripts/apply-note-dup-delete.mjs
 * node scripts/apply-note-dup-delete.mjs --apply
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchPromoBrowser, closePromoBrowser } from "./lib/promo-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const planPath = path.join(root, "output/dup-cleanup-plan.json");

async function fetchNotes() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(
      `https://note.com/api/v2/creators/seiji1192/contents?kind=note&page=${page}`,
    );
    const j = await r.json();
    all.push(...(j.data?.contents || []));
    if (j.data?.isLastPage) break;
  }
  return all;
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
let ids = plan.noteDel || [];
if (!ids.length) {
  console.error("no noteDel in plan");
  process.exit(1);
}

const live = await fetchNotes();
const byKey = new Map(live.map((n) => [n.key, n]));
console.log("plan", ids.length, "live notes", live.length);

const targets = [];
for (const key of ids) {
  const n = byKey.get(key);
  if (!n) {
    console.log(" already gone", key);
    continue;
  }
  if ((n.likeCount ?? 0) > 0) {
    console.log(" SKIP suki", n.likeCount, key, n.name?.slice(0, 30));
    continue;
  }
  targets.push({ key, name: n.name, likes: n.likeCount ?? 0 });
}

console.log("will delete", targets.length);
for (const t of targets) console.log(" -", t.key, t.name?.slice(0, 40));
if (!apply) {
  console.log("dry-run — pass --apply");
  process.exit(0);
}

const launched = await launchPromoBrowser("note", { headless: true });
const page = await launched.context.newPage();
let ok = 0;
let fail = 0;

for (const t of targets) {
  try {
    const detail = await page.request.get(`https://note.com/api/v3/notes/${t.key}`);
    const body = await detail.json();
    const id = body?.data?.id;
    const likes = body?.data?.like_count ?? 0;
    if (!id) {
      console.log(" FAIL no id", t.key);
      fail++;
      continue;
    }
    if (likes > 0) {
      console.log(" SKIP suki", likes, t.key);
      continue;
    }
    const r = await page.request.fetch(`https://note.com/api/v1/notes/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://editor.note.com",
        Referer: `https://editor.note.com/notes/${t.key}/edit/`,
      },
    });
    const text = await r.text();
    if (r.ok()) {
      console.log(" deleted", t.key, text.slice(0, 80));
      ok++;
    } else {
      console.log(" FAIL", t.key, r.status(), text.slice(0, 120));
      fail++;
    }
  } catch (e) {
    console.log(" FAIL", t.key, e.message);
    fail++;
  }
}

await closePromoBrowser(launched);

const after = await fetchNotes();
console.log(`done ok=${ok} fail=${fail} remaining_notes=${after.length}`);
fs.writeFileSync(
  path.join(root, "output/note-dup-delete-result.json"),
  JSON.stringify({ ok, fail, remaining: after.length, at: new Date().toISOString() }, null, 2),
);
if (fail) process.exitCode = 2;
