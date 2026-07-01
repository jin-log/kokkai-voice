# データソース — 国会議事録

## 正本

| 項目 | 内容 |
|------|------|
| 提供元 | 国立国会図書館 × 衆参 |
| 検索 UI | https://kokkai.ndl.go.jp/ |
| API 仕様 | https://kokkai.ndl.go.jp/api.html |

**無料・API キー不要。** 商用利用も可能だが、出典表示と過負荷を避ける利用が前提。

## API エンドポイント

| 用途 | URL | 備考 |
|------|-----|------|
| 会議一覧（軽量） | `https://kokkai.ndl.go.jp/api/meeting_list?{条件}` | 本文なし |
| 会議全文 | `https://kokkai.ndl.go.jp/api/meeting?{条件}` | 会議内全発言 |
| 発言単位 | `https://kokkai.ndl.go.jp/api/speech?{条件}` | ヒット発言のみ |

`recordPacking=json` で JSON 取得。

### 例

```
https://kokkai.ndl.go.jp/api/speech?any=物価&from=2026-01-01&until=2026-06-30&recordPacking=json
```

## 主要パラメータ

| パラメータ | 意味 |
|------------|------|
| `any` | 検索語（半角スペース区切りは **AND**） |
| `speaker` | 発言者名 |
| `from` / `until` | 開会日（YYYY-MM-DD） |
| `nameOfMeeting` | 会議名 |
| `nameOfHouse` | 衆議院 / 参議院 |
| `sessionFrom` / `sessionTo` | 国会回次 |
| `issueID` | 会議録 ID |

## 取得上限（公式）

| API | 1リクエスト上限 |
|-----|----------------|
| meeting_list / speech | 30件 |
| meeting | 3件 |

ページングは `startRecord` 等で繰り返し。**リクエスト間隔を空ける**（CEO スクリプトで 1〜2 秒 sleep 推奨）。

## 保存方針

```
API 取得
  → 生 JSON を DB / オブジェクトストレージに保存（immutable）
  → 記事生成時は保存データのみ参照（再取得は更新時のみ）
  → 記事に official URL + speechID + fetchedAt を必ず記載
```

**加工データ（要約）と原文を分離** — 監査・訂正に備える。

## 議員マスタ（将来）

API には会派・肩書きが含まれる。衆参 Web の議員一覧と突合して ID 正規化を検討。

## CEO が先に作れるもの

1. `scripts/fetch-speech.mjs` — キーワード＋期間で JSON 保存
2. `scripts/fetch-meeting.mjs` — issueID 指定で会議全文
3. サンプル出力を `samples/` に置いて要約パイプライン試作

## 参考

- [国会会議録検索システム ヘルプ](https://kokkai.ndl.go.jp/help.html)
