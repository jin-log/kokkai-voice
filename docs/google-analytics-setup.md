# GA4 設定（seiji1192.site）

測定 ID: `G-N8JV8MKMNJ` · プロパティ ID: `397089537`

## 政治なうだけ見る（ブックマーク）

メニューを辿らなくてよい。**「腎ログ」プロパティは別サイト。開かない。**

| 見たいもの | リンク |
|-----------|--------|
| いま誰が見てる | https://analytics.google.com/analytics/web/#/p397089537/realtime/overview |
| 記事別など | https://analytics.google.com/analytics/web/#/p397089537/reports/reportinghub |

管理画面 **関心ワード** ページ上部にも同じリンクあり。

## プロパティ名が紛らわしいとき

GA4 左上の名前は **`jin92.net - GA4`** だが、中身は政治なう（ストリーム「日本の政治now.」）。

リネームするなら: 管理（歯車）→ プロパティ設定 → **プロパティの詳細** → プロパティ名を「日本の政治now.」に変更。

| 載せる | 載せない |
|--------|----------|
| `src/layouts/BaseLayout.astro`（トップ・記事・規約など公開ページ） | `src/layouts/DevLayout.astro`（`/dev/*` 管理画面） |

デプロイ後、GA4 ホームの「データ収信」が 24〜48h で動き始める。即確認は **レポート → リアルタイム**。

## GA4 管理画面でやること（オーナー）

### 1. データストリームの URL 確認

管理（歯車）→ **データの表示** → データストリーム → ウェブ

- **URL が `https://seiji1192.site` か確認**（スクショは `jin92.net - GA4` プロパティ名だが、ストリーム URL が正しければ可）

### 2. 自分のアクセスを除外

1. 管理 → **データの表示** → データストリーム → ウェブ → **タグの設定を構成**
2. **内部トラフィックを定義** → ルール追加（例: `traffic_type` = `internal`、IP 条件で自宅を指定）
3. 管理 → **データ設定** → **データフィルタ** → 内部トラフィックを **除外**

### 3. ボット除外

GA4 は **既知ボットを自動除外**（ON/OFF 設定は廃止）。AdSense 審査等は残ることがある。

### 4. 本番ドメイン以外（pages.dev）

`BaseLayout.astro` で **`seiji1192.site` のみ** GA4 / AdSense / CF ビーコンを読み込む。  
`kokkai-voice.pages.dev` では noindex のみ（KPI 汚染・AdSense 無効クリックリスク回避）。

### 5. 管理画面アクセスレポート

`/dev/reports/` — GA4 Data API 連携（国内デフォルト・7日/28日切替）。

表示項目:
- KPI（ユーザー・セッション・PV・記事PV・オーガニック・新規・エンゲージ・平均滞在）
- 月次推移グラフ（直近12ヶ月）
- 日次推移（選択期間）
- オーガニック検索ワードランキング（searchTerm）
- オーガニック着陸ページ・デバイス内訳

要: サービスアカウントに GA4 **閲覧者** + GSC **オーナー** + Cloudflare `GOOGLE_SERVICE_ACCOUNT_JSON`。

**検索クエリは GSC API から取得**（GA4 の searchTerm は Google 仕様でほぼ `(not provided)` のため使わない）。

## PDCA で見る画面

| 目的 | GA4 |
|------|-----|
| 記事別 PV | レポート → エンゲージメント → ページとスクリーン |
| 流入元 | レポート → 集客 → トラフィック獲得 |
| 検索クエリ | **GSC API**（管理画面 `/dev/reports/` に連携済み） |

### GSC API 有効化（初回のみ）

Indexing API と同じ GCP プロジェクトで **Google Search Console API** を有効化:

https://console.cloud.google.com/apis/library/searchconsole.googleapis.com

（プロジェクト: `eastern-gravity-500503-p2` / SA: `kokkai-indexing@...`）

## 関連

- GSC: 検索パフォーマンス
- Cloudflare Web Analytics: PV の裏取り（Cookie なし）
