# 西部ガスHD様 人的資本投資 計算ロジック説明書 v2.0

> 作成日: 2026-05-16
> 対象システム: barhunters（人的資本・挑戦活動の可視化 + ポイント申請／承認フロー）
> バージョン: v7（Excel 整合版）

---

## 1. 設計思想

「数字より人が動く」を起点に、人的資本投資の効果を **FY2025 有価証券報告書の実数値** で可視化する。

- カスケード係数は文献値（Gallup、Fornell、Gupta&Lehmann、ISO30414 ほか）と西部ガス様内部の判断値を組み合わせ
- 1P = 10 万円換算は廃止し、Excel Sheet 10 の財務ドライバー寄与率を実数値に乗じて算出する

旧 v1.0（5/14 きみなり版）からの主な変更点:
- **魔法定数 `SALES_CALIBRATION = 0.01815` を廃止**し、Excel ベースの 3 つの校正係数に分解
- ROIC を「売上 → NOPAT」「コスト → NOPAT」「資本効率 → 投下資本減」の **3 経路** から算出
- ROE は `ROIC × レバレッジ` で算出

---

## 2. FY2025 財務基準値（西部ガスHD 有報）

| 項目 | 値 | コード変数 |
|------|----|----------|
| 売上高 | 2,544 億円 | `REVENUE_M = 254,442` |
| 営業利益 | 106 億円 | `OP_INCOME_M = 10,593` |
| NOPAT（税引後営業利益） | 71.5 億円 | `NOPAT_M = 7,150` |
| 投下資本（有利子負債 + 株主資本） | 2,829 億円 | `INVESTED_CAP = 282,876` |
| 株主資本 | 859 億円 | `EQUITY_M = 85,909` |
| 純利益 | 54 億円 | `NET_INCOME_M = 5,400` |
| 現状 ROIC | 2.53% | `ROIC_CURRENT` |
| 現状 ROE | 6.29% | `ROE_CURRENT` |
| 営業利益率 | 4.16% | `OP_MARGIN` |
| レバレッジ（投下資本/株主資本） | 3.29 | `LEVERAGE` |
| 実効税率 | 32.5% | `TAX_RATE` |
| ACT2027 ROIC 目標 | 2.3% | `ROIC_TARGET_2027` |
| ACT2027 ROE 目標 | 8.0% | `ROE_TARGET_2027` |

定義: `backend/app/services/calculator.py` 上部の定数群。

---

## 3. ポイント体系（2 値 × 3 カテゴリ）

| レベル | 1 件あたりベース | 想定頻度 |
|--------|-----------------|---------|
| 日常 (daily) | **0.1P** | 24 日に 1 回、誰でも参加できる行動 |
| 創造 (creative) | **5P** | 年数回、新しい価値創出の挑戦 |

| カテゴリ | 説明 |
|---------|-------|
| 社会貢献 (social) | 地域・顧客・社会への貢献 |
| 安心安全 (safety) | インフラ事業の根幹、保安・品質 |
| 未来共創 (future) | 新規事業・イノベーション |

旧 v5/v6 の「越境」レベルは v7 で廃止（Alembic migration `c83e1f4a2d09` で関連 row を削除）。

---

## 4. 役職傾斜（2 段階）

| 区分 | 役職 | 倍率 |
|------|-----|------|
| 管理職 | 課長 / 部長 / 役員 | **3.0x** |
| 一般 | 係長 / 一般社員 | **1.0x** |

定義: `backend/app/services/point_calc.py` の `MANAGER_ROLES`。

申請ポイント計算式:
```
final_point = base_point(level) × role_multiplier(role)
```

---

## 5. カスケード（5 層）

```
第1層: 入力ポイント（3 カテゴリ: social / safety / future）
   ↓ M3_7（M9_7 の平均集約、仮置き）
第2層: 風土・組織文化 7 項目
   ↓ M7_4（文献値 + チーム判断）
第3層: KPI 4 項目（ENG / 挑戦 / 変革 / 定着）
   ↓ LAYER3_TO_MID（Gallup, Fornell, Park&Shaw, ISO30414, ...）
第4層: 中間層・事業実績 13 項目
   ↓ MID_TO_FIN（Gupta&Lehmann, 柳・伊藤, ...）
第5層: 財務評価（売上効果 / コスト削減 / 資本効率化 → ROIC / ROE）
```

第 1〜2 層の伝播係数は Phase 1 で実証していく仮説、第 3〜5 層は文献値ベース。

---

## 6. 財務換算（Excel Sheet 10 整合）

### 6.1 校正係数

cascade 第 5 層の出力（revenue / cost / capital ドライバー値）を、Excel Sheet 10 の財務ドライバー寄与率に揃えるための校正係数。

| 係数 | 値 | 算出根拠 |
|------|----|---------|
| `EXCEL_REVENUE_FACTOR` | 0.02948 | 970 M / (0.1294 × 254,442 M) |
| `EXCEL_COST_FACTOR` | 0.01420 | 540 M / (0.1495 × 254,442 M) |
| `EXCEL_CAPITAL_FACTOR` | 0.12264 | 5,940 M / (0.1712 × 282,876 M) |

分母は 6,000P 投入時の cascade 実測値（2026-05-16 計測）。

### 6.2 計算式

