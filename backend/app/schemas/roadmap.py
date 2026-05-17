# v2.5 仕様準拠・5/17 議論結果反映
"""Phase 別ロードマップ / 年次推移 API のレスポンス型。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class YearlyProgressionItem(BaseModel):
    """単年の効果（線形補完）。

    *_pt は %ポイント単位（例: roic_pt=0.196 は +0.196pt）。
    *_oku は億円単位。
    manifestation_rate は 0.20 = 20% 発現。
    """

    roic_pt: float
    roe_pt: float
    sales_oku: float
    cost_oku: float
    capital_oku: float
    manifestation_rate: float


class YearlyProgressionResponse(BaseModel):
    points: int = Field(description="投入ポイント総数（3 カテゴリ均等配分）")
    start_year: int
    full_effect_year: int = Field(description="manifestation_rate が 1.0 になる年")
    items: dict[int, YearlyProgressionItem]


class PhaseItem(BaseModel):
    label: str
    points: int | None
    period: str
    sales_oku: float
    cost_oku: float
    capital_oku: float
    roic_pt: float
    roe_pt: float
    act2027_contribution_pct: int | None = Field(
        default=None, description="ACT2027 ROE 目標 +1.7pt に対する寄与率（整数 %）"
    )
    note: str | None = None


class PhaseRoadmapResponse(BaseModel):
    phase_1: PhaseItem
    phase_2: PhaseItem
    phase_3_low: PhaseItem
    phase_3_high: PhaseItem
    theoretical_max: PhaseItem
