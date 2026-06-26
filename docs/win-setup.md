# Windows での作業（Mac と同じこと）

最終更新: 2026-06-26（Mac 作業分の引き継ぎ）

---

## CF（Cloudflare）って何？

**サイトをネットに公開する無料の配信サービス。** ドメイン `seiji1192.site` の DNS はすでに CF 経由。

| 用語 | 意味 |
|------|------|
| **Cloudflare（CF）** | ドメイン・HTTPS・CDN・**Pages（静的サイトホスティング）** |
| **CF Pages** | GitHub の `kokkai-voice` をビルドして `seiji1192.site` で配信する機能 |
| **jin-log との関係** | 同じ CF アカウントを使える。リポ・ドメインは別 |

**いま:** コードは GitHub にある。**本番公開（Pages 接続）は未完了** — Win でも Mac でも同じ手順でできる。

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

## Mac で終わっていること（2026-06-26）

| 項目 | 状態 |
|------|------|
| Astro 本番 | ✅ `src/` · 22 ページ |
| 実データ | ✅ 20 案件 + X URL 95/100 |
| GitHub | ✅ `main` @ `c0adf08` 以降 |
| O8 法務方針 | ✅ `docs/owner-policy.md` |
| O14 公開 GO | ✅ `bouka-taisaku` publishReady |
| X アカ | ✅ `@seiji1192site`（フッターにリンク済み） |
| note | 方針のみ・URL 未 |
| **CF Pages デプロイ** | ⬜ **未**（API トークンなしで Mac からは失敗） |

---

## 本番公開（Win でも Mac でも同じ）

**A. CF ダッシュボード（おすすめ・トークン不要）**

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Connect to Git**
2. リポ `jin-log/kokkai-voice`
3. Framework **Astro** · Build `npm run build` · Output `dist` · `NODE_VERSION=20`
4. **Custom domains** → `seiji1192.site`

**B. wrangler（jin-log と同じトークンが使える場合）**

```powershell
$env:CLOUDFLARE_API_TOKEN="（トークン）"
$env:CLOUDFLARE_ACCOUNT_ID="（アカウントID）"
npm run build
npx wrangler pages deploy dist --project-name=kokkai-voice --branch=main
```

**C. GitHub Actions** — `.github/workflows/deploy-pages.yml` をリポに入れたうえで、Secrets に上記 2 つを設定（PAT に `workflow` 権限が必要）。

詳細: `docs/deploy-cloudflare.md`

---

## 日常の開発コマンド（Mac と同一）

| 作業 | コマンド |
|------|----------|
| 開発サーバー | `npm run dev` → :4321 |
| 本番ビルド | `npm run build` → `dist/` |
| サンプル UI | `cd samples` → `.\preview.ps1` → :8770 |
| 法務チェック | `node scripts/check-publish-ready.mjs --slug bouka-taisaku` |
| 記事再生成 | `node scripts/generate-case-pages.mjs` |

---

## 同期のしかた

| やりたいこと | コマンド |
|--------------|----------|
| **全部取り込む（これだけ）** | `ceo-sync\scripts\ceosync.ps1 pull`（Win） / `ceo-sync/scripts/ceosync.sh pull`（Mac） |
| ルールを上げる | オーナーが **ceosync push** → CEO が push |

`ceosync pull` = ceo-sync + jin-log + ff14 + **kokkai-voice** の clone/pull + npm ci。
