# 週次ルーティン

最終更新: 2026-06-28  
頻度: **毎週月曜 9:00（JST）** — オーナー作業 **45〜60分**

関連: `docs/publish-routine.md` · `docs/traffic-zero-cost-playbook.md` §H · `docs/note-monetization-pdca.md`

---

## 週の役割分担

| 曜日 | CEO（自動/スクリプト） | オーナー |
|------|------------------------|----------|
| **月** | 週次ダイジェスト生成 · GSCレポート下書き | note 投稿 · GSC確認 · X週次1本 |
| 火〜木 | 新規下書き · 既存 audit 反映 | 案件公開 GO · 公開日プロモ |
| 金 | 進捗更新 · デバッグ | （透析日 — 最小作業） |
| 土日 | batch 執筆 · Skill 改善 | 任意: はてブ · PR |

---

## 月曜ルーティン（メイン）

### Step 0 — CEO: 文案生成（5分）

```powershell
node scripts/generate-weekly-digest.mjs
# → content/promo/weekly-YYYY-MM-DD.md
```

GitHub Actions「マーケ・週次パック」が月曜 9:00 JST に artifact を出す（手動実行も可）。

### Step 1 — SEO 計測（オーナー 15分）

GSC（https://search.google.com/search-console）:

| 見る項目 | アクション |
|----------|------------|
| パフォーマンス（7日） | クリック・表示・CTR メモ |
| インデックス | 未登録 URL があれば「URL検査 → リクエスト」 |
| クエリ | 意外な検索語 → タイトル/description 改善候補を CEO に |

Bing Webmaster（任意・月1で可）: 同様にサイトマップ・クリック確認。

**記録:** スプレッドシート or `docs/kpi.md` に週次1行（playbook §H）

### Step 2 — note 週次ダイジェスト（オーナー 20分）

1. `content/promo/weekly-*.md` を開く
2. note.com/seiji1192 に新規投稿
3. **無料公開**（メンバー限定は将来）
4. タイトル例: `【週次】政治なう 2026-06-30 — 定額給付・インボイスほか`

初回未投稿なら先に `content/note/01-site-intro.md`

### Step 3 — X 週次1本（オーナー 5分）

週次 md 内「X 告知」をコピペ。PNG 1枚添付推奨（今週の代表案件）。

### Step 4 — 追加チャネル（余力・週1つだけ）

ローテーション:

| 週 | チャネル | 内容 |
|----|----------|------|
| W1 | Threads | X 短縮 + PNG |
| W2 | Bluesky | 同左 |
| W3 | Pinterest | 案件カード +2ピン |
| W4 | PRONE / 実績PR | 案件数・更新数 |

---

## 案件公開があった週（追加）

公開ごとに `docs/publish-routine.md` Phase 5 を **その日** 実行。

週次ダイジェストには自動で含まれる（`publishedAt` / `updatedAt` 基準）。

```powershell
node scripts/generate-promo-pack.mjs --recent 7
```

---

## 月1ルーティン（第1月曜）

- [ ] GSC 月次: インデックス率・トップクエリ10
- [ ] CF Analytics: PV・参照元
- [ ] X Analytics: インプレッション推移
- [ ] playbook §C: 実績 PR 再投稿（案件数更新）
- [ ] M10 月次 KPI を `docs/kpi.md` に反映

---

## 产出物一覧（週次）

| ファイル | 内容 |
|----------|------|
| `content/promo/weekly-YYYY-MM-DD.md` | note 本文 + X週次 + SEOチェック |
| `content/promo/{slug}.md` | 公開案件ごとのプロモ（公開日に生成） |
| KPI 1行 | 手動スプレッドシート or kpi.md |

---

## 自動化マップ

| 自動 | 手動 |
|------|------|
| 週次 md 生成（cron / npm script） | note 投稿 |
| プロモパック生成 | X / はてブ 投稿 |
| Deploy | GSC インデックスリクエスト |
| check-case-page / legal | GO 判断 |
| GitHub artifact 保存 | Canva PNG |

---

## コマンド

```powershell
npm run promo:weekly
npm run promo:recent
npm run status
```

---

## KPI 目標（プレリリース期）

| 指標 | 週次目標 |
|------|----------|
| 新規公開 | 1〜3本 |
| X 投稿 | 公開数 + 週次1 |
| GSC インデックス | 新規 URL 100% リクエスト |
| note | 週1（ダイジェスト） |
| はてブ | 新規公開ごと |

正式数値: `docs/kpi.md` · `docs/note-monetization-pdca.md`
