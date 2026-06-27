# 公開スコープ（少数・100%優先）

最終更新: 2026-06-27  
**方針:** ページ数は増やさない。**1ページ100% → 次を1ページ**。

---

## active — 3件

`data/articles/index.json` 参照。詳細は `docs/publish-gate.md`。

---

## 100%の定義（6段階・順番固定）

| # | 段 | デプロイ前? |
|---|-----|------------|
| ① | コンテンツ | 前 |
| ② | 〇×2党確定 | 前 |
| ③ | X検証2件+ | 前 |
| ④ | 法務OK | **前（最終関門）** |
| ⑤ | 本番デプロイ | 後 |
| ⑥ | デバッグOK | **後** |

**公開ゲート** = ①〜④。  
**100%** = ①〜⑥。

---

## parked（17件）

`data/articles/parked.json` — データのみ保持、ビルド対象外。

---

## コマンド

```powershell
npm run status
npm run deploy   # ゲート通過分のみ反映 + deployedAt 更新
```

Web: 全ページ下部 + [/status/](https://seiji1192.site/status/)
