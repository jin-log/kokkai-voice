---
name: kokkai-article-revise
description: >-
  kokkai-voice 管理画面のブロック修正（/dev/articles/revise/）。オーナー指示から
  提案生成・GitHub保存・デプロイまで。セクション保存先・テンプレ・ゲート確認に使う。
---

# ブロック修正 UI（kokkai-voice）

## いつ使うか

- オーナーが「このセクションだけ直して」と言ったとき
- 管理画面の差分が空・保存不可・表示バグの調査
- `article-revisions.json` の job / ルール整備

**詳細正本:** `docs/admin-article-revise.md`

---

## 手順（オーナー指示 → 本番）

1. **画面** — `/dev/articles/revise/{slug}/` を開く（PIN 1192）
2. **セクション選択** — 左ナビでブロックを選ぶ
3. **テンプレ確認** — 「ブロックテンプレ（記入例）」で記入形式を確認
4. **指示** — 曖昧でOK（例:「答弁だけ並んでる」「表示されてない」）
5. **ライターに依頼** — API `POST /api/article-revisions` action `create`
6. **差分確認** — `before` / `after`。空差分ならコード側の提案生成を疑う
7. **保存する** — action `apply` → GitHub commit → `deploy.yml`
8. **3〜5分後** — 本番・プレビューで反映確認

CEOが代行する場合も同じ。オーナーに英語UIは見せない。

---

## 保存先（必ず確認）

| セクション | 書き込み先 |
|------------|------------|
| stance（〇×） | `data/policy-matrix/{slug}.json` |
| それ以外（保存可） | `data/articles/{slug}.json` |
| xPosts | **保存しない**（提案のみ） |

---

## 実装タッチポイント

| 変更内容 | ファイル |
|----------|----------|
| セクション追加・テンプレ | `revise-section-templates.js`, `article-revise-sections.mjs` |
| 提案ロジック | `functions/lib/article-revisions-core.js` |
| 〇× | `functions/lib/revise-stance-format.js` |
| 利害・数値 | `functions/lib/revise-analytical-format.js` |
| API apply（matrix分岐） | `functions/api/article-revisions.js` |

保存前は必ず `finalizeRevisionArticle`（サニタイズ＋`editorial-rules` lint）。

---

## 分析ブロック

メリデメ / 利害 / 数値統計 — **1〜3種必須、0種NG**。  
ゲート: `src/lib/analytical-blocks.mjs` · `J1_analytical_blocks`

---

## 壊れた job の掃除

```bash
node scripts/prune-stale-revision-jobs.mjs
```

却下対象: `proposed` かつ（`before===after` / `canApply:false` の旧noop / 壊れた〇×表示）

---

## 回帰テスト

```bash
npm run test:revise-stance
```

`formatStanceReviseText` が `stance.text` を読むことを確認。
