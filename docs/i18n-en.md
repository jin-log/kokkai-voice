# 英語版（海外向け）— シンクロリリース

最終更新: 2026-06-26

---

## 結論

**できる。しかも相性いい。**

| 理由 | 内容 |
|------|------|
| **需要** | 海外メディアは日本政治を浅く報じがち。一次ソース＋平易語は空白地帯 |
| **SEO** | 英語クエリは競合が少ない niche（`Japan politics explained`, `Tokyo governor recall`） |
| **構造** | 案件・タイムライン・😊😠 は **言語非依存**。要約だけ EN 版を足す |
| **技術** | 同一 Astro リポ、`/en/` パス + hreflang。Cloudflare 無料枠のまま |

---

## URL 設計

```
/                          … 日本語トップ
/case/bouka-taisaku/       … 日本語案件
/en/                       … English home
/en/case/bouka-taisaku/    … English case（slug は共通・ローマ字）
/search?q=                  … 日本語検索
/en/search?q=               … English search
```

**slug は日英共通**（`tokyo-governor`, `bouka-taisaku`）→ シンクロ・hreflang ペアが簡単。

---

## SEO（海外から「ばちばち」）

### hreflang（必須）

```html
<link rel="alternate" hreflang="ja" href="https://example.com/case/bouka-taisaku/" />
<link rel="alternate" hreflang="en" href="https://example.com/en/case/bouka-taisaku/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/en/case/bouka-taisaku/" />
```

`x-default` を **en** にするか **ja** にするかはオーナー判断（海外優先なら en）。

### 狙う英語クエリ例

| 案件 | クエリ例 |
|------|----------|
| 物価高 | `Japan inflation policy 2026`, `Japanese diet price measures` |
| 都知事 | `Tokyo governor scandal explained`, `Tokyo governor recall` |
| 外国人政策 | `Japan immigration policy debate` |
| 一般 | `Japan politics explained simply`, `what happened Japan politics` |

**title 例:**
`Tokyo Governor: What Happened? (Plain English) | Japan Politics Now`

### 構造化データ

- `NewsArticle` or `Article` + `inLanguage: en`
- 原文リンク（国会 URL）はそのまま — **出典は日本語でも OK**

---

## コンテンツ方針

| 要素 | 英語版 |
|------|--------|
| **あの話どうなった？** | AI 翻訳 → CEO 軽チェック（固有名詞・数字） |
| **つまり** 平易語 | **ネイティブ寄りに書き直し**（直訳より重要） |
| **用語辞典** | 必須（`fiscal stimulus` = 国がお金を出す…） |
| **国会原文** | 英訳要約のみ。原文は JA リンク |
| **X スクショ** | **画像共通**。キャプション EN |
| **😊😠** | 数字共通（言語不要） |
| **コメント** | MVP: JA/EN 別棚 or タグ。将来: 統合＋自動翻訳 |

### 海外読者向けの追加 1 ブロック（推奨）

```
【Context for readers abroad】
- Who is this person? (1 line)
- Why it matters outside Japan (1 line)
```

---

## シンクロリリースの運用

```
1. CEO: 案件 JA 版を完成（実データ・スクショ）
2. AI: EN 要約・用語・title/description 生成
3. CEO: 数字・人名・敏感表現チェック
4. git push 1 回（ja + en 同時）→ Cloudflare デプロイ
5. X: JA アカ告知 + EN アカ（別）告知
```

| モード | 内容 |
|--------|------|
| **フル同期** | JA 公開と同時 EN（理想） |
| **24h 遅延 EN** | JA 先出し → 翌日 EN（品質優先） |
| **EN のみ遅延** | 話題案件だけ EN 優先（海外バズ狙い） |

**KPI 追加案:** EN オーガニック PV / GSC `en` クエリ数

---

## 技術（Astro）

```
src/content/cases/
  bouka-taisaku.ja.md
  bouka-taisaku.en.md
```

または 1 ファイル:

```yaml
lang: ja
title: 物価高対策
titleEn: Cost of Living in Japan
summaryEn: ...
```

`src/pages/en/[...]` — レイアウト共有、`ui.ts` でラベル i18n。

---

## ブランド（英語）

| JA | EN 案 |
|----|-------|
| 日本の政治なう | **Japan Politics Now** |
| あの話どうなった？ | **What happened to that?** |

ドメイン: **`seiji1192.site/en/`** 推奨（SEO 集約）。

---

## リスク

| リスク | 対策 |
|--------|------|
| 翻訳ミスが海外に拡散 | 「AI-assisted」表記・原文リンク |
| 日本特有文脈の欠落 | Context ブロック |
| 運用 2 倍 | 最初は **話題案件のみ EN**（週 1〜2 本） |
| 公選法 | 主に国内。EN は事実報道トーン維持 |

---

## MVP  scope

- [ ] `/en/` トップ + 案件 1 本（物価高 EN）
- [ ] hreflang + EN title/description
- [ ] ヘッダー language switcher（JA | EN）
- [ ] GSC プロパティ同一（国際ターゲット設定）

## 次

「EN サンプル 1 ページ」→ `samples/en/case/bouka-taisaku.html` モック
