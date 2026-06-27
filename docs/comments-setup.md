# コメント機能 — D1 セットアップ

最終更新: 2026-06-28

コードは実装済み。**Cloudflare 側の D1 作成とバインディング** だけオーナー/CEO が行えば公開できる。

---

## 実装済み

| 項目 | パス |
|------|------|
| 投稿・一覧 API | `functions/api/comments.js` |
| 承認 API | `functions/api/comments-admin.js` |
| スキーマ | `migrations/0001_comments.sql` |
| 案件 UI | `src/components/case/Comments.astro` |
| 管理 UI | `src/pages/dev/comments/` |
| 公開フラグ | `site-config.mjs` → `commentsLive: true` |

---

## 1. D1 作成（Cloudflare ダッシュボード）

1. Workers & Pages → **D1** → Create database → 名前 `kokkai-voice`
2. 作成した DB → **Console** または CLI で `migrations/0001_comments.sql` を実行

```powershell
npx wrangler d1 execute kokkai-voice --remote --file=migrations/0001_comments.sql
```

3. Pages プロジェクト `kokkai-voice` → **Settings** → **Functions** → **D1 bindings**
   - Variable name: `DB`
   - Database: `kokkai-voice`

---

## 2. 環境変数（Pages → Settings → Environment variables）

| 名前 | 用途 |
|------|------|
| `ADMIN_PIN` | 管理 API（既存。例: 1192） |
| `TURNSTILE_SECRET_KEY` | Turnstile シークレット |
| `TURNSTILE_SITE_KEY` | → `site-config.mjs` の `turnstileSiteKey` にも反映 |

Turnstile: Cloudflare ダッシュボード → Turnstile → サイト追加 → `seiji1192.site`

※ `TURNSTILE_SECRET_KEY` 未設定時は検証スキップ（本番前に必ず設定）

---

## 3. 公開手順

1. D1 + 環境変数を設定
2. `main` に push → デプロイ
3. `/dev/comments/` で承認フロー確認
4. `src/lib/site-config.mjs` で `commentsLive: true` → 再デプロイ

`preRelease: true` のままでもコメントだけ先に出せる。

---

## API

```
GET  /api/comments?slug=xxx          … 承認済み一覧
POST /api/comments                   … { slug, name, body, turnstileToken }
GET  /api/comments-admin?pin=…       … 承認待ち一覧
POST /api/comments-admin?pin=…       … { id, action: approve|reject }
```
