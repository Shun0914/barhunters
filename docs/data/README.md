# データ定義（因果チェーンなど）

## `causal_chain_v9_2.json`

`dashboard/remixed-9d8265c3.html` と同じ **ノード一覧・エッジ一覧**を機械可読にした **v1 契約用ドラフト**です。フロントの描画・バックエンドのシード／GET の返却形をそろえるためのたたき台として使う。

| フィールド | 説明 |
|------------|------|
| `meta` | バージョン・元モックへのパス |
| `boxTypes` | `boxType` の意味（凡例） |
| `nodes[]` | `id`（例 `ql-3`, `c1-0`）、`layer`、`title` / `kpi` / `evidence` 等 |
| `edges[]` | `from` / `to`、`kind`（跨列ベジェ・列内縦・遅延クロスなど）、`stroke`、`color`、`label` |

**座標は含まない**（レイアウトは別レイヤ）。モックと差分を出したときは HTML を直したうえで `_generate_causal_chain_v9_2.py` を更新し、次を再実行する。

```bash
python3 docs/data/_generate_causal_chain_v9_2.py
```

## 生成スクリプト

`_generate_causal_chain_v9_2.py` にノード配列・エッジ定義を集約している。JSON を手編集するよりスクリプト側を正とする運用を推奨。
