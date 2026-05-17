# v2.5 仕様準拠・5/17 議論結果反映
"""Phase 別ロードマップ / 年次推移 API。

5/20 役員プレゼンの「制度の伸びしろ」表示用。認証不要（cascade と同じ公開系）。

エンドポイント:
  GET /api/yearly-progression?points=6000
      2025〜2030 の線形補完による年次効果
  GET /api/phase-roadmap
      Phase 1/2/3/理論上限の財務効果
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.roadmap import (
    PhaseRoadmapResponse,
    YearlyProgressionItem,
    YearlyProgressionResponse,
)
from app.services.calculator import calculate_yearly_progression
from app.services.phase_roadmap import calculate_phase_roadmap

router = APIRouter(prefix="/api", tags=["roadmap"])


@router.get("/yearly-progression", response_model=YearlyProgressionResponse)
def get_yearly_progression(
    points: int = Query(6000, ge=1, description="投入ポイント総数（3 カテゴリ均等配分）"),
    start_year: int = Query(2025, ge=2024, le=2050),
    full_effect_years: int = Query(5, ge=1, le=20),
    end_year: int = Query(2030, ge=2025, le=2060),
) -> YearlyProgressionResponse:
    raw = calculate_yearly_progression(
        points=points,
        start_year=start_year,
        full_effect_years=full_effect_years,
        end_year=end_year,
    )
    items = {y: YearlyProgressionItem(**v) for y, v in raw.items()}
    return YearlyProgressionResponse(
        points=points,
        start_year=start_year,
        full_effect_year=start_year + full_effect_years - 1,
        items=items,
    )


@router.get("/phase-roadmap", response_model=PhaseRoadmapResponse)
def get_phase_roadmap() -> PhaseRoadmapResponse:
    return PhaseRoadmapResponse(**calculate_phase_roadmap())
