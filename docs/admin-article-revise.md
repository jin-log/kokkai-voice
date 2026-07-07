# 管理画面 — ブロック修正 UI

最終更新: 2026-07-07  
**正本（コード）:** `src/lib/article-revise-sections.mjs` · **API:** `functions/api/article-revisions.js`

---

## URL

| 画面 | パス |
|------|------|
| 記事一覧 | `/dev/articles/` |
| ブロック修正 | `/dev/articles/revise/{slug}/` |

本番: https://seiji1192.site/dev/articles/revise/{slug}/（PIN 1192）

---

## 流れ（オーナー → 本番）

```
指示入力 → ライターに依頼 → 差分プレビュー → 保存する
    → GitHub main の JSON 更新 → deploy.yml 起動 → 3〜5分で seiji1192.site 反映
```

- **保存先はセクションごとに異なる**（下表）
- 〇×だけ `data/policy-matrix/{slug}.json`、他は `data/articles/{slug}.json`
- 保存時は `editorial-rules.json` の lint を通す（blocker なら保存拒否）

---

## セクション一覧

| ID | 表示名 | 担当 | 保存先ファイル | フィールド |
|----|--------|------|----------------|------------|
| `title_opening` | タイトル・1行目 | writer | article JSON | `title`, `summaryBullets[0]` |
| `nowSummary` | いまの結論 | writer | article JSON | `nowSummary.bullets` |
| `summaryBullets` | 要点 | writer | article JSON | `summaryBullets` |
| `arcSummary` | 経緯 | writer | article JSON | `arcSummary` |
| `timeline` | タイムライン | writer | article JSON | `timeline[].summaryPlain` |
| `stance` | 〇×・公言と行動 | writer | **policy-matrix JSON** | `parties[].stance.text`, `action.text`, `symbol` |
| `xPosts` | X投稿 | x-researcher | — | 提案のみ（保存未対応） |
| `glossary` | 用語解説 | writer | article JSON | `glossary` |
| `prosCons` | メリデメ | writer | article JSON | `prosCons.merits/demerits` |
| `impact` | 利害整理 | writer | article JSON | `meritsDemerits` |
| `statsSeries` | 数値統計 | writer | article JSON | `statsSeries`（棒グラフ） |

テンプレ文言: 各セクションの「ブロックテンプレ（記入例）」／正本 `functions/lib/revise-section-templates.js`

---

## 保存可 / 不可

| セクション | 提案 | 保存 | 備考 |
|------------|------|------|------|
| タイトル・1行目 | ○ | ○ | |
| いまの結論 | ○ | ○ | 編集ルール lint あり |
| 要点 | ○ | ○ | 同上 |
| 経緯 | ○ | ○ | 同上 |
| タイムライン | ○ | ○ | サニタイズ＋lint |
| 〇×・公言と行動 | ○ | ○ | matrix JSON。`stance.text` を表示 |
| X投稿 | ○ | **×** | 次フェーズ |
| 用語解説 | ○ | ○ | |
| メリデメ | ○ | ○ | `prosCons` |
| 利害整理 | ○ | ○ | `meritsDemerits`（メリデメと別枠） |
| 数値統計 | ○ | ○ | `chart.points` 2点以上で棒グラフ |

**差分が空（before === after）のとき**は赤緑を出さず「変更案なし」と表示。

---

## 分析ブロック（品質ゲート）

メリデメ・利害・数値統計は **0種NG・1〜3種OK**（`J1_analytical_blocks`）。

| ブロック | 最低条件 |
|----------|----------|
| メリデメ | メリ2＋デメ2、各 `figure`＋`sourceUrl` |
| 利害 | 支持・懸念各1以上、計2件以上、出典必須 |
| 数値統計 | `chart.points` 2点以上（本番で棒グラフ） |

---

## 〇×表の表示形式（管理画面）

```
◎ 自由民主党
公言: …
行動: …
判定: …
出典: https://…
```

**読むフィールド:** `parties[].stance.text` / `action.text`（`stanceLabel` は使わない）

---

## 関連ファイル

| 用途 | パス |
|------|------|
| セクション定義 | `src/lib/article-revise-sections.mjs` |
| 提案生成・保存 | `functions/lib/article-revisions-core.js` |
| 〇×整形 | `functions/lib/revise-stance-format.js` |
| 利害・数値整形 | `functions/lib/revise-analytical-format.js` |
| 蓄積ルール | `data/article-revisions.json` |
| 編集ルール lint | `data/editorial-rules.json` |
| スキル | `.cursor/skills/kokkai-article-revise/SKILL.md` |

---

## メンテ

```bash
# 壊れた proposed job を一括却下
node scripts/prune-stale-revision-jobs.mjs

# 〇×表示の回帰テスト
npm run test:revise-stance
```
