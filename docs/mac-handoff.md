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

## 3. シークレット（Git に載らない・手動）

| ファイル | 用途 |
|---------|------|
| `secrets/buffer.env` | Buffer API（X 自動投稿） |
| `secrets/google-service-account.json` | Google Indexing API |

例からコピー:

```bash
cp secrets/buffer.env.example secrets/buffer.env
cp secrets/google-service-account.example.json secrets/google-service-account.json
# 中身を Win と同じキーで埋める（1Password / メモから）
```

Win にしか無い場合: `secrets/buffer.env` と `google-service-account.json` を USB / 暗号化共有で Mac にコピー。

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
