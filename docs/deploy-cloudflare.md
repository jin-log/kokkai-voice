# Cloudflare 接続手順 — seiji1192.site

最終更新: 2026-06-26  
前提: ムームーでドメイン取得・支払い済み

---

## いまやること（順番）

| # | 誰 | 作業 |
|---|-----|------|
| 1 | **オーナー** | ムームーで `seiji1192.site` が **有効** か確認 |
| 2 | **オーナー** | [Cloudflare 登録](https://dash.cloudflare.com/sign-up) — **Google ログイン推奨**（メール OTP 回避） |
| 3 | **オーナー** | CF ダッシュボード → **ウェブサイトを追加** → `seiji1192.site` |
| 4 | **オーナー** | CF が表示する **ネームサーバー 2 つ** をコピー |
| 5 | **オーナー** | [ムームー CP](https://muumuu-domain.com/?mode=conpane) → ドメイン → **ネームサーバー設定** → 上記 2 つに変更 |
| 6 | — | **数時間〜最大 48h** で CF にドメインが Active になる |
| 7 | **CEO** | Astro 本番化 → GitHub → **Pages 接続** → カスタムドメイン追加 |

---

## ムームー：ネームサーバー変更

1. コントロールパネル → `seiji1192.site`
2. **ネームサーバー設定**（DNS レコードではない）
3. 「その他のサービスのネームサーバーを利用する」
4. Cloudflare からコピーした例（実際の値は CF 画面のもの）:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
5. 保存

※ **DNS レコードだけ触っても Pages には繋がらない。** NS 移管が先。

---

## Cloudflare Pages（CEO・Astro 完成後）

| 項目 | 値 |
|------|-----|
| リポ | `jin-log/kokkai-voice` |
| Framework | Astro |
| Build | `npm run build` |
| Output | `dist` |
| NODE_VERSION | `20` |
| GitHub Actions | `.github/workflows/deploy-pages.yml`（`main` push で自動） |

**初回のみ（どちらか）**

**A. GitHub Secrets（jin-log と同じ CF アカウントならトークン流用可）**

1. GitHub → `jin-log/kokkai-voice` → Settings → Secrets → Actions
2. `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を追加
3. `main` に push → Actions が `kokkai-voice` プロジェクトへ deploy

**B. CF ダッシュボードで Git 接続**

1. Workers & Pages → Create → Connect to Git → `kokkai-voice`
2. 上表のビルド設定 → Save and Deploy

**Custom domains:** `seiji1192.site` / `www.seiji1192.site`（Pages プロジェクト → Custom domains）

NS 移管済みなら CF が自動で DNS を張る。未移管の場合はムームー側 CNAME（`.site` も NS 移管推奨）。

---

## 支払い済み確認（ムームー）

- ドメイン一覧で **有効期限** が入っている
- ステータスが **有効** / **利用中**
- まだ **設定待ち** なら 1〜2 時間待ってから NS 変更

---

## オーナーがやらなくていいこと

- Astro コード・Git push → **CEO**
- 議事録 API・実データ → **CEO**
- GSC 登録 → 公開直前で OK（CEO 手順案内）

---

## トラブル

| 症状 | 対処 |
|------|------|
| CF 登録で OTP 届かない | **Google / Apple でログイン** |
| NS 変更後も Active にならない | 24h 待つ。ムームーの NS が CF と完全一致か確認 |
| 楽天 SMS で決済失敗 | 支払い済みなら無視。未払いなら別カード or 振込 |

---

## 接続完了の合図

Cloudflare → `seiji1192.site` → **有効（Active）** ✅ 2026-06-26  
→ **次:** CEO が Astro 本番化 → Pages → カスタムドメイン `seiji1192.site`

---

## WHOIS プライバシー（O8 必須）

**方針:** オーナー実名・住所は WHOIS に出さない。

| 確認 | 状態 |
|------|------|
| ムームー WHOIS 代理公開 | ✅ 2026-06-26 確認 — `Whois Privacy Protection Service by MuuMuuDomain` でマスク済み |
| NS | `heidi.ns.cloudflare.com` / `rayden.ns.cloudflare.com`（CF 経由） |

**オーナーがやること:** ムームー CP → ドメイン → **WHOIS 情報設定** で「代理公開」が ON のまま維持。実名公開に戻さない。

将来 CF Registrar に移管する場合も、CF の **WHOIS Redaction** を ON（デフォルト無料）にする。
