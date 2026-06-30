# GitHub Secrets 登録（はてな・note 公開連動）

**前提:** `secrets/browser/chrome-profile.json` に Profile 9 設定済み

## 1. Chrome を全部閉じる

## 2. エクスポート

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
npm run browser:setup
npm run browser:export-state
```

→ `secrets/browser/state-hatena.json` と `state-note.json` ができる

## 3. GitHub Secrets に登録

リポジトリ → Settings → Secrets → New repository secret

| Secret名 | 値 |
|----------|-----|
| `HATENA_BROWSER_STATE` | `state-hatena.json` の**ファイル全文**をコピペ |
| `NOTE_BROWSER_STATE` | `state-note.json` の**ファイル全文**をコピペ |

（`BUFFER_API_KEY` と同じ画面。別物。）

## 4. 動作確認

1. 管理画面で記事を「公開する」
2. Actions →「公開時プロモ（はてな・note）」が success か確認

## ローカルだけ（Secrets 不要）

```powershell
npm run deploy
```

`deploy:extras` が Profile 9 で直接 `promo:publish` を実行。
