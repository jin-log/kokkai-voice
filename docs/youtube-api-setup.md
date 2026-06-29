# YouTube Data API — Shorts 自動投稿

最終更新: 2026-06-29

ショート動画を **YouTube Data API v3** でアップロードする。初回だけ Google 認証（OAuth）が必要。

---

## 1. Google Cloud で準備（15分・1回）

同じ GCP プロジェクト（Indexing API 用）でも別でも可。

1. [Google Cloud Console](https://console.cloud.google.com/) → プロジェクト選択
2. **API とサービス** → **ライブラリ** → **YouTube Data API v3** → **有効化**
3. **API とサービス** → **認証情報** → **認証情報を作成** → **OAuth クライアント ID**
4. 同意画面（未設定なら）:
   - ユーザータイプ: **外部**
   - アプリ名: `政治なう`（任意）
   - スコープ: 後からでOK
   - テストユーザー: **投稿に使う Google アカウント**を追加
5. OAuth クライアント:
   - アプリの種類: **デスクトップアプリ**
   - 名前: `kokkai-voice-youtube`
6. 発行された **クライアント ID / シークレット** をコピー

---

## 2. リポに配置

```powershell
Copy-Item secrets\youtube-oauth.example.json secrets\youtube-oauth.json
```

`secrets/youtube-oauth.json` を編集:

```json
{
  "client_id": "123456789-xxxx.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxxx",
  "redirect_uri": "http://localhost:8765/oauth2callback"
}
```

**GCP の「デスクトップ」クライアント**ではリダイレクト URI は通常自動。上記 localhost を許可リストに足せない場合は、コンソールのデスクトップ用デフォルトのままでも可（スクリプトは 8765 固定）。

`.gitignore` 済み（コミットしない）:
- `secrets/youtube-oauth.json`
- `secrets/youtube-token.json`

---

## 3. 初回認証（1回）

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
npm run youtube:auth
```

1. ブラウザが開く
2. **日本の政治now チャンネルの Google アカウント**でログイン
3. 「このアプリは確認されていません」→ **詳細** → **（安全ではないページ）に移動**（テストモードのため）
4. YouTube へのアクセスを **許可**
5. `secrets/youtube-token.json` ができる

---

## 4. アップロード

```powershell
# 文案パック生成（任意・未実行でも upload は動く）
npm run short:upload-pack

# 本番公開
npm run short:upload -- --slug shussho-budget-seika

# テスト（非公開）
npm run short:upload -- --slug shussho-budget-seika --private

# 確認のみ
npm run short:upload -- --slug shussho-budget-seika --dry-run
```

成功すると:
- `output/shorts/{slug}/youtube-upload-result.json` に videoId・URL
- コメントは自動投稿（**ピン留めは Studio で手動** — API 非対応）

---

## 5. 投稿順（推奨）

```powershell
npm run short:upload -- --slug shussho-budget-seika
# 3〜7日後
npm run short:upload -- --slug shoshika
```

---

### 白画面（localhost:8765）が出た

Google の許可は **通っている**。白画面＝ターミナル側の待受が止まっていた。

アドレスバーの **URL 全体** をコピーして:

```powershell
npm run youtube:auth -- --callback-url="（ここにURLを貼る）"
```

例: `http://localhost:8765/oauth2callback?code=4/0A...&scope=...`

---

## トラブル

| 症状 | 対処 |
|------|------|
| `未認証` | `npm run youtube:auth` |
| `403 accessNotConfigured` | YouTube Data API v3 を有効化 |
| `403 insufficientPermissions` | テストユーザーに自分を追加 / 本番公開申請 |
| `uploadLimitExceeded` | 1日のクォータ超過 — 翌日 |
| チャンネル違い | 認証に使った Google ≠ チャンネル所有者 |

クォータ: デフォルト **10,000 units/日**。1アップロード ≈ **1,600 units** → 1日あたり数本程度。

---

## コマンド一覧

| コマンド | 用途 |
|----------|------|
| `npm run youtube:auth` | OAuth 初回 |
| `npm run short:upload-pack` | タイトル・説明 JSON/txt 生成 |
| `npm run short:upload -- --slug X` | API アップロード |
