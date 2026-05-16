# 西部ガスHD様 人的資本投資 計算ロジック説明書 v1.0

> 作成日: 2026-05-16
> 対象システム: barhunters（人的資本・挑戦活動の可視化 + ポイント申請／承認フロー）
> バージョン: v7（2値ポイント体系 + 役職傾斜 + 集計バッジ処理）

---

## 1. 設計思想

「数字より人が動く」を起点に、人的資本投資の効果を可視化する。

- 数字を盛りすぎず、ポイント入力で因果が**伝播**していく様子を見せる
- ポイント計算は「行動の見える化」が目的、数字の精度より行動の把握
- 1P = 10万円換算は文献値ベースの目安、3〜5 年で西部ガス様固有の係数を実証していく前提

5/9 のりじちょー＋斎藤さんフィードバック、5/14 のきみなり方針共有を反映している。

---

## 2. ポイント体系（2値）

申請時はシンプルな 2 値で選ぶ。

| レベル | 1 件あたりベース | 想定頻度 |
|--------|-----------------|---------|
| 日常 (daily) | **0.1P** | 24 日に 1 回、誰でも参加できる行動 |
| 創造 (creative) | **5P** | 年数回、新しい価値創出の挑戦 |

旧 v5/v6 で導入していた「越境」レベルは v7 で廃止し、移行時に
`alembic upgrade head` の中で関連 row を削除した。

---

## 3. カテゴリ（3軸）

社員のあらゆる行動を以下 3 軸に分類する。

| カテゴリ | 説明 |
|---------|-------|
| 社会貢献 (social) | 地域・顧客・社会への貢献 |
| 安心安全 (safety) | インフラ事業の根幹、保安・品質 |
| 未来共創 (future) | 新規事業・イノベーション |

これに対応した **6 ジャンル**（{日常, 創造} × {社会貢献, 安心安全, 未来共創}）が
`activity_genres` マスタに格納されており、dashboard / マイページの
「ジャンル別ポイント内訳」の集計キーとして利用される。

---

## 4. 役職傾斜（2 段階）

管理職の行動は影響範囲が広いため、ベースポイントに倍率を掛ける。

| 区分 | 役職 | 倍率 |
|------|-----|------|
| 管理職 | 課長 / 部長 / 役員 | **3.0x** |
| 一般 | 係長 / 一般社員 | **1.0x** |

`backend/app/services/point_calc.py` の `MANAGER_ROLES` で定義。
5/16 確定（係長 = 一般扱い）。

---

## 5. 計算式

```
final_point = base_point(level) × role_multiplier(role)
```

例：

| ケース | 計算 | final_point |
|--------|------|-------------|
| 一般社員 が日常 1 件 | 0.1 × 1.0 | 0.1P |
| 一般社員 が創造 1 件 | 5 × 1.0 | 5P |
| 課長 が日常 1 件 | 0.1 × 3.0 | 0.3P |
| 役員 が創造 1 件 | 5 × 3.0 | 15P |

サーバ側 (`backend/app/routers/point_applications.py`) で
`/api/point-applications` の create / update 時に算出し、
`point_applications.final_point` カラムに永続化する。

`points` カラム（旧スキーマ互換用）にも同じ値を入れる。
dashboard / マイページの集計 SQL は `final_point` 優先で読み、
未設定の row は `points` で代替する。

---

## 6. カスケード（因果伝播）

```
3 カテゴリポイント
   ↓ (M3_7: 平均集約版接続行列)
7 風土・組織文化
   ↓ (M7_4)
4 KPI（ENG指数 / 定着率 / 挑戦指数 / 変革人財割合）
   ↓ (LAYER3_TO_MID, LAYER3_TO_MID_COUNT)
10 中間層指標（事業実績・外部評価）
   ↓ (MID_TO_FIN)
3 財務ドライバー（売上ドライバー / コスト削減 / 資本効率化）
   ↓
売上効果（メイン）+ ROIC / ROE（参考）
```

