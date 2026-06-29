# リリースまでタスクボード

最終更新: 2026-06-28  
**公開条件:** 話題案件の実データが 1 本揃い次第（オーナー OK）

凡例: ✅ 完了 · 🟡 一部 · ⬜ 未着手 · 🔒 オーナー必須

---

## 達成度サマリ

| 担当 | 完了/全体 | 達成率 |
|------|-----------|--------|
| **オーナー** | 7 / 14 | **50%** |
| **CEO** | 12 / 28 | **43%** |
| **デザイナー** | 9 / 12 | **75%** |
| **マーケター** | 3 / 35 | **9%** |
| **デバッガー** | 0 / 4 | **0%** |
| **全体（ブロッカー除く）** | 31 / 90 | **約 34%** |

※ 本番 Astro・実データ・ドメインが揃うまで **β 公開は 0%**。

---

## オーナー 🔒

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| O1 | サイト名確定「日本の政治なう」 | ✅ | |
| O2 | 公開タイミング方針（データ揃い次第） | ✅ | |
| O3 | インフラ方針（ドメイン＋CF 無料） | ✅ | |
| O4 | X 別アカ・告知方針 | ✅ | |
| O5 | 😊😠 リアクション方針 | ✅ | |
| O6 | 収益 KGI（12ヶ月 ¥10万/月） | ✅ | |
| O7 | **ドメイン取得** `seiji1192.site`（ムームー） | ✅ | 2026-06-26 |
| O8 | **法務チェック**（公選法・リコール・名誉） | ✅ | AI法務スキャン 20/20 問題なし（2026-06-27） |
| O9 | **専用 X アカウント開設** | ✅ | @seiji1192site 開設済み |
| O10 | **AdSense 申請** | 🟡 | `docs/adsense-application.md` — オーナー作業 |
| O11 | **AI API 予算上限** | ✅ | 無料枠内で自動化（予算設定なし） |
| O12 | コメント方針（匿名 OK / X ログイン） | ✅ | 匿名OK・Xログイン不要に決定 |
| O13 | PR 名義（アイビス vs 個人）・商工会 PR TIMES 無料枠 | ⬜ | `marketing-report-ceo.md` |
| O14 | **プレリリース GO** | ✅ | 2026-06-28 — 触ってもらう段階。正式ローンチは別 |

---

## CEO（実装・調査・自動化）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| C1 | 企画ドキュメント一式 | ✅ | concept / kpi / branding 等 |
| C2 | GitHub リポ | ✅ | kokkai-voice private |
| C3 | UI サンプル v1 | ✅ | samples/ :8770 |
| C4 | 検索・ソート・カテゴリ UX 設計 | ✅ | search-ux.md |
| C5 | 国会議事録 API 調査 | ✅ | data-source.md |
| C6 | アーキテクチャ案 | ✅ | architecture.md |
| C7 | **fetch-speech.mjs（API PoC）** | ⬜ | Phase 1 |
| C8 | **話題案件 1 本・実データ投入** | ⬜ | 公開の最低ライン |
| C9 | **Astro 本番初期化** | ⬜ | Phase 2 |
| C10 | **D1 + Workers（😊😠 国内 IP）** | ⬜ | |
| C11 | **コメント pending → 承認フロー** | 🟡 | API/UI 実装済。D1 バインド + `commentsLive` で公開 |
| C11a | D1 スキーマ + `/api/comments` | ✅ | `migrations/0001_comments.sql` |
| C11b | 承認 API + `/dev/comments/` | ✅ | `functions/api/comments-admin.js` |
| C11c | Turnstile + `commentsLive` フラグ | 🟡 | コード済。CF Turnstile キーはオーナー |
| C11d | **D1 本番バインディング** | 🔒 | Pages → Functions → `DB` |
| C12 | **X スクショ R2 保存** | ⬜ | x-archive.md |
| C13 | **利用規約・プライバシー** | ⬜ | テンプレから |
| C14 | **Cloudflare Pages デプロイ** | ✅ | `seiji1192.site` + pages.dev 稼働中 |
| C15 | **GSC / sitemap / robots** | ⬜ | 公開前 |
| C16 | **リダイレクト・404** | ⬜ | |
| C17 | **モデレーション方針文書** | ⬜ | 内部 1 ページ |
| C18 | 本番 5 案件以上 | ⬜ | kpi Pre-launch |
| C19 | 英語版（話題案件のみ） | ⬜ | 後回し可 |
| C20 | Shorts パイプライン試作 | ⬜ | shorts-pipeline.md |
| C21 | ceo-sync 連携 | ✅ | Mac/Win |
| C22 | **release-taskboard.md** | ✅ | 本ファイル |
| C23 | 半自動: キーワード監視→下書き | ⬜ | Phase 4 |
| C24 | AdSense 申請手順 | ✅ | `docs/adsense-application.md` |
| C25 | 公選法チェックリスト草案 | ⬜ | O8 と連携 |
| C26 | meta / OGP / JSON-LD 本番実装 | ⬜ | SEO 必須 |
| C27 | 案件 RSS | ⬜ | design-proposal 優先 A |
| C28 | 管理画面（最小） | ⬜ | Phase 4 |

