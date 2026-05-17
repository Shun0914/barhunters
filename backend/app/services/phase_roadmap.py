# v2.5 仕様準拠・5/17 議論結果反映
"""Phase 別ロードマップ計算。

Phase 1（6,000P）は calculator.calculate() の実計算結果を使用。
Phase 2/3 は Phase 1 を線形スケール（points_ratio = phase_points / 6000）。
理論上限は v2.4 §6 の表からハードコード（実現不可能な参考値）。

5/20 役員プレゼンの「制度の伸びしろを見せる」用途。
"""

from __future__ import annotations

from typing import Any

from app.schemas.cascade import PointsInput
from app.services.calculator import calculate

# ACT2027 ROE 目標 +1.7pt（=8.0% - 6.3%）に対する寄与率算出用。
# 6.3% は ROE_CURRENT、8.0% は ROE_TARGET_2027（calculator.py 上部の定数）。
ACT2027_ROE_TARGET_DELTA_PT = 1.7

# 理論上限（v2.4 §6 の表の値）。KPI 5-6 倍改善・13 中間層全達成シナリオ。
THEORETICAL_MAX = {
    "label": "理論上限(参考)",
    "points": None,
    "period": "長期（20-30 年）",
    "sales_oku": 45.71,
    "cost_oku": 20.44,
    "capital_oku": 278.24,
    "roic_pt": 1.0,
    "roe_pt": 3.3,
    "act2027_contribution_pct": None,
    "note": "KPI 5-6 倍改善・13 中間層全達成シナリオ。実現不可能な参考値で、制度の天井を示す",
}


def _act2027_pct(roe_pt: float) -> int:
    """ACT2027 ROE 目標 +1.7pt に対する寄与率（整数 %）。"""
    return round(roe_pt / ACT2027_ROE_TARGET_DELTA_PT * 100)


def _phase_entry(
    label: str,
    points: int,
    period: str,
    base_sales: float,
    base_cost: float,
    base_capital: float,
    base_roic_pt: float,
    base_roe_pt: float,
    base_points: int = 6000,
) -> dict[str, Any]:
    """Phase 1 の結果 × points_ratio で線形スケールした Phase エントリを返す。"""
    ratio = points / base_points
    roe_pt = base_roe_pt * ratio
    return {
        "label": label,
        "points": points,
        "period": period,
        "sales_oku": base_sales * ratio,
        "cost_oku": base_cost * ratio,
        "capital_oku": base_capital * ratio,
        "roic_pt": base_roic_pt * ratio,
        "roe_pt": roe_pt,
        "act2027_contribution_pct": _act2027_pct(roe_pt),
    }


def calculate_phase_roadmap() -> dict[str, dict[str, Any]]:
    """Phase 1/2/3/理論上限の財務効果を一括計算。

    Phase 1 は実計算、Phase 2/3 は Phase 1 の線形スケール、
    理論上限は v2.4 §6 のハードコード値。
    """
    # Phase 1（6,000P を 3 カテゴリに 2,000P ずつ）
    per_cat = 6000 / 3
    r1 = calculate(PointsInput(social=per_cat, safety=per_cat, future=per_cat))

    base_sales = r1.sales_effect_oku
    base_cost = r1.cost_savings_oku
    base_capital = r1.capital_savings_oku
    base_roic_pt = r1.roic_delta * 100
    base_roe_pt = r1.roe_delta * 100

    phase_1 = {
        "label": "Phase 1（全社一斉導入）",
        "points": 6000,
        "period": "FY2026 投入 / 2030 フル",
        "sales_oku": base_sales,
        "cost_oku": base_cost,
        "capital_oku": base_capital,
        "roic_pt": base_roic_pt,
        "roe_pt": base_roe_pt,
        "act2027_contribution_pct": _act2027_pct(base_roe_pt),
    }

    return {
        "phase_1": phase_1,
        "phase_2": _phase_entry(
            label="Phase 2（拡大）",
            points=10000,
            period="〜2028 投入 / 〜2033 フル",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "phase_3_low": _phase_entry(
            label="Phase 3（次期中計・下限）",
            points=20000,
            period="次期中計期間",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "phase_3_high": _phase_entry(
            label="Phase 3（次期中計・上限）",
            points=25000,
            period="次期中計期間",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "theoretical_max": dict(THEORETICAL_MAX),
    }
