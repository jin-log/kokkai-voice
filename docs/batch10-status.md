# 新規10記事 batch10 — 作業結果

最終更新: 2026-06-28  
**状態:** Skill文案適用済・`check-case-page` 全通過・**非公開下書き**（`adminHidden: true`）

---

## 一覧

| slug | タイトル | ゲート | 公開 |
|------|----------|--------|------|
| teigaku-kyufu-2024 | 2024年定額給付3万円、もらえなかった人は？ | ✅ | 非公開 |
| invoice-menzei-2026 | インボイス免税の2割特例、2026年10月まで延長で何が変わる？ | ✅ | 非公開 |
| boei-tokubetsuzei | 防衛特別所得税、給与から年間いくら引かれる？ | ✅ | 非公開 |
| noto-fukko-budget | 能登半島地震、復興予算はいくら入った？ | ✅ | 非公開 |
| gakushu-shien-75000 | 子ども学習支援費7万5千円、使えるものと申請方法 | ✅ | 非公開 |
| denki-gas-genmen | 電気・ガス代の政府支援、2026年も続く？ | ✅ | 非公開 |
| pension-kuriage-70 | 年金70歳まで繰下げ、月額は最大いくら増える？ | ✅ | 非公開 |
| minimum-wage-2026 | 2026年度最低賃金、全国平均はいくらに上がる？ | ✅ | 非公開 |
| expo2025-kessan | 大阪・関西万博、公費は最終いくら？ | ✅ | 非公開 |
| zeihikaku-kojo | 給付付き税額控除って何？消費税ゼロ公約の代替案 | ✅ | 非公開 |

プレビュー: `/dev/preview/{slug}/`

---

## 実行コマンド

```powershell
node scripts/batch-create-articles-batch10.mjs
node scripts/apply-writer-batch10.mjs
node scripts/finish-batch10.mjs
```

---

## 既存記事について

- **本番26本の JSON は変更していない**（タイトル差し替えは `docs/article-rewrite-audit.md` の提案のみ）
- 公開する場合は管理画面 `/dev/status/` から個別 GO

---

## 残課題

- X枠は各1件（seed）。テーマ特化の追加調査は任意
- `expo2025-kessan` は公費最終額が確定報告待ち（記事内で明記）
