# Google インデックス自動通知（Indexing API）

オーナー初回セットアップ（約15分）。完了後は **deploy 時に自動** で Google へ URL 通知。

## 1. Google Cloud

1. https://console.cloud.google.com/ でプロジェクト作成（例: `kokkai-voice-indexing`）
2. **API とサービス → ライブラリ** → 次を有効化:
   - **Web Search Indexing API**（deploy 時の URL 通知）
   - **Google Search Console API**（管理画面の検索クエリ取得）
3. **API とサービス → 認証情報 → サービスアカウント作成**
4. キー → **JSON 追加** → ダウンロード

## 2. Search Console（必須）

1. https://search.google.com/search-console で `seiji1192.site` を開く
2. **設定 → ユーザーと権限 → ユーザーを追加**
3. サービスアカウントのメール（`...@....iam.gserviceaccount.com`）を **オーナー** で追加  
   ※「フル」では不可。**オーナー** 必須
4. **5〜10分待つ**

## 3. 認証ファイルの配置

### ローカル（Windows）

```powershell
Copy-Item ダウンロード\*.json secrets\google-service-account.json
```

### GitHub Actions

1. JSON の中身を **1行のまま** コピー
2. リポジトリ **Settings → Secrets → Actions**
3. 名前: `GOOGLE_SERVICE_ACCOUNT_JSON`  
   値: JSON 全文

## 4. 動作確認

```powershell
node scripts/notify-search-engines.mjs --slug shussho-budget-seika
```

成功例:

```
[Google Indexing API]
  OK Google Indexing API (1) — 1件送信
```

`skipped` / `403` のときは手順2（GSCオーナー）を再確認。

## 5. 自動実行タイミング

| タイミング | 対象 |
|-----------|------|
| `npm run deploy` 後 | 直近3日に更新/公開された URL |
| GitHub Deploy workflow 後 | 同上 |
| 手動 `npm run notify:search` | 全公開 URL（IndexNow + Google） |

## 注意

- **1日200 URL** まで（十分）
- 同じ URL は **24時間以内に再送しない**（ログで制御）
- **インデックス保証はない**（GSC 手動リクエストと同じ）
- 公式は JobPosting 向けだが、一般サイトでも実務上動作する例が多い（2026年時点）

## Google 以外

IndexNow（Bing / Yandex 等）は **認証不要** で deploy 時に自動送信済み。