```
売上効果   = revenue × REVENUE_M     × EXCEL_REVENUE_FACTOR
コスト削減 = cost    × REVENUE_M     × EXCEL_COST_FACTOR
資本効率化 = capital × INVESTED_CAP  × EXCEL_CAPITAL_FACTOR

NOPAT 寄与:
  売上 → NOPAT  = 売上効果   × OP_MARGIN × (1 − TAX_RATE)
  コスト → NOPAT = コスト削減 × (1 − TAX_RATE)
  合計 NOPAT_new = NOPAT + 売上NOPAT寄与 + コストNOPAT寄与

投下資本減:
  INVESTED_CAP_new = INVESTED_CAP − 資本効率化

ROIC_new = NOPAT_new / INVESTED_CAP_new
ROIC_delta = ROIC_new − ROIC_CURRENT

ROE_new = ROIC_new × LEVERAGE
ROE_delta = ROE_new − (ROIC_CURRENT × LEVERAGE)
```

### 6.3 検証（6,000P 投入時）

実装出力と Excel 目標との照合:

| 指標 | 実装出力 | Excel 目標 | 許容 |
|------|---------|----------|------|
| 売上効果 | **9.70 億** | 9.7 億 | ±0.5 |
| コスト削減 | **5.40 億** | 5.4 億 | — |
| 資本効率化 | **59.40 億** | 59.4 億 | — |
| ROIC 改善 | **+0.196pt** | +0.20pt | ±0.05pt |
| ROE 改善 | **+0.644pt** | +0.70pt | ±0.10pt |

---

## 7. Phase 別目標値

| Phase | 期間 | 目標 P | 売上効果 | ROIC 改善 | ROE 改善 |
|-------|------|--------|----------|-----------|----------|
| Phase 1 | 1 年 | **6,000P** | +9.7 億 | +0.20pt | +0.70pt |
| Phase 2 | 3 年 | 20,000P | +32 億 | +0.67pt | +2.3pt |
| Phase 3 | 10 年 | 40,000P | +65 億 | +1.34pt | +4.7pt |

Phase 2 / 3 の数値は Phase 1 の線形外挿（要精緻化）。

---

## 8. 集計バッジ処理（毎日 0 時更新）

リアルタイム計算を廃止し、毎日 0:00 にバッジ集計を更新する。

- 「先にやった人が有利」感を排除（5/14 議論）
- 集計テーブル: `department_category_points` (department_id × category × total_point)
- 実行スクリプト: `backend/scripts/batch_aggregate_points.py`
  - 手動実行: `cd backend && python -m scripts.batch_aggregate_points`
- cron / Azure scheduler の設定は別タスク（デプロイ時）

GET `/api/cascade/aggregated-points?scope={company|department}` は現状
`aggregate_approved_points()` 経由で `point_applications` を直接集計する。
将来このバッジテーブルから読む可能性に備えて DB 構造は揃えている。

---

## 9. 限界・注意事項

- 第 1〜3 層の伝播係数（M3_7 / M7_4）は仮説。Phase 1 で実証する前提
- 第 3〜5 層は文献値ベース（Gallup、Fornell、Gupta&Lehmann、ISO30414、柳・伊藤レポート ほか）
- 1P = 10 万円の旧換算は **廃止**、FY2025 実数値ベース計算に統一
- 柳モデルの遅延効果（保安事故ゼロ 4 年遅延、採用効果 7 年遅延）は Phase 2 で精緻化
- ROIC / ROE の数値は「Phase 1 でのフルポテンシャル達成時」の値。実証はこれから
- リアルタイム計算ではなく毎日 0 時のバッジ更新。即時反映は期待しない

---

## 10. 今後の精緻化方針

| 期間 | アクション |
|------|-----------|
| 1 年 | 行動データの蓄積、初期検証、Phase 1 でフルポテンシャル達成を目指す |
| 3 年 | 西部ガス様固有の伝播係数を再校正、柳モデルの遅延効果を実装 |
| 5〜10 年 | 完全な実証、KPI 層の 4→7 拡張、係数の最終確定 |

「数字より人を動かす」を貫きながら、運用しながら実データを蓄積し、
**2030 年を目処**に係数の精緻化を完了する。

---

## 参照ファイル

| 役割 | パス |
|------|------|
| ベースポイント / 役職傾斜 | [backend/app/services/point_calc.py](../backend/app/services/point_calc.py) |
| カスケード計算（v7 Excel 整合） | [backend/app/services/calculator.py](../backend/app/services/calculator.py) |
| 集計 | [backend/app/services/points_service.py](../backend/app/services/points_service.py) |
| バッジ集計 | [backend/scripts/batch_aggregate_points.py](../backend/scripts/batch_aggregate_points.py) |
| マイグレーション | [backend/alembic/versions/c83e1f4a2d09_v7_two_value_points_and_role_multiplier.py](../backend/alembic/versions/c83e1f4a2d09_v7_two_value_points_and_role_multiplier.py) |
| 申請フォーム | [frontend/src/components/applications/PointApplicationForm.tsx](../frontend/src/components/applications/PointApplicationForm.tsx) |
| cascade UI | [frontend/src/components/cascade/CascadeBoard.tsx](../frontend/src/components/cascade/CascadeBoard.tsx) |
| Excel 出典 | 西部ガス_計算ロジック_ポイント.xlsx Sheet 10 |