M3_7 は v5/v6 の 9 セル接続行列 M9_7 を、3 カテゴリに均等平均で集約したもの
（`backend/app/services/calculator.py:_derive_m3_7()`）。
6,000P を 3 カテゴリに 2,000P ずつ入れたケースで、旧 9 セル × 666P と
数学的にほぼ等価（カテゴリ単位で 3 倍の入力 × 1/3 の平均係数で打ち消す）。

検証: `6,000P → 売上効果 ≒ 5.97 億円`（目標 6.0 億円、丸め誤差範囲内）。

---

## 7. Phase 別目標（試算）

| Phase | 期間 | 目標 P | 円換算 |
|-------|------|--------|--------|
| Phase 1 | 1 年 | 8,000P | 8 億円相当 |
| Phase 2 | 3 年 | 20,000P | 20 億円相当 |
| Phase 3 | 10 年 | 40,000P | 40 億円相当 |

全社規模（3,890 名想定）の試算:

| 区分 | 人数 | 想定行動 | P 換算 |
|------|------|---------|--------|
| 一般 | 3,500 名 | 日常 月 1 回 × 12 | 4,200P |
| 管理職 | 390 名 | 日常 月 1 回 × 12 | 1,404P |
| 一般・創造 | 200 名 | 年 2 回 | 2,000P |
| 管理職・創造 | 50 名 | 年 2 回 | 1,500P |
| **合計** | | | **約 9,100P（≒ 9.1 億円相当）** |

---

## 8. 集計バッジ処理（毎日 0 時更新）

リアルタイム計算を廃止し、毎日 0:00 にバッジ集計を更新する。

- 「先にやった人が有利」感を排除（5/14 議論）
- 集計テーブル: `department_category_points` (department_id × category × total_point)
- 実行スクリプト: `backend/scripts/batch_aggregate_points.py`
  - 手動実行: `cd backend && python -m scripts.batch_aggregate_points`
- cron / Azure scheduler の設定は別タスク（デプロイ時）

GET `/api/cascade/aggregated-points?scope={company|department}` は
現状 `aggregate_approved_points()` 経由で `point_applications` を直接集計する。
将来このバッジテーブルから読む可能性に備えて DB 構造は揃えている。

---

## 9. 限界・注意事項

- カスケード係数は文献値ベース（柳モデル・人的資本可視化指針 等）。西部ガス様固有の係数ではない
- 1P = 10 万円の換算は仮置き。3〜5 年かけて実証していく前提
- リアルタイム計算でなくバッジ処理（毎日 0 時更新）。
  「申請直後にカスケードに反映される」期待は持たせない
- 個人の行動が会社の数字に効くまでには時間がかかる。即効性は期待しない
- 創造活動の認定（5P）は申請＋承認フロー経由でしか発生せず、安易な水増しを防ぐ

---

## 10. 今後の精緻化方針

| 期間 | アクション |
|------|-----------|
| 1 年 | 行動データの蓄積、初期検証 |
| 3 年 | 西部ガス様固有の係数算出 |
| 5 年 | 完全な実証、必要に応じて係数再校正 |

「数字より人を動かす」を貫きながら、運用しながら実データを蓄積し、
**2030 年を目処**に精緻化を進める。

---

## 参照ファイル

| 役割 | パス |
|------|------|
| ベースポイント / 役職傾斜 | [backend/app/services/point_calc.py](../backend/app/services/point_calc.py) |
| カスケード計算 | [backend/app/services/calculator.py](../backend/app/services/calculator.py) |
| 集計 | [backend/app/services/points_service.py](../backend/app/services/points_service.py) |
| バッジ集計 | [backend/scripts/batch_aggregate_points.py](../backend/scripts/batch_aggregate_points.py) |
| マイグレーション | [backend/alembic/versions/c83e1f4a2d09_v7_two_value_points_and_role_multiplier.py](../backend/alembic/versions/c83e1f4a2d09_v7_two_value_points_and_role_multiplier.py) |
| 申請フォーム | [frontend/src/components/applications/PointApplicationForm.tsx](../frontend/src/components/applications/PointApplicationForm.tsx) |
| cascade UI | [frontend/src/components/cascade/CascadeBoard.tsx](../frontend/src/components/cascade/CascadeBoard.tsx) |
