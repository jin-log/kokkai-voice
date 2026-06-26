# 日本の政治なう（仮称 kokkai-voice リポ）

**政治で関心が高いこと**を案件単位で追い、国民の **😊/😠** とコメントで「みんなの気持ち」が見えるメディア。

**ステータス:** MVP 構築中（Astro 静的サイト）

## コンセプト

- **一次情報:** [国会会議録検索システム](https://kokkai.ndl.go.jp/)（国立国会図書館 API）から発言・会議全文を正確に取得
- **AI 解説:** 全文＋箇条書き要約（必ず原文リンク・出典を併記）
- **国民の声:** 記事ごとにフローティング Good / Bad、コメント、関連ショート動画 embed
- **収益:** 広告＋複数マネタイズ案（`docs/monetization.md`）

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/concept.md](docs/concept.md) | プロダクト定義・UX |
| [docs/data-source.md](docs/data-source.md) | 国会議事録 API・取得方針 |
| [docs/architecture.md](docs/architecture.md) | 技術構成案 |
| [docs/monetization.md](docs/monetization.md) | 収益化 |
| [docs/mvp-roadmap.md](docs/mvp-roadmap.md) | 開発フェーズ |
| [docs/kpi.md](docs/kpi.md) | **KGI / KPI（公開前・公開後）** |
| [docs/branding.md](docs/branding.md) | 日本の政治なう・公開条件 |
| [docs/search-ux.md](docs/search-ux.md) | 検索・ソート |
| [docs/shorts-pipeline.md](docs/shorts-pipeline.md) | ショート量産 |
| [docs/i18n-en.md](docs/i18n-en.md) | **英語版・海外 SEO・シンクロ公開** |
| [docs/release-taskboard.md](docs/release-taskboard.md) | **リリースまでタスク・達成度** |
| [docs/win-setup.md](docs/win-setup.md) | **Windows 作業・CF 説明・Mac 引き継ぎ** |
| [docs/sns-strategy.md](docs/sns-strategy.md) | 集客・X 方針 |
| [docs/x-archive.md](docs/x-archive.md) | X リンク＋スクショ保存（API 不使用） |

## ローカル

```
~/Projects/kokkai-voice   （Win: C:\Users\bero1\Projects\kokkai-voice）
```

### Astro 本番サイト（MVP）

```bash
npm install
npm run dev    # http://localhost:4321
npm run build  # → dist/（Cloudflare Pages）
```

案件ページ例: http://localhost:4321/case/bouka-taisaku

### UI サンプル（デザインモック・参照用）

```powershell
cd C:\Users\bero1\Projects\kokkai-voice\samples
.\preview.ps1
```

→ http://localhost:8770/ （トップ）  
→ http://localhost:8770/case/bouka-taisaku.html （案件デモ）

## 注意

- 医療ブログ（jin-log）とは **別プロジェクト**
- 政治・名誉毀損・選挙関連の法規制は MVP 前に `docs/concept.md` のコンプライアンス節を要確認
