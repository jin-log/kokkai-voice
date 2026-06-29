# 起動期マーケ方針（オーナー決定）

最終更新: 2026-06-29  
ステータス: **起動ランプ期**

---

## 方針サマリ

| 項目 | 決定 |
|------|------|
| **執筆（貯め）** | 日に可能な限り（目安 **20本/日**）ゲート通過まで下書き |
| **本番公開** | 新しい記事は **どんどん公開**（インデックス優先） |
| **X** | **1日1投稿** — **3案件まとめ**（日次3選） |
| **X選定** | **世間の関心が高い** or **最新ニュース** を優先 |
| **安定運用（将来）** | 公開 **1日2本** |
| **note・はてブ・PR** | 別途検討（後回し） |

---

## X「日次3選」

- スクリプト: `node scripts/post-daily-digest.mjs`
- スコア: 公開の新しさ・更新日・タグ（政局/経済/物価等）・リアクション
- **同一案件は5日以内に再登場しにくい**（ローテーション）
- **1日1回のみ**（`data/daily-digest-log.json`）

### 自動実行

| 経路 | タイミング |
|------|------------|
| GitHub Actions `marketing-daily-digest.yml` | 毎日 **12:00 JST** |
| 手動 | `node scripts/post-daily-digest.mjs` |

### やめること

- デプロイのたびに **案件ごと連投**（旧 `post-to-buffer.mjs --recent 1`）

---

## SEO・インデックス

**デプロイのたびに自動**（`deploy.yml`）:

```
node scripts/notify-search-engines.mjs --recent 1
```

| チャネル | 内容 |
|----------|------|
| **Google Indexing API** | 直近1日に公開/更新された URL（`GOOGLE_SERVICE_ACCOUNT_JSON` 設定時） |
| **IndexNow** | 同上（Bing / Yandex 等） |

注意:

- **「通知」≠ 即インデックス保証**（GSC と同様）
- 同一 URL は **24時間以内は再送しない**（`data/google-index-log.json`）
- 認証は **GitHub Secrets / Cloudflare env**。Mac ローカルに JSON が無くても CI では動く

---

## フェーズ

| フェーズ | 執筆 | 公開 | X |
|----------|------|------|---|
| **今（起動）** | 最大20/日 | 積極的 | 3選 1本/日 |
| **安定後** | バッファ10本先回り | 2本/日 | 3選 or 単体を調整 |

---

## 関連

- `docs/google-indexing-setup.md`
- `docs/traffic-zero-cost-playbook.md` §A
- `scripts/notify-search-engines.mjs`
