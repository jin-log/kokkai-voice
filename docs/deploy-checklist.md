# デプロイ後チェックリスト（必須）

**CEOが毎回実行。スキップ禁止。**

---

## ads.txt（マネタイズ系変更時は毎回）

```
https://seiji1192.site/ads.txt
https://jin92.net/ads.txt
```

確認ポイント：
- [ ] 200で返ってくる（404はNG）
- [ ] `google.com, pub-XXXXXXXXXX, DIRECT, f08c47fec0942fa0` の形式
- [ ] **`ca-pub-` ではなく `pub-` で始まる**（←今回のミス）
- [ ] パブリッシャーIDが正しい（`pub-7197431000530819`）

---

## AdSense管理画面（週1確認）

URL: https://adsense.google.com/adsense/web/sites

確認ポイント：
- [ ] ads.txtステータスが「未承認」「不明」になっていないか
- [ ] サイトのステータスが「準備中」のまま止まっていないか
- [ ] 止まっていたら即CEOが原因調査・修正・報告

---

## 通常デプロイ後（毎回）

```
https://seiji1192.site/
https://seiji1192.site/ads.txt
https://jin92.net/
https://jin92.net/ads.txt
```

- [ ] トップページが200で表示される
- [ ] ads.txtが上記フォーマットで返る

---

## 教訓（2026-07-11）

`ca-pub-7197431000530819` → **NG**（Googleが認識しない）  
`pub-7197431000530819` → **正しい**

このミスで seiji1192.site の AdSense が6月27日〜7月11日の16日間止まった。
