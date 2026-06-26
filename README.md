# kokkai-voice（仮称）

**政治で関心が高いこと**を案件単位で追い、国民が **Good / Bad** で感情を示し、コメント・ショート動画とともに議論できるメディア。  
国会議事録は柱の一つ。都政・リコール・スキャンダル等も同じ UI で扱う（`docs/politics-scope.md`）。

**ステータス:** 企画・調査フェーズ（MVP 未着手）

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
| [docs/branding.md](docs/branding.md) | サイト名・公開条件・Cloudflare |
| [docs/sns-strategy.md](docs/sns-strategy.md) | 集客・X 方針 |
| [docs/x-archive.md](docs/x-archive.md) | X リンク＋スクショ保存（API 不使用） |

## ローカル

```
~/Projects/kokkai-voice   （Win: C:\Users\bero1\Projects\kokkai-voice）
```

### UI サンプル（デザインモック）

```powershell
cd C:\Users\bero1\Projects\kokkai-voice\samples
.\preview.ps1
```

→ http://localhost:8770/ （トップ）  
→ http://localhost:8770/case/bouka-taisaku.html （案件デモ）

## 注意

- 医療ブログ（jin-log）とは **別プロジェクト**
- 政治・名誉毀損・選挙関連の法規制は MVP 前に `docs/concept.md` のコンプライアンス節を要確認
