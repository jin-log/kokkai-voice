# Mac 引き継ぎ（Win → Mac）

Win で進めていた作業を Mac の Cursor でそのまま続ける手順。

## 1. 設定同期（Cursor ルール・CLAUDE.md）

Mac ターミナルで:

```bash
cd ~/Projects/ceo-sync
./scripts/install-mac.sh
```

または Cursor に **「ceosync pull して」** と言う（`scripts/ceosync.sh pull`）。

## 2. リポ取得

```bash
cd ~/Projects/kokkai-voice
git pull --ff-only
npm ci
```

## 3. シークレット（Git に載らない）

**`ceosync pull` で自動復号**（Win で `ceosync push` 済みなら Mac にも来る）。

| ファイル | 用途 |
|---------|------|
| `secrets/buffer.env` | Buffer API（X 自動投稿） |
| `secrets/google-service-account.json` | Google Indexing API |

正本: `ceo-sync/secrets-vault/*.enc`（暗号化）  
鍵: `CEO_SYNC_SECRETS_KEY` または `~/.config/ceosync/secrets.key`（**Mac/Win 同じ**）

**ローカルに無くてもよい操作:**
- X プレリリース告知 → `node scripts/call-post-prerelease.mjs`（本番 CF の BUFFER キー使用）
- デプロイ → GitHub Actions（`deploy.yml`）

Win にしか無い場合（初回のみ）: Win で `CEO_SYNC_SECRETS_KEY` を設定 → `ceosync push` → Mac で `ceosync pull`

## 4. 動作確認

```bash
node scripts/check-buffer.mjs          # Buffer 連携 OK
npm run build                          # ビルド
npm run buffer:check                   # 同上（package.json 経由）
```

## 5. Mac の Cursor に渡す一言（コピペ用）

```
kokkai-voice を Mac に引き継いだ。git pull 済み。
続き: Buffer 本番連携（GitHub Secret + deploy.yml）、万博記事 adminHidden 修正、未 push 分は main に載った。
ルールは @仕事/kokkai-voice.mdc、Buffer 手順は docs/buffer-setup.md。
secrets/buffer.env はローカル配置済み（またはこれから配置）。
```

## 6. 本番・CI（ブラウザ）

| 何 | URL |
|----|-----|
| Deploy 一覧 | https://github.com/jin-log/kokkai-voice/actions/workflows/deploy.yml |
| GitHub Secrets | https://github.com/jin-log/kokkai-voice/settings/secrets/actions |
| 管理画面 | https://seiji1192.site/dev/status/ （PIN 1192） |
| Cloudflare Pages | https://dash.cloudflare.com/ → kokkai-voice |

## 7. この push に含まれる主な未完了タスク

- [ ] GitHub Secret `BUFFER_API_KEY`（任意 `BUFFER_CHANNEL_ID`）
- [ ] Deploy 成功後の Buffer テスト投稿 1 本
- [ ] `admin-article.mjs publish` が `adminHidden` を外していない（万博記事が本番に出ない）
- [ ] batch11 新記事 10 件

## 8. Win 側 stash

Win に `git stash list` が残っている場合は Mac 作業後に `git stash drop` で整理可。
