# Safe Browsing インシデント（2026-06-27）

## 症状

Chrome が `https://seiji1192.site/` 配下で **「危険なサイト」** 全画面警告。chingin だけではなくドメイン単位の可能性が高い。

## 事実

- サーバーは **HTTP 200** で HTML を正常返却（ページ自体は落ちていない）
- ビルド成果物にマルウェアスクリプトは未検出（自前 JS + Cloudflare Analytics のみ）
- Sucuri スキャン: セキュリティ評価 B（マルウェア検出なし）
- デバッガーは HTTP 200・UI・リンクのみ確認し、**Safe Browsing を見ていなかった**（手順欠落）

## 想定原因（優先順）

1. **Google Safe Browsing がドメインをフラグ**（フィッシング・欺瞞サイト扱い）
   - `.site` 新規ドメイン + 政治系名称の誤検知
   - ドメイン取得前の悪用履歴
2. **データ品質**（chingin 等の xPosts が案件と無関係）— 赤画面の直接原因とは限らないが品質事故

## オーナー作業（CEO 不可）

1. [Google Search Console](https://search.google.com/search-console) に `seiji1192.site` 登録
2. **セキュリティの問題** に警告があれば内容確認 → 修正後 **審査をリクエスト**
3. [Transparency Report](https://transparencyreport.google.com/safe-browsing/search?url=seiji1192.site) で状態確認

## CEO 対応

- [x] デバッガー手順に Safe Browsing 追加
- [x] 無関係 X をタイムラインから除去（chingin/nenkin/kenpo）
- [ ] xPosts 全件の案件適合性監査 + 再リサーチ
- [ ] 審査通過までの代替 URL: `https://kokkai-voice.pages.dev`
