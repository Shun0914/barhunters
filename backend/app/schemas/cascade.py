"""因果ストーリー API のリクエスト・レスポンス型（v5）。

v5 変更点：
- PointsInput を 5フィールド → 9フィールド（3アクション × 3カテゴリ）
- FinancialSummary に sales_effect_m / sales_effect_oku を追加
- メイン出力は売上効果。ROIC/ROEは参考値。
"""

from typing import Literal

from pydantic import BaseModel, Field

Reliability = Literal["★★★", "★★", "★"]


class PointsInput(BaseModel):
    """9セル ポイント入力（3アクション × 3カテゴリ）。"""

    # 日常の一歩（1点 × N回）
    daily_social:    int = Field(default=0, description="日常×社会貢献")
    daily_safety:    int = Field(default=0, description="日常×安心安全")
    daily_future:    int = Field(default=0, description="日常×未来共創")
    # 越境の一歩（3点 × N回）
    cross_social:    int = Field(default=0, description="越境×社会貢献")
    cross_safety:    int = Field(default=0, description="越境×安心安全")
    cross_future:    int = Field(default=0, description="越境×未来共創")
    # 創造の一歩（5点 × N回）
    creative_social: int = Field(default=0, description="創造×社会貢献")
    creative_safety: int = Field(default=0, description="創造×安心安全")
    creative_future: int = Field(default=0, description="創造×未来共創")

    @property
    def total(self) -> int:
        return (self.daily_social + self.daily_safety + self.daily_future
                + self.cross_social + self.cross_safety + self.cross_future
                + self.creative_social + self.creative_safety + self.creative_future)

    def as_dict(self) -> dict[str, int]:
        return {
            "daily_social": self.daily_social, "daily_safety": self.daily_safety, "daily_future": self.daily_future,
            "cross_social": self.cross_social, "cross_safety": self.cross_safety, "cross_future": self.cross_future,
            "creative_social": self.creative_social, "creative_safety": self.creative_safety, "creative_future": self.creative_future,
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
    """画面下部のサマリ（v5: 売上効果メイン）"""

    # v5 メイン
    sales_effect_m: float            # 売上効果（百万円）
    sales_effect_oku: float          # 売上効果（億円）
    sales_target_oku: float = 6.0    # 目標6億円

    # 参考値
    roic_current: float
    roic_delta: float
    roic_target: float
    roe_current: float
    roe_delta: float
    roe_target: float


class CascadeResponse(BaseModel):
    points: PointsInput
    points_total: int
    cards: list[CardData]
    connections: list[Edge]
    summary: FinancialSummary
    yearly: list[YearlyResult]
    updated_at: str
