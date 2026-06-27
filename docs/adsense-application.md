# Google AdSense 申請手順

最終更新: 2026-06-28  
**Phase:** プレリリース開始後すぐ申請可（記事20本・PP・About あり）

---

## 前提（サイト側 — CEO 済）

| 項目 | 状態 |
|------|------|
| 本番 URL | https://seiji1192.site |
| 記事数 | 20案件（/case/） |
| プライバシーポリシー | /privacy-policy/ |
| サイト説明 | /about/ |
| 運営者実名 | **サイトに載せない**（PP・About はサービス名のみ） |
| コメント | **未本番**（localStorage デモのみ — PP に明記済み） |

---

## オーナー作業（この順）

### 1. AdSense アカウント

1. https://adsense.google.com/ に Google アカウントでログイン
2. **サイトを追加** → `seiji1192.site`（`www` なし）
3. 国: **日本** / 受取: 本人名義口座（AdSense 管理画面のみ。サイトには出さない）

### 2. サイト所有権の確認

AdSense が提示する方法のいずれか（**CEO が meta タグ方式を推奨**）:

| 方法 | 誰がやる |
|------|----------|
| **HTML meta タグ** | CEO が `BaseLayout.astro` に1行追加 → push → デプロイ後、AdSense で「確認」 |
| ads.txt | 承認後に pub-ID 確定してから（下記 §4） |
| HTML ファイルアップロード | `public/` に置く |

meta タグをもらったら CEO に渡す。例:

```html
<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">
```

### 3. 申請送信

- **サイトの種類:** コンテンツサイト
- **コンテンツ言語:** 日本語
- **説明文（例）:**  
  「国会議事録と報道をもとに、政策案件ごとに政治家の公言とその後の行動を時系列で整理する解説メディア。政府公式サイトではありません。」

### 4. 承認後（CEO）

1. AdSense から **パブリッシャー ID**（`ca-pub-…`）を取得
2. `public/ads.txt` を作成:

```
google.com, ca-pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

3. 広告ユニット作成 → 配置は記事下・サイド等（デザイナーと相談）
4. `src/lib/site-config.mjs` の `adsensePubId` を設定

---

## 審査で落ちやすい点（回避済み / 注意）

| リスク | 対策 |
|--------|------|
| コンテンツ不足 | 20記事以上 ✅ |
| PP なし | ✅ |
| サイト目的不明 | /about/ ✅ |
| コピペ・自動生成のみ | 各記事に国会URL・出典・AI注記 |
| 政治煽りタイトル | 中立タイトル運用（writer-editorial） |
| クリック誘導 | 禁止。UI に「広告をクリック」等を出さない |

---

## 申請後

- 審査: **数日〜2週間** が目安
- **却下** → 理由メールを CEO に共有。コンテンツ追加・About 追記で再申請
- **承認** → ads.txt → 広告タグ設置 → GSC と連携確認

---

## 関連

- `docs/monetization.md` — 収益レーン全体
- `docs/owner-policy.md` — 個人名非公開・特商法（AdSense のみなら PP で足りる）
- `docs/pre-release.md` — プレリリースと告知
