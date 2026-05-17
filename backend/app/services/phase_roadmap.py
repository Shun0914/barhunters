# v2.6 仕様準拠・5/17 議論結果反映
"""Phase 別ロードマップ計算。

Phase 1（60,000P）は calculator.calculate() の実計算結果を使用。
Phase 2/3 は Phase 1 を線形スケール（points_ratio = phase_points / 60_000）。
理論上限は v2.4 §6 の表からハードコード（実現不可能な参考値）。

5/20 役員プレゼンの「制度の伸びしろを見せる」用途。
v2.6 変更点: 1P = 1 万円 に単位変更（KPI_SCALE 1/10、PHASE_TARGETS 10x）。
"""

from __future__ import annotations

from typing import Any

from app.schemas.cascade import PointsInput
from app.services.calculator import calculate

# ACT2027 ROE 目標 +1.7pt（=8.0% - 6.3%）に対する寄与率算出用。
# 6.3% は ROE_CURRENT、8.0% は ROE_TARGET_2027（calculator.py 上部の定数）。
ACT2027_ROE_TARGET_DELTA_PT = 1.7

# v2.6: Phase 別の目標 P（旧 6,000 / 10,000 / 20,000 / 25,000 の 10 倍）
PHASE_TARGETS: dict[str, int] = {
    "phase_1": 60_000,
    "phase_2": 100_000,
    "phase_3_low": 200_000,
    "phase_3_high": 250_000,
}

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
    base_points: int = 60_000,
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
    # Phase 1（60,000P を 3 カテゴリに 20,000P ずつ）
    p1_points = PHASE_TARGETS["phase_1"]
    per_cat = p1_points / 3
    r1 = calculate(PointsInput(social=per_cat, safety=per_cat, future=per_cat))

    base_sales = r1.sales_effect_oku
    base_cost = r1.cost_savings_oku
    base_capital = r1.capital_savings_oku
    base_roic_pt = r1.roic_delta * 100
    base_roe_pt = r1.roe_delta * 100

    phase_1 = {
        "label": "Phase 1（全社一斉導入）",
        "points": p1_points,
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
            points=PHASE_TARGETS["phase_2"],
            period="〜2028 投入 / 〜2033 フル",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "phase_3_low": _phase_entry(
            label="Phase 3（次期中計・下限）",
            points=PHASE_TARGETS["phase_3_low"],
            period="次期中計期間",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "phase_3_high": _phase_entry(
            label="Phase 3（次期中計・上限）",
            points=PHASE_TARGETS["phase_3_high"],
            period="次期中計期間",
            base_sales=base_sales,
            base_cost=base_cost,
            base_capital=base_capital,
            base_roic_pt=base_roic_pt,
            base_roe_pt=base_roe_pt,
        ),
        "theoretical_max": dict(THEORETICAL_MAX),
    }
