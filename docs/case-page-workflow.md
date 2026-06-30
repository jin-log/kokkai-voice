# 1案件ページ完遂ワークフロー

最終更新: 2026-06-27  
**毎回:** `npm run pipeline` → 次アクション表示。順番は機械固定。

---

## 結論

**1 slug = ①〜⑥全部OK = 100%。**  
**active 5件が全部100% → `npm run pipeline:promote` で次5件を active へ。**  
止めない。完了まで回す。

---

## パイプライン（順番固定・毎回これ）

```
①コンテンツ → ②〇× → ③X → ④法務 → ⑤デプロイ → ⑥デバッグ
```

| # | 担当 | 成果物 | デプロイ前? |
|---|------|--------|------------|
| ① | ライター | 経緯・要約・timeline（**`docs/writer-editorial.md` 必読**） | 前 |
| ①b | ライター | **セクション別**: 経緯＝日付ごと別文、根拠＝結論の裏付け、メリデメ＝得失（件数禁止）、〇×＝方針要約＋行動の動詞 | 前 |
| ② | ライター | policy-matrix + stanceMatrix（**方針＝要約・行動＝具体動詞**） | 前 |
| ③ | x-researcher | X検証2件+ | 前 |
| ④ | 法務 | legalReview.status: ok | **前（最終関門）** |
| ⑤ | CEO | npm run deploy | 後 |
| ⑥ | デバッガー | qaReview.status: ok | **後** |

**公開ゲート** = ①〜④ + `check-case-page` exit 0（**B4結論・D2経緯話題・E4TL国会話題・G6〇×話題** 含む）。  
**100%** = ⑥まで。

---

## 毎回の CEO コマンド

```powershell
cd C:\Users\bero1\Projects\kokkai-voice
npm run pipeline                    # 全 active の完成度 + 次やること
npm run pipeline -- --slug X        # 1件
node scripts/check-case-page.mjs --slug X
npm run deploy                      # ④までOKの slug のみ反映
npm run pipeline:promote            # active 全件100%のとき次5件昇格
```

**デプロイだけ先にやらない。** pipeline の「次:」を上から消化。

---

## バッチ運用（5件ずつ）

| ファイル | 役割 |
|---------|------|
| `data/articles/index.json` | **active**（最大5件同時） |
| `data/articles/parked.json` | 待機17件 |

昇格条件: active **全件** goldPct 100% → parked 先頭5件を index に追加。

---

## 参照

- `docs/publish-gate.md` — 公開ゲート vs 100%
- `scripts/run-case-pipeline.mjs` — 正本スクリプト
