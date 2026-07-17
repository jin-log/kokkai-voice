# OGP / note・X サムネテンプレ（白紙想定）

オーナーデザイン。枠・アイコン・カテゴリ名・ロゴは固定。  
タイトル本文だけを合成する。

| ファイル | サムネカテゴリ |
|---|---|
| `01-gaikokujin.png` | 外国人・移民政策 |
| `02-energy.png` | エネルギー・インフラ |
| `03-kyoiku.png` | 教育 |
| `04-seiji-kane.png` | 政治とカネ・制度 |
| `05-keizai.png` | 経済・財政 |
| `06-gaiko.png` | 外交・防衛 |
| `07-shakai.png` | 社会保障・くらし |
| `08-chiho.png` | 地方・都政 |
| `09-sonota-blank.png` | その他・時事（白紙最終） |
| `10-sonota-title-guide.png` | その他・時事（点線ガイド・最大56） |

## その他・時事 タイトル枠（ガイド実測 @1024×536）

| | x | y | right | bottom |
|---|---|---|---|---|
| 点線 | 280 | 235 | 886 | 437 |

1200×630 換算後、内側 PAD_X=16 / PAD_Y=12 で描画。完成画像に点線は出さない。
白紙へタイトルのみ合成（`scripts/compose-og-from-template.mjs`）。

記事の `category` とは別。`thumbCategory` で選択する。
