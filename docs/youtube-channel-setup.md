# YouTube チャンネル体裁 — コピペ用

最終更新: 2026-06-29  
サイト正本: `src/lib/site-config.mjs` · 方針: `docs/owner-policy.md`

---

## 作業順（効率ルート・約30分）

**アップロード文案は自動生成:** `npm run short:upload-pack`  
**API 投稿:** `npm run short:upload -- --slug <slug>`（初回は `npm run youtube:auth`）— 詳細 `docs/youtube-api-setup.md`  
→ 各 `output/shorts/{slug}/youtube-upload.txt` にタイトル・説明・タグ・固定コメントが入る。

| 順 | YouTube Studio の場所 | やること |
|----|----------------------|----------|
| 1 | カスタマイズ → **基本情報** | 名前・ハンドル・アイコン |
| 2 | カスタマイズ → **ブランディング** | バナー（後回し可） |
| 3 | カスタマイズ → **基本情報** | 説明・リンク |
| 4 | 設定 → **チャンネル** → 詳細設定 | 国・キーワード・デフォルト再生リスト |
| 5 | **動画をアップロード** | 1本目＋下記「固定概要欄テンプレ」 |
| 6 | 公開動画 → **固定コメント** | サイトURL（ピン留め） |

アイコン: [logo-header-nihon-seiji-naw.png](file:///C:/Users/bero1/Projects/kokkai-voice/public/assets/logo-header-nihon-seiji-naw.png)（800×800 にリサイズ推奨）

---

## 1. 名前・ハンドル

| 項目 | 入れる文字 | 備考 |
|------|------------|------|
| **名前（表示名）** | `政治なう` | `日本の政治now.` は弾かれることがある |
| **ハンドル** | `@日本の政治now` | 通るならこのまま |
| **英語表記（説明欄で補足）** | Japan Politics Now | 海外向けの通称 |

---

## 2. チャンネル説明（概要・1000字以内）

そのまま貼る:

```
🇯🇵 日本の政治の「あの話、どうなった？」を短く整理するチャンネルです。
国会議事録・公的データ・出典リンク付き。政府・政党の公式ではありません。

🇬🇧 Short explainers on Japanese politics — what happened to that policy debate?
Sourced from Japan's Diet (parliament) records & public data. Not a government channel.

▼ 詳しい記事・出典一覧
https://seiji1192.site

▼ X（更新・お知らせ）
https://x.com/seiji1192site

📌 方針
・党や政治家の「応援／批判」はしません。事実と出典の整理です。
・AI 要約には解釈が含まれる場合があります。数字の正本は各出典リンクです。
・Shorts は入口。続きはサイトの案件ページで読めます。

#政治now #日本政治 #国会
```

---

## 3. リンク（チャンネルに表示）

| ラベル | URL |
|--------|-----|
| Website | `https://seiji1192.site` |
| X | `https://x.com/seiji1192site` |

※ メール・実名は載せない（オーナーポリシー）

---

## 4. チャンネルキーワード（設定 → チャンネル → 詳細設定）

```
政治, 国会, 日本政治, 政治解説, 少子化, 物価, 社会保障,
Japan politics, Japanese Diet, parliament, policy explainer, Japan news
```

---

## 5. その他設定

| 項目 | 値 |
|------|-----|
| 国 | 日本 |
| カテゴリ（動画デフォルト） | ニュースと政治 |
| 言語 | 日本語（字幕は将来・自動生成ONでも可） |
| 子供向け | いいえ |
| 収益化 | AdSense 連携はサイトと同アカウントで後から |

---

## 6. 動画タイトル（1本ごと）

**型（日本語メイン・検索用）**

```
【少子化】3.6兆円かけたのに出生率は下がった？ #shorts
```

```
【少子化】8割は結婚したいのに止まらない理由 #shorts
```

英語が欲しいときは **説明欄の1行目** に足す（タイトルは日本語優先でOK）:

```
EN: ¥3.6T childcare budget — birth rate still fell?
EN: 80% want to marry by 35 — why births keep falling?
```

---

## 7. 動画説明欄（全Shorts共通テンプレ）

`{タイトル}` `{URL}` `{ハッシュ}` だけ差し替え。

```
{1行サマリ（動画と同じフック）}

EN: {英語1行サマリ}

▼ 出典付きの続き・数字の整理
{URL}

---
日本の政治now.（Japan Politics Now）
国会議事録と公開情報をもとにした解説。非公式・個人運営メディアです。
Not affiliated with the Japanese government or any political party.

X: https://x.com/seiji1192site
#政治now #国会 #少子化 #shorts
```

### 少子化・予算（shussho-budget-seika）

```
3.6兆円のこども未来戦略 — 2025年の出生率1.14・出生数約67万人を整理。

EN: Japan spent ¥3.6 trillion on childcare policy — birth rate still 1.14 in 2025.

▼ 出典付きの続き・数字の整理
https://seiji1192.site/case/shussho-budget-seika/

---
日本の政治now.（Japan Politics Now）
国会議事録と公開情報をもとにした解説。非公式・個人運営メディアです。
Not affiliated with the Japanese government or any political party.

X: https://x.com/seiji1192site
#政治now #国会 #少子化 #出生率 #shorts
```

### 少子化・結婚ギャップ（shoshika）

```
8割が結婚を望むのに少子化が止まらない — 希望と現実のギャップを整理。

EN: 80% hope to marry by 35, but Japan's birth rate keeps falling — the gap explained.

▼ 出典付きの続き・数字の整理
https://seiji1192.site/case/shoshika/

---
日本の政治now.（Japan Politics Now）
国会議事録と公開情報をもとにした解説。非公式・個人運営メディアです。
Not affiliated with the Japanese government or any political party.

X: https://x.com/seiji1192site
#政治now #国会 #少子化 #shorts
```

---

## 8. 固定コメント（1本目公開後にピン留め）

```
▼ 出典付きの全文・タイムラインはこちら
https://seiji1192.site/case/shussho-budget-seika/

（次の動画は案件ごとにURLを差し替え）
```

---

## 9. 再生リスト（最初は1つで十分）

| リスト名 | 入れる動画 |
|----------|------------|
| 政治なうショート | 全Shorts |

5本たまったら `少子化` `物価・税金` に分割。

---

## 10. バナー（後からでOK）

- サイズ: 2560×1440（安全域: 中央 1546×423）
- 文案案: `日本の政治now.` ＋ `出典付きで追う` ＋ `seiji1192.site`
- 英語小さく: `Japan Politics Now · Sourced explainers`

---

## 11. やらなくていいこと（初期）

- チャンネルトレーラー（動画0〜2本の間は不要）
- コミュニティタブ（登録者500人まで不可）
- 多言語の別チャンネル
- 概要欄に長い免責（チャンネル説明に1回書けば足りる）

---

## 12. 海外から見たときの要点

| 見る人 | 伝わるようにしたこと |
|--------|---------------------|
| 英語圏 | 説明欄に `EN:` 行・`Not a government channel` |
| 用語 | Diet = 国会（説明で parliament と併記） |
| 信頼 | 毎動画に **案件URL**（サイト側に出典リンク） |
| 誤解防止 | 個人運営・非党派・解釈含む旨をチャンネル説明に固定 |
