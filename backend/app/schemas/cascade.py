"""因果ストーリー API のリクエスト・レスポンス型（v7）。

v7 変更点：
- PointsInput を 9セル × 3アクション × 3カテゴリ → 3 カテゴリ集約に変更
  （申請は 2値（daily/creative）× 3カテゴリだが、cascade 上流は category のみに集約）
- 数値は Decimal/float 対応（1pt 単位の細かい変化を表現するため）
"""

from typing import Literal

from pydantic import BaseModel, Field

Reliability = Literal["★★★", "★★", "★"]


class PointsInput(BaseModel):
    """3カテゴリ ポイント入力。

    値は「その部署（または全社）で蓄積された総ポイント（final_point の合計）」を表す。
    """

    social: float = Field(default=0.0, description="社会貢献カテゴリの累積ポイント")
    safety: float = Field(default=0.0, description="安心安全カテゴリの累積ポイント")
    future: float = Field(default=0.0, description="未来共創カテゴリの累積ポイント")

    @property
    def total(self) -> float:
        return self.social + self.safety + self.future

    def as_dict(self) -> dict[str, float]:
        return {
            "social": self.social,
            "safety": self.safety,
            "future": self.future,
        }


class SimulateRequest(BaseModel):
    points: PointsInput


class CardData(BaseModel):
    indicator_id: int | None = None
    calc_id: str | None = None
    label: str
    tab_key: str
    column_key: str
    sort_order: int = 0
    link_url: str | None = None
    value_display: str
    current: float | None = None
    target: float | None = None
    projected: float | None = None
    achievement: float | None = None
    improvement: float | None = None
    reliability: Reliability | None = None
    description: str | None = None
    unit: str | None = None


class Edge(BaseModel):
    from_id: str
    to_id: str
    coefficient: float
    reliability: Reliability
    citation: str = ""


class YearlyResult(BaseModel):
    year: int
    roic: float
    roe: float
    roic_delta: float
    roe_delta: float


class FinancialSummary(BaseModel):
    sales_effect_m: float
    sales_effect_oku: float
    sales_target_oku: float = 6.0
    roic_current: float
    roic_delta: float
    roic_target: float
    roe_current: float
    roe_delta: float
    roe_target: float


class CascadeResponse(BaseModel):
    points: PointsInput
    points_total: float
    cards: list[CardData]
    connections: list[Edge]
    summary: FinancialSummary
    yearly: list[YearlyResult]
    updated_at: str
