# Windows での作業（Mac と同じこと）

最終更新: 2026-06-29

---

## いま Win でやること（3行）

```powershell
cd C:\Users\bero1\Projects\ceo-sync
.\scripts\ceosync.ps1 pull
cd ..\kokkai-voice
npm run deploy:win
```

`ceosync pull` で **main 最新 + npm ci** まで終わる。デプロイは **Wrangler ログイン済み** なら `deploy:win` だけ（OAuth 利用時は API トークン env を自動で外す）。

---

## CF（Cloudflare）って何？

**サイトをネットに公開する無料の配信サービス。** ドメイン `seiji1192.site` の DNS はすでに CF 経由。

| 用語 | 意味 |
|------|------|
| **Cloudflare（CF）** | ドメイン・HTTPS・CDN・**Pages（静的サイトホスティング）** |
| **CF Pages** | GitHub の `kokkai-voice` をビルドして `seiji1192.site` で配信する機能 |
| **jin-log との関係** | 同じ CF アカウントを使える。リポ・ドメインは別 |

**いま:** 本番 `seiji1192.site` 稼働中。Win から `npm run deploy:win` で即反映可能。

---

## Win で続けるとき（ceosync pull だけ）

```powershell
cd C:\Users\bero1\Projects\ceo-sync
.\scripts\ceosync.ps1 pull
```

→ ルール同期 + **kokkai-voice 含む全プロジェクト pull** + `npm ci` まで自動。

Mac も同様: `~/Projects/ceo-sync/scripts/ceosync.sh pull`

手動の `git clone` / `git pull` は **不要**（初回も ceosync pull だけで可）。

---

## 2026-06-29 時点の状態

| 項目 | 状態 |
|------|------|
| 本番サイト | ✅ https://seiji1192.site |
| ロゴ | ✅ 新ブランド PNG（ヘッダー・OGP・favicon） |
| X 自動投稿 | ✅ 昼12時3選 / 夜19時単体（`marketing-daily-digest.yml` / `marketing-hot-single.yml`）。deploy連投は停止 |
| note・はてブ | ✅ 記事公開時（deploy後 `promo-on-publish.yml`）。Profile 9 または Secrets |
| **Win デプロイ** | ✅ `npm run deploy:win`（functions コピー込み） |

---

## 本番デプロイ（Win）

**おすすめ — Wrangler OAuth 済みの場合**

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
npm run deploy:win
```

中身: `CLOUDFLARE_API_TOKEN` を外す → `npm run deploy`（build + functions コピー + Pages + 検索通知 + Buffer）。

**API トークンを使う場合**

```powershell
$env:CLOUDFLARE_API_TOKEN="（トークン）"
$env:CLOUDFLARE_ACCOUNT_ID="f2e88512cd4a09f315291bf2406015d7"
npm run deploy
```

**GitHub Actions** — `main` push で `.github/workflows/deploy.yml` が自動デプロイ（Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, Buffer, GSC）。

詳細: `docs/deploy-cloudflare.md`

### 独自ドメインが NXDOMAIN のとき（CEO 自動修復）

Wrangler の OAuth ログインは **DNS レコード変更権限がない**。`pages.dev` は開くが `seiji1192.site` だけ死ぬ場合は CNAME 未設定。

**オーナー作業（1回・2分）:** Cloudflare → API トークン →「ゾーンの DNS を編集」→ `seiji1192.site` のみ。

**CEO 作業:**

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
$env:CLOUDFLARE_API_TOKEN="（発行したトークン）"
node scripts/fix-dns.mjs
```

---

## マーケ・ブラウザ自動化（Win）

| 作業 | コマンド |
|------|----------|
| Playwright 初回セットアップ | `npm run browser:setup` |
| note / はてな ログイン保存（1回） | `npm run browser:login -- note` / `hatena` |
| **既存 Chrome プロフィール** | `secrets/browser/chrome-profile.json`（例: `docs/chrome-profile.example.json`）に Profile 9 等を指定すると、seiji1192 のログイン状態をそのまま利用。**自動化前にそのプロフィールの Chrome を閉じる** |
| **はてな・note CI用** | `npm run browser:export-state` → GitHub Secrets `HATENA_BROWSER_STATE` / `NOTE_BROWSER_STATE`。詳細 `docs/promo-browser-secrets.md` |
| はてブ登録 | `npm run post:hatena` |
| note 初回（要 `content/note/01-site-intro.md`） | `npm run post:note:intro` |
| X 昼3選（手動） | `npm run buffer:digest` |
| X 夜単体（手動） | `npm run buffer:hot` |

Buffer 秘密情報: `secrets/buffer.env`（ceo-sync vault または Win から Mac へ `import-buffer-env.sh`）。

---

## 日常の開発コマンド（Mac と同一）

| 作業 | コマンド |
|------|----------|
| 開発サーバー | `npm run dev` → :4321 |
| 本番ビルド | `npm run build` → `dist/` |
| 本番反映 | `npm run deploy:win` |
| 法務チェック | `node scripts/check-publish-ready.mjs --slug <slug>` |
| パイプライン + デプロイ | `node scripts/pipeline-autorun.mjs --deploy` |

---

## 同期のしかた

| やりたいこと | コマンド |
|--------------|----------|
| **全部取り込む（これだけ）** | `ceo-sync\scripts\ceosync.ps1 pull`（Win） / `ceo-sync/scripts/ceosync.sh pull`（Mac） |
| workflow を push する | `.\scripts\install-gh-workflows.ps1` → `git add .github/workflows` → push（PAT に **`workflow` スコープ**） |
| ルールを上げる | オーナーが **ceosync push** → CEO が push |

`ceosync pull` = ceo-sync + jin-log + ff14 + **kokkai-voice** の clone/pull + npm ci。
