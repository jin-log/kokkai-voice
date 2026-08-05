# Mac 引き継ぎ（2026-08-05）

Win から push した作業メモ。Mac で `git pull` してから再開。

## 今やること（優先）

1. **非公開記事を公開する編集**（`pageReady` 化）
2. ショート制作キューの続き（rank3〜）— テンプレ横展開

## 必須ルール / スキル

| 用途 | パス |
|------|------|
| 記事公開優先（スクショ後追い可） | `.cursor/rules/article-publish-priority.mdc` |
| 記事改稿（管理画面ブロック修正） | `.cursor/skills/kokkai-article-revise/SKILL.md` |
| ライター | `.cursor/skills/kokkai-writer/SKILL.md` |
| 見出し | `.cursor/skills/kokkai-headlines/SKILL.md` |
| ショート構成テンプレ | `.cursor/skills/kokkai-short-video/SKILL.md` |
| フック2秒 | `.cursor/skills/kokkai-short-hook/SKILL.md` |
| 完成報告のローカルリンク | `.cursor/rules/short-local-link.mdc` |
| 品質巡回を止めない | `.cursor/rules/patrol-never-stop.mdc` |

ceo-sync 側のロールルール（`@kokkai-voice/writer` 等）も Mac に入っている前提。無ければ `ceosync pull`。

## ショート制作キュー（正本）

`data/shorts-production-queue.json`

- 運用: **pageReady → ショート制作 → 投稿** を1セット
- 試作はいつでも可。投稿は pageReady 後のみ
- LIVEキュー25本＋`kenpo`（needs_page_ready）
- 除外（既ショート/別扱い）: `case-mqzxgs3f` / `case-mr0jbdpc` / `komei-kokumin` / `shoshika` / `chingin`

### 確定テンプレ（shohizei-genmen 採用）

- テロップ **1行1枚**、約 **2秒台** で分割
- フックは **数字 → 矛盾** の2枚
- 背景は `SLUG_BEAT_CLIPS` でトピック関連のみ
- 生成: `npm run short:generate -- --slug <slug> --tempo 1.35`
- ビート正本: `scripts/lib/short-beats.mjs` → `F1_BEATS`
- 背景割当: `scripts/lib/short-bg-pick.mjs` → `SLUG_BEAT_CLIPS`

### 進捗（push 時点）

| rank | slug | 状態 |
|------|------|------|
| 1 | shohizei-genmen | 生成済・オーナー承認。YouTube 21:00 公開予約を Win で実施 |
| 2 | tariff-us | 生成済（投稿待ち） |
| 3〜 | … | pending |

## 非公開→公開の要点

- LIVE条件: `pageReady === true` かつ `adminHidden !== true`
- `kenpo` は JSON あるが `pageReady: false`（sitemap 外）
- 公開操作は publish-lock / 管理画面の明示操作（自動で落とさない）
- 参照: `src/lib/publish-lock.mjs` / `src/lib/articles.mjs` / `docs/owner-policy.md`

## 便利コマンド

```bash
git pull --ff-only
npm ci   # 必要なら

# 記事品質
npm run audit:articles:ci

# ショート
npm run short:generate -- --slug <slug> --tempo 1.35 --no-upload
npm run short:upload -- --slug <slug> --at 21:00

# YouTube 再認証（トークン失効時）
npm run youtube:auth

# 本番反映
npm run deploy:mac
```

## secrets

`secrets/` は vault（ceosync）。YouTube は `secrets/youtube-token.json`（gitignore）。Mac で投稿するなら `youtube:auth` または Win で更新した token を secrets 同期。
