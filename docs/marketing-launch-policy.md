# 起動期マーケ方針（オーナー決定）

最終更新: 2026-06-26  
ステータス: **起動ランプ期**

---

## 方針サマリ

| 項目 | 決定 |
|------|------|
| **執筆（貯め）** | 日に可能な限り（目安 **20本/日**）ゲート通過まで下書き |
| **本番公開** | 新しい記事は **どんどん公開**（インデックス優先） |
| **X** | **ハイブリッドC** — 昼 **3選1本** ＋ 熱い日だけ夜 **単体1本**（**最大2本/日**） |
| **X選定** | **世間の関心が高い** or **最新ニュース** を優先 |
| **安定運用（将来）** | 公開 **1日2本** |
| **note・はてブ・PR** | 別途検討（後回し） |

---

## X ハイブリッドC

| 枠 | 時刻（JST） | 内容 | 条件 |
|----|-------------|------|------|
| **昼** | **12:00** | 3案件まとめ1本 | 毎日 |
| **夜** | **19:00** | 単体1本 | スコア **≥120** のときだけ（閾値未満はスキップ） |

- **1日最大2本**（昼必須＋夜は条件付き）
- 夜単体は **当日昼3選に出た案件は除外**（重複防止）
- ログ: `data/x-post-log.json`（`digest` / `hot`）

### 昼「3選」

- スクリプト: `node scripts/post-daily-digest.mjs`
- スコア: 公開の新しさ・更新日・タグ（政局/経済/物価等）・リアクション
- **同一案件は5日以内に再登場しにくい**（ローテーション）

### 夜「単体」

- スクリプト: `node scripts/post-hot-single.mjs`
- 全公開記事のうち **最高スコア1件** を単体投稿
- **スコア &lt; 120** → その日は投稿しない（「本当に熱い日だけ」）
- 記事 JSON に `"promoHot": true` で手動ブースト可（+40）

### 一括実行

```bash
node scripts/post-x-launch.mjs --slot noon      # 昼のみ
node scripts/post-x-launch.mjs --slot evening   # 夜のみ
node scripts/post-x-launch.mjs --slot both --dry-run
```

### 本番 API（Mac ローカル buffer.env 不要）

```bash
node scripts/call-post-daily-digest.mjs
node scripts/call-post-hot-single.mjs
```

### 自動実行

| 経路 | タイミング |
|------|------------|
| `marketing-daily-digest.yml` | 毎日 **12:00 JST** |
| `marketing-hot-single.yml` | 毎日 **19:00 JST**（閾値未満ならスキップ） |

### やめること

- デプロイのたびに **案件ごと連投**（旧 `post-to-buffer.mjs --recent 1`）→ **2026-06-30 停止**。X は昼3選+夜単体のみ。

---

## 公開時プロモ（はてな・note）

| タイミング | 内容 |
|------------|------|
| 記事「公開する」直後 | `data/promo-publish-queue.json` に slug を積む |
| deploy 完了後 | `promo-on-publish.yml` → はてなブクマ + note 公開 |
| ローカル deploy | `deploy:extras` → 同スクリプト（Profile 9 利用可） |

CI では `npm run browser:export-state` の出力を GitHub Secrets（`HATENA_BROWSER_STATE` / `NOTE_BROWSER_STATE`）に登録。

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
| **今（起動）** | 最大20/日 | 積極的 | 昼3選 + 夜単体（条件付き） |
| **安定後** | バッファ10本先回り | 2本/日 | 3選 or 単体を調整 |

---

## 関連

- `docs/google-indexing-setup.md`
- `docs/traffic-zero-cost-playbook.md` §A
- `scripts/notify-search-engines.mjs`
