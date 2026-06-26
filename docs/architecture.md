# アーキテクチャ案

## 推奨スタック（jin-log 流用）

| 層 | 技術 | 理由 |
|----|------|------|
| フロント | **Astro** + 少量 React | SEO・静的＋動的部分 |
| ホスティング | **Cloudflare Pages** + Workers | jin-log と同運用 |
| DB | **Cloudflare D1** または **Turso** | 投票・コメント |
| KV | **Cloudflare KV** | Good/Bad 集計キャッシュ |
| AI | OpenAI / Claude API（CEO パイプライン） | 要約・解説 |
| 動画 | YouTube oEmbed | 自前配信はコスト大のため外部 embed |
| X 記録 | **R2 + スクショ** | API 不使用。詳細 `docs/x-archive.md` |

## データモデル（案）

```
speeches      … 議事録 API から取った発言（原文）
cases         … 案件（タイトル、status_summary、用語辞典）
case_events   … タイムライン行（speech | x_post | video）
social_posts  … X URL, screenshot_url, captured_at, sha256, status(live|deleted)
reactions     … good | bad（case_id or event_id）
comments      … case_id, author, body, status
```

`visitor_hash` = IP + UA のハッシュ（個人特定しない）

## 記事生成フロー

```
1. CEO/バッチ: API → speeches テーブル
2. AI: 原文 → summary_bullets + context_text（プロンプト固定）
3. 人間 or CEO: タイトル・動画 URL 紐付け
4. 公開 → 静的 HTML 生成 + API ルート（投票・コメント）
```

## Good / Bad 実装

- **MVP:** Workers API `POST /api/react` + D1
- フロント: 記事右下 fixed ボタン、fetch 後にカウント更新
- 集計は KV でキャッシュ、D1 が正本

## コメント

- `POST /api/comments` → status=pending
- 管理画面（Basic Auth or Cloudflare Access）で approve
- 公開ページは approved のみ

## ショート動画

- 記事 frontmatter に `youtubeShortId`
- `<iframe>` or Astro コンポーネント（lazy load）
- 著作権・埋め込みポリシーは YouTube 側に準拠

## ドメイン（未決）

候補はオーナー判断。`.jp` 政治系は空きドメイン要調査。

## 環境変数（`.env.example`）

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `DATABASE_URL`（D1 binding は wrangler.toml）
- 広告 ID（AdSense 等）

## リポ構成（将来）

```
kokkai-voice/
├── src/
├── scripts/          # 議事録 fetch・AI 生成
├── docs/
├── wrangler.toml
└── package.json
```

現時点は **docs のみ** — MVP 着手時に Astro 初期化。