---

## CEO 夜間キュー（2026-06-28〜）

| 優先 | タスク | 状態 |
|------|--------|------|
| 1 | C11 コメント API + UI | 🟡 D1 接続待ち |
| 2 | C11c Turnstile キー設定 | 🔒 オーナー |
| 3 | `commentsLive: true` で公開 | 🔒 オーナー GO |

---

## プレリリース告知（オーナー手動・文案ローカル）

文案は **git 未コミット**。作業PC: `C:\Users\bero1\Projects\kokkai-voice\` 配下。

| 順 | タスク | ファイル | セクション |
|----|--------|----------|------------|
| 1 | X スレッド 1/7〜7/7 | `docs/pr/pre-release-announce.md` | X スレッド（7投稿） |
| 2 | X 固定ツイ | 同上 | X 固定ツイ用（1本） |
| 3 | PR-FREE → PRESSNOW → ぷれりり | 同上 | プレスリリース + 投稿順 |
| 4 | はてブ | 同上 | はてブ用 |
| 5 | note 初回（無料公開） | `content/note/01-site-intro.md` | オーナー作業メモ |

索引・オーナーTODO一覧: `docs/pre-release.md`

---

## デザイナー（UI/UX）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| D1 | ブランドロゴ（ひよこ） | ✅ | logo-header PNG |
| D2 | ヘッダー検索 1 つのみ | ✅ | |
| D3 | 一覧カテゴリチップ | ✅ | search.html |
| D4 | ソート説明 UI | ✅ | |
| D5 | ロゴ表示サイズ調整 | ✅ | CSS のみ |
| D6 | ヘッダー余白最適化 | ✅ | 帯 2/3（min-height 7.35rem） |
| D7 | **サンプル → Astro コンポーネント移植** | ⬜ | 本番 |
| D8 | **案件ページ 2 本目デモ**（都政） | ⬜ | politics-scope |
| D9 | **モバイル 😊😠 UX** | ⬜ | design-proposal A |
| D10 | **削除 X Before/After UI** | ⬜ | 差別化核 |
| D11 | **OGP 画像テンプレ** | ⬜ | 案件ごと |
| D12 | design-proposal-ceo.md | ✅ | |
| — | design-handoff.md 運用 | ✅ | 検証チェックリスト |

---

## マーケター（集客・PR）

**正本:** `docs/traffic-zero-cost-playbook.md`（0円・インデックス・PNG・全チャネル）

### 告知・文案

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| M1 | 0 円マーケ一覧 | ✅ | `marketing-report-ceo.md` |
| M2 | SNS 方針文書 | ✅ | `sns-strategy.md` |
| M3 | **公開日 PR 原稿** | 🟡 | 文案準備済・**ローカルのみ** → `docs/pr/pre-release-announce.md` § プレスリリース |
| M4 | **無料 PR 3 サイト投稿** | ⬜ | PR-FREE / PRESSNOW / ぷれりり。順序 → 同ファイル § 投稿順 |
| M5 | **X 初回告知（スレッド7本＋固定）** | 🟡 | 同上 → § X スレッド / § X 固定ツイ用 |
| M6 | **note 初回投稿** | 🟡 | 文案準備済・**ローカルのみ** → `content/note/01-site-intro.md` |
| M7 | **はてブ（代表案件3本）** | ⬜ | `docs/pr/pre-release-announce.md` § はてブ用 |
| M12 | **0円集客プレイブック整備** | ✅ | `docs/traffic-zero-cost-playbook.md` |

### インデックス・SEO（playbook §A）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| M13 | **GSC サイトマップ + 代表案件10 URL インデックスリクエスト** | ⬜ | playbook A1。🔒 オーナー GSC ログイン |
| M14 | **Bing Webmaster + サイトマップ同送** | ⬜ | playbook A2。GSC からインポート可 |
| M15 | **IndexNow（案件更新時 ping）** | ⬜ | playbook A3。CEO 実装 or 手動 ping 手順 |
| M16 | **Google ビジネスプロフィール（オンラインのみ）** | ⬜ | playbook A4。🔒 オーナー |
| M17 | **週次 GSC レポート**（クリック・インデックス・クエリ） | ⬜ | playbook §H。`docs/kpi.md` 連動 |

### PNG・画像拡散（playbook §B）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| M18 | **プレリリース X 用 PNG 3枚**（全体/仕組み/代表案件） | ⬜ | playbook B2/B3。Canva 無料 |
| M19 | **案件サマリカード PNG テンプレ + 代表3案件** | ⬜ | playbook B4 |
| M20 | **案件 OGP 1200×630 全公開記事確認** | ⬜ | playbook B1。デザイナー D11 と連携 |
| M21 | **Pinterest アカ開設 + 初回10ピン** | ⬜ | playbook B7。各ピンに案件 URL |
| M22 | **note・はてブ用サムネ PNG**（1280×670） | ⬜ | playbook B8 |
| M23 | **「約束から○日」カウンター画像**（更新案件用） | ⬜ | playbook B6。案件追記のたび |

### 追加チャネル・PR（playbook §C・§D）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| M24 | **リンクプレス / PressGrid 投稿** | ⬜ | playbook C4/C5 |
| M25 | **PRONE 記者向けネタ1枚** | ⬜ | playbook C6。月1 |
| M26 | **Threads / Bluesky 初回投稿 + 週次** | ⬜ | playbook D2/D3 |
| M27 | **Shorts / TikTok 週1**（1案件30秒） | ⬜ | playbook D10/D11。`shorts-pipeline.md` |
| M28 | **Instagram カルーセル初回** | ⬜ | playbook D12 |
| M29 | **実績 PR 2本目**（案件数・更新数） | ⬜ | playbook C1 再投稿。2週目以降 |

### 被リンク・コンテンツ（playbook §E・§F）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| M30 | **プレスキット URL 1枚**（ロゴ・スクショ3・案件3） | ⬜ | playbook E10。Notion or Google Doc |
| M31 | **Qiita or Zenn 構築記1本** | ⬜ | playbook E3。末尾にサービス URL |
| M32 | **Podcast pitch 3件** | ⬜ | playbook E7 / `marketing-report-ceo.md` §1-C |
| M8 | **案件別シェア文案 5 本** | ⬜ | playbook §F。X+PNG セット |
| M33 | **新規案件ごと「1案件→10露出」チェック** | ⬜ | playbook §F 表。案件公開のたび |
| M9 | **競合・キーワード調査** | ⬜ | playbook §G。GSC 開始後に本格化 |
| M10 | **月次 KPI レポート** | ⬜ | `kpi.md` 連動 |
| M11 | Shorts 拡散チェックリスト | 🟡 | `shorts-pipeline.md` 参照のみ |
| M34 | **Astro showcase 掲載申請**（任意） | ⬜ | playbook C8 |
| M35 | **全案件タイトル・冒頭を具体疑問形に統一** | 🟡 | `scripts/apply-curiosity-titles.mjs` 実行済。`plainExplanation` 冒頭は主要2本修正、残りは執筆時に順次 |

**告知文案（git未コミット）:** `docs/pre-release.md` §「告知・note 文案（ローカルファイル索引）」  
**初月実行順:** playbook §I「初月おすすめ実行順」

### 運用ルーティン（実装済）

| ドキュメント | 内容 | スクリプト |
|--------------|------|------------|
| `docs/publish-routine.md` | 1案件公開〜プロモ30分 | `npm run promo:pack -- --slug {slug}` |
| `docs/weekly-routine.md` | 月曜週次45分 | `npm run promo:weekly` |
| GitHub Actions | プロモ artifact / 週次 cron | `marketing-promo-pack.yml` · `marketing-weekly.yml` |

---

## デバッガー（公開前 QA）

| # | タスク | 達成 | 備考 |
|---|--------|------|------|
| B1 | サンプル全ページリンク監査 | ⬜ | 本番前に実施 |
| B2 | アフィ・外部リンク（該当時） | ⬜ | |
| B3 | スマホ表示・😊😠 操作 | ⬜ | |
| B4 | **本番デプロイ後フルチェック** | ⬜ | 公開直前 |

---

## クリティカルパス（公開まで）

```
CF ネームサーバー移管 → C9 Astro → C8 実データ1本 → D7 移植
    → C14 デプロイ → B4 QA → O14 公開 GO
    → M4 PR + M5 X 告知（同日）
