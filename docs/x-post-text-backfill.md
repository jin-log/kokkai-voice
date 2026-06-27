# X投稿 post_text 補完手順

`data/articles/*.json` の `xPosts` に `post_url` だけあり `post_text` が空のときの補完。

## スクリプト

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
node scripts/x-backfill-post-text.mjs shohizei-genmen bouka-taisaku
```

- **API**: [fxtwitter](https://api.fxtwitter.com/)（公開・X API 不要）
- **上書きしない**: 既存 `post_url`・`account_label` は維持。`post_text` のみ追加
- **間隔**: リクエスト間 350ms（レート制限対策）

## 関連

| スクリプト | 用途 |
|-----------|------|
| `scripts/x-backfill-post-text.mjs` | 登録済み URL の本文補完 |
| `scripts/x-research-batch.mjs` | キーワードから URL 新規探索（**xPosts 全置換**） |

`x-research-batch.mjs` は手動登録 URL を消すので、補完だけなら backfill を使う。

## 失敗時

| 理由 | 対応 |
|------|------|
| HTTP 404 / 429 | 時間をおいて再実行 |
| `no tweet in response` | 削除済み・非公開・凍結の可能性。手動確認 or スクショ OCR（`docs/x-archive.md`） |
| `invalid URL` | `post_url` 形式を `https://x.com/{handle}/status/{id}` に修正 |
