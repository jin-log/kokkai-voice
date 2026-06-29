# Buffer — X 自動投稿セットアップ

**方針**: 初回だけオーナー作業。以降 deploy 時に CEO が自動投稿（日上限3本）。

---

## 1. Buffer アカウント

1. [buffer.com](https://buffer.com) で無料登録
2. **Channels** → **X（Twitter）** を接続 → `@seiji1192site`

---

## 2. API キー発行

1. Buffer → **Account Settings** → **API**
2. **Create API Key**（Personal API key）
3. キーをコピー（再表示不可）

---

## 3. Secret 登録

### GitHub Actions（本番 deploy 用）

リポジトリ → Settings → Secrets → Actions:

| Secret | 値 |
|--------|-----|
| `BUFFER_API_KEY` | 発行したキー |

`BUFFER_CHANNEL_ID` は **通常不要**（X チャンネルは自動検出）。

### Cloudflare Pages（管理画面ライブチェック用）

Pages → kokkai-voice → Settings → Environment variables:

| 変数 | 値 |
|------|-----|
| `BUFFER_API_KEY` | 同上 |
| `ADMIN_PIN` | `1192`（既存と同じ） |

### ローカル（任意）

```powershell
Copy-Item secrets\buffer.env.example secrets\buffer.env
# buffer.env に BUFFER_API_KEY=... を記入
```

PowerShell 一時設定:

```powershell
$env:BUFFER_API_KEY = "your-key"
node scripts/check-buffer.mjs
```

---

## 4. 動作確認

```powershell
node scripts/check-buffer.mjs
# → OK Buffer — 連携OK: @seiji1192site に投稿可能

node scripts/post-to-buffer.mjs --slug shussho-budget-seika --dry-run
# 文案のみ表示

node scripts/post-to-buffer.mjs --slug shussho-budget-seika
# 本番投稿（1回だけテスト推奨）
```

---

## 5. 自動化（deploy 時）

`npm run deploy` / GitHub Actions の末尾:

1. `node scripts/post-to-buffer.mjs --recent 1` — 直近公開1件を X 投稿
2. `node scripts/check-buffer.mjs` — 状態 JSON 更新

**日上限**: 3本/日（`post-to-buffer.mjs` 内 `DAILY_CAP`）

---

## 6. 管理画面での表示

`/dev/status/` → **Buffer × X 自動投稿** パネル

| 表示 | 意味 |
|------|------|
| 連携OK | 投稿可能 |
| X 未連携 | Buffer で X を再接続 |
| APIキー無効 | キー再発行 → Secret 更新 |
| 投稿失敗 | 直近 post が NG — fixSteps を表示 |

15秒ごとに `/api/buffer-status` でライブチェック。

---

## レート上限（無料）

| 窓 | 上限 |
|----|------|
| 15分 | 100回 |
| 24時間 | 100回 |
| 30日 | 3,000回 |

政治なう（日3本）では十分。

---

## 連携が切れたとき

1. 管理画面に **赤表示** + 復旧手順
2. buffer.com → Channels → X **Reconnect**
3. 必要なら API キー再発行 → Secret 更新
4. 管理画面「再チェック」または deploy 再実行
