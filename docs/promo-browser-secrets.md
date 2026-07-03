# GitHub Secrets 登録（はてな・note 公開連動）

**はてな/note は X（Profile 9）とは別プロファイルです。**

## 1. ログイン（各1回）

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
npm run browser:login -- hatena
npm run browser:login -- note
```

→ `secrets/browser/profile-hatena` / `profile-note` に保存（普段の Chrome とは別ウィンドウ）

## 2. CI用エクスポート

```powershell
npm run browser:export-state
```

→ `secrets/browser/state-hatena.json` と `state-note.json` ができる

## 3. GitHub Secrets に登録

リポジトリ → Settings → Secrets → New repository secret

| Secret名 | 値 |
|----------|-----|
| `HATENA_BROWSER_STATE` | `state-hatena.json` の**ファイル全文**をコピペ |
| `NOTE_BROWSER_STATE` | `state-note.json` の**ファイル全文**をコピペ |

## 4. ローカル投稿（Secrets 不要）

```powershell
npm run promo:publish -- --from-queue --limit 3
```

専用プロファイルがそのまま使われます。
