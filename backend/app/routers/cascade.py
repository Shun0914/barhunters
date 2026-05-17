"""因果ストーリー API ルーター（v7）。

エンドポイント：
  GET  /api/cascade            - DB集計済 3カテゴリポイントから計算
  POST /api/cascade/simulate   - 任意の 3カテゴリポイント値で計算
  GET  /api/cascade/aggregated-points  - DB集計済 3カテゴリポイント

v7 ポイント体系: daily(0.1P)/creative(5P) × social/safety/future + 役職傾斜 (×3.0 課長以上)。
cascade 上流は category のみに集約。

"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.auth import get_current_user
from app.db import get_engine, get_session_factory
from app.models import User
from app.models.indicator import Indicator
from app.schemas.cascade import (
    CardData,
    CascadeResponse,
    FinancialSummary,
    PointsInput,
    SimulateRequest,
)
from app.services.calculator import (
    ROE_CURRENT,
    ROE_TARGET_2027,
    ROIC_CURRENT,
    ROIC_TARGET_2027,
    SALES_TARGET_OKU,
    CascadeResult,
    KpiResult,
    calculate,
)
from app.services.indicator_meta_service import load_indicator_meta
from app.services.points_service import aggregate_approved_points
from app.settings import get_settings

router = APIRouter(prefix="/api/cascade", tags=["cascade"])


def _format_value(node: KpiResult) -> str:
    unit = node.unit
    val = node.projected
    if unit == "%":
        return f"{val:.1f}%"
    if unit == "スコア":
        return f"{val:.2f}"
    if unit == "名":
        return f"{val:,.0f}名"
    if unit == "件":
        return f"{val:.1f}件"
    if unit == "万kW":
        return f"{val:.1f}万kW"
    if unit == "万t":
        return f"{val:.1f}万t"
    if unit == "千円/戸":
        return f"{val:.1f}千円/戸"
    if unit == "年連続":
        return f"{val:.1f}年連続"
    if unit == "指数":
        return f"{val:.1f}指数"
    if unit == "日":
        return f"{val:.2f}日"
    return f"{val}"


def _kpi_to_card(node: KpiResult, indicator: Indicator | None, column_key_default: str) -> CardData:
    return CardData(
        indicator_id=indicator.id if indicator else None,
        calc_id=node.calc_id,
        label=indicator.label if indicator else node.name,
        tab_key=indicator.tab_key if indicator else "all",
        column_key=indicator.column_key if indicator else column_key_default,
        sort_order=indicator.sort_order if indicator else 0,
        link_url=indicator.link_url if indicator else None,
        value_display=_format_value(node),
        current=node.current,
        target=node.target,
        projected=node.projected,
        achievement=node.achievement,
        improvement=node.improvement,
        reliability=node.reliability,
        description=node.description,
        unit=node.unit,
    )


def _financial_to_cards(
    result: CascadeResult, indicator_map: dict[str, Indicator]
) -> list[CardData]:
    cards: list[CardData] = []

    # v5 メイン：売上効果カード
    ind_sales = indicator_map.get("sales_effect")
    cards.append(
        CardData(
            indicator_id=ind_sales.id if ind_sales else None,
            calc_id="sales_effect",
            label=ind_sales.label if ind_sales else "売上効果",
            tab_key=ind_sales.tab_key if ind_sales else "all",
            column_key=ind_sales.column_key if ind_sales else "lagging",
            sort_order=ind_sales.sort_order if ind_sales else 99,
            link_url=ind_sales.link_url if ind_sales else None,
            value_display=f"+{result.sales_effect_oku:.2f}億円",
            current=0.0,
            target=SALES_TARGET_OKU,
            projected=result.sales_effect_oku,
            improvement=result.sales_effect_oku,
            achievement=result.sales_effect_oku / SALES_TARGET_OKU if SALES_TARGET_OKU else 0,
            reliability="★★",
            description=f"6,000P目標時に+{SALES_TARGET_OKU}億円",
            unit="億円",
        )
    )

    # 売上ドライバー / コスト削減 / 資本効率化 — v7: Excel 整合の 億円 で表示
    drivers_meta = [
        ("revenue", "売上ドライバー", "JCSI/LTV/ESG/地域/PoC", result.sales_effect_oku),
        ("cost", "コスト削減", "ESG/採用/保安", result.cost_savings_oku),
        ("capital", "資本効率化", "ESG/保安ブランド/採用", result.capital_savings_oku),
    ]
    for calc_id, default_label, desc, value_oku in drivers_meta:
        ind = indicator_map.get(calc_id)
        cards.append(
            CardData(
                indicator_id=ind.id if ind else None,
                calc_id=calc_id,
                label=ind.label if ind else default_label,
                tab_key=ind.tab_key if ind else "all",
                column_key=ind.column_key if ind else "lagging",
                sort_order=ind.sort_order if ind else 0,
                link_url=ind.link_url if ind else None,
                value_display=f"+{value_oku:.2f}億円",
                current=0.0,
                target=0.0,
                projected=value_oku,
                improvement=value_oku,
                description=desc,
                unit="億円",
            )
        )

    # ROIC（参考）
    ind_roic = indicator_map.get("roic")
    cards.append(
        CardData(
            indicator_id=ind_roic.id if ind_roic else None,
            calc_id="roic",
            label=ind_roic.label if ind_roic else "ROIC（参考）",
            tab_key=ind_roic.tab_key if ind_roic else "all",
            column_key=ind_roic.column_key if ind_roic else "lagging",
            sort_order=ind_roic.sort_order if ind_roic else 100,
            link_url=ind_roic.link_url if ind_roic else None,
            value_display=f"+{result.roic_delta * 100:.3f}pt",
            current=ROIC_CURRENT,
            target=ROIC_TARGET_2027,
            projected=ROIC_CURRENT + result.roic_delta,
            improvement=result.roic_delta,
            reliability="★",
            description="人的資本単独寄与（ACT2027 目標 +0.2pt の一部）",
            unit="%",
        )
    )

    # ROE（参考）
    ind_roe = indicator_map.get("roe")
    cards.append(
        CardData(
            indicator_id=ind_roe.id if ind_roe else None,
            calc_id="roe",
            label=ind_roe.label if ind_roe else "ROE（参考）",
            tab_key=ind_roe.tab_key if ind_roe else "all",
            column_key=ind_roe.column_key if ind_roe else "lagging",
            sort_order=ind_roe.sort_order if ind_roe else 101,
            link_url=ind_roe.link_url if ind_roe else None,
            value_display=f"+{result.roe_delta * 100:.3f}pt",
            current=ROE_CURRENT,
            target=ROE_TARGET_2027,
            projected=ROE_CURRENT + result.roe_delta,
            improvement=result.roe_delta,
            reliability="★",
            description="人的資本単独寄与（ACT2027 目標 +1.7pt の一部）",
            unit="%",
        )
    )

    return cards


def _load_indicators() -> dict[str, Indicator]:
    factory = get_session_factory()
    with factory() as session:
        rows = session.scalars(select(Indicator).where(Indicator.calc_id.is_not(None))).all()
    return {ind.calc_id: ind for ind in rows if ind.calc_id}


def _build_response(result: CascadeResult) -> CascadeResponse:
    indicator_map = _load_indicators()
    cards: list[CardData] = []

    # 3層KPI
    for calc_id, node in result.layer3.items():
        cards.append(_kpi_to_card(node, indicator_map.get(calc_id), "leading"))

    # 中間層
    for calc_id, node in result.mid.items():
        cards.append(_kpi_to_card(node, indicator_map.get(calc_id), "mid"))

    # 財務 + 売上効果
    cards.extend(_financial_to_cards(result, indicator_map))

    cards.sort(key=lambda c: (c.column_key, c.sort_order, c.label))

    summary = FinancialSummary(
        sales_effect_m=result.sales_effect_m,
        sales_effect_oku=result.sales_effect_oku,
        sales_target_oku=SALES_TARGET_OKU,
        roic_current=ROIC_CURRENT,
        roic_delta=result.roic_delta,
        roic_target=ROIC_TARGET_2027,
        roe_current=ROE_CURRENT,
        roe_delta=result.roe_delta,
        roe_target=ROE_TARGET_2027,
    )

    return CascadeResponse(
        points=result.points,
        points_total=result.points.total,
        cards=cards,
        connections=result.connections,
        summary=summary,
        yearly=result.yearly,
        updated_at=datetime.now().isoformat(),
    )


@router.get("", response_model=CascadeResponse)
def get_cascade(
    _current_user: User = Depends(get_current_user),
) -> CascadeResponse:
    """DB集計済 3カテゴリポイントから cascade を計算。"""
    s = get_settings()
    eng = get_engine(s.DATABASE_URL)

    try:
        points = aggregate_approved_points(eng, s.aggregate_statuses)
    except Exception:
        # 集計失敗（テーブルなし等）→ 全0で計算
        return _build_response(calculate(PointsInput()))

    return _build_response(calculate(points))


@router.post("/simulate", response_model=CascadeResponse)
def simulate_cascade(
    req: SimulateRequest,
    _current_user: User = Depends(get_current_user),
) -> CascadeResponse:
    """任意の 3カテゴリポイント値で計算。"""

    result = calculate(req.points)
    return _build_response(result)


@router.get("/aggregated-points", response_model=PointsInput)
def get_aggregated_points(
    scope: Literal["company", "department"] = Query("company"),
    current_user: User = Depends(get_current_user),
) -> PointsInput:
    """DB集計済の 3カテゴリポイントを返す。

    scope:
      - "company"    : 全社集計
      - "department" : ログインユーザーの所属 org_id で絞り込む
    """
    s = get_settings()
    eng = get_engine(s.DATABASE_URL)

    if scope == "department" and current_user.org_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="所属部署が未設定のため、自部署集計は利用できません",
        )

    org_id = current_user.org_id if scope == "department" else None

    try:
        return aggregate_approved_points(eng, s.aggregate_statuses, org_id=org_id)
    except Exception:
        return PointsInput()

@router.get("/indicator-meta")
def get_indicator_meta() -> dict:
    """指標の説明メタを返す（業務オーナーが backend JSON で更新する想定）。

    認証不要。読み取り専用、機密性なし。
    """
    return load_indicator_meta()