```

**いまのボトルネック:** C7/C8 実データ、C9 Astro、**Pages 接続（CEO）**。~~CF NS~~ ✅

---

## SEO メモ（ヘッダー画像ロゴについて）

| 項目 | 現状 | リリース時必須 |
|------|------|----------------|
| ヘッダー | ロゴ画像 + `alt` テキスト | **問題なし**（alt あり） |
| `<title>` | ページごとにあり | ✅ 継続 |
| `<h1>` | トップ・一覧・案件にあり | ✅ 継続 |
| `meta description` | **未** | CEO C26 で追加 |
| OGP / Twitter Card | **未** | D11 + C26 |
| JSON-LD（WebSite / Article） | **未** | C26 |
| 構造化データのサイト名 | 画像のみでは弱い | **フッターにテキストサイト名**推奨 |

**結論:** ヘッダーが画像だけでも、**各ページの title・h1・description・本文**があれば SEO は成立する。ロゴ `alt` は補助。本番では meta description と OGP を必ず入れる。

---

## Phase B — 公言と行動の整理（オーナーGO 2026-06-26）

| # | タスク | 達成 | 担当 |
|---|--------|------|------|
| P1 | `docs/policy-matrix.md` | ✅ | CEO |
| P2 | `docs/politician-pages.md` | ✅ | CEO |
| P3 | 物価争点・政治家2名 PoC JSON | 🟡 | ライター（自民◎・国民民主？・立憲維新枠のみ） |
| P4 | 案件ページ「立場の整理」枠 | ⬜ | デザイナー |
| P5 | `score-stance.mjs` ルール v1 | ⬜ | ライター |
| P6 | `/policies/` `/politicians/` Astro | ⬜ | デザイナー |
