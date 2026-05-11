"""因果ストーリー API ルーター（v5）。

エンドポイント：
  GET  /api/cascade            - DB集計後ポイントから計算（要：5→9 暫定変換）
  POST /api/cascade/simulate   - 任意の9セルポイント値で計算
  GET  /api/cascade/aggregated-points  - DB集計後ポイント

v5 出力：
  - 売上効果カード（メイン）
  - 売上ドライバー/コスト/資本効率（中間）
  - ROIC/ROE（参考）
"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
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
from app.services.points_service import aggregate_approved_points
from app.settings import get_settings

router = APIRouter(prefix="/api/cascade", tags=["cascade"])


# ════════════════════════════════════════════════════════════
# 旧5フィールド → 新9セル 暫定変換
# points_service.py（別担当）が返す5フィールドを9セルに分散する
# 本来は activity_genres マスタを9個にすべきだが、移行期は暫定変換で対応
# ════════════════════════════════════════════════════════════


def _legacy_5_to_9cells(legacy: dict) -> PointsInput:
    """5フィールド形式 {learning, challenge, safety, customer, other} を
    9セル形式に暫定変換する。

    マッピング方針（v5暫定）：
      learning  → daily_future + creative_safety + creative_future（学習行動）
      challenge → cross_future + creative_social + creative_future（挑戦行動）
      safety    → daily_safety + cross_safety + creative_safety（安全行動）
      customer  → daily_social + cross_social + creative_social（顧客向け）
      other     → 9セルに均等分散

    各旧カテゴリのポイントを3セルに均等分配。
    """
    learning = legacy.get("learning", 0)
    challenge = legacy.get("challenge", 0)
    safety = legacy.get("safety", 0)
    customer = legacy.get("customer", 0)
    other = legacy.get("other", 0)

    cells = {
        k: 0
        for k in [
            "daily_social",
            "daily_safety",
            "daily_future",
            "cross_social",
            "cross_safety",
            "cross_future",
            "creative_social",
            "creative_safety",
            "creative_future",
        ]
    }

    # learning → 3セル
    cells["daily_future"] += learning // 3
    cells["creative_safety"] += learning // 3
    cells["creative_future"] += learning - 2 * (learning // 3)

    # challenge → 3セル
    cells["cross_future"] += challenge // 3
    cells["creative_social"] += challenge // 3
    cells["creative_future"] += challenge - 2 * (challenge // 3)

    # safety → 3セル
    cells["daily_safety"] += safety // 3
    cells["cross_safety"] += safety // 3
    cells["creative_safety"] += safety - 2 * (safety // 3)

    # customer → 3セル
    cells["daily_social"] += customer // 3
    cells["cross_social"] += customer // 3
    cells["creative_social"] += customer - 2 * (customer // 3)

    # other → 9セル均等
    each = other // 9
    rem = other - each * 9
    for k in cells:
        cells[k] += each
    cells["daily_social"] += rem  # 余りを daily_social に

    return PointsInput(**cells)


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

    # 売上ドライバー寄与
    drivers_meta = [
        ("revenue", "売上ドライバー", "JCSI/LTV/ESG/地域/PoC"),
        ("cost", "コスト削減", "ESG/採用/保安"),
        ("capital", "資本効率化", "ESG/保安ブランド/採用"),
    ]
    for calc_id, default_label, desc in drivers_meta:
        delta = result.drivers[calc_id]
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
                value_display=f"+{delta * 100:.2f}%",
                current=0.0,
                target=0.0,
                projected=delta,
                improvement=delta,
                description=desc,
                unit="%",
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
def get_cascade() -> CascadeResponse:
    """DB集計後ポイントから計算。

    points_service.aggregate_approved_points() の実装が
    旧5フィールド形式の場合、暫定的に9セルに変換する。
    新形式（9フィールドPointsInput）を返す場合はそのまま使う。
    """
    s = get_settings()
    eng = get_engine(s.DATABASE_URL)

    try:
        legacy_points = aggregate_approved_points(eng, s.aggregate_statuses)
    except Exception:
        # 集計失敗（テーブルなし等）→ 全0で計算
        return _build_response(calculate(PointsInput()))

    # 9フィールド属性があるなら新形式
    if hasattr(legacy_points, "daily_social"):
        return _build_response(calculate(legacy_points))

    # 旧5フィールド形式 → 9セルに暫定変換
    legacy_dict = {
        "learning": getattr(legacy_points, "learning", 0),
        "challenge": getattr(legacy_points, "challenge", 0),
        "safety": getattr(legacy_points, "safety", 0),
        "customer": getattr(legacy_points, "customer", 0),
        "other": getattr(legacy_points, "other", 0),
    }
    points_9 = _legacy_5_to_9cells(legacy_dict)
    return _build_response(calculate(points_9))


@router.post("/simulate", response_model=CascadeResponse)
def simulate_cascade(req: SimulateRequest) -> CascadeResponse:
    """任意の9セルポイント値で計算。"""
    result = calculate(req.points)
    return _build_response(result)


@router.get("/aggregated-points", response_model=PointsInput)
def get_aggregated_points(
    scope: Literal["company", "department"] = Query("company"),
    current_user: User = Depends(get_current_user),
) -> PointsInput:
    """DB集計後ポイントを9セル形式で返す。

    scope:
      - "company"    : 全社集計（従来動作）
      - "department" : ログインユーザーの所属 org_id で絞り込む
    """
    s = get_settings()
    eng = get_engine(s.DATABASE_URL)

    org_id = current_user.org_id if scope == "department" else None

    try:
        legacy_points = aggregate_approved_points(
            eng, s.aggregate_statuses, org_id=org_id
        )
    except Exception:
        return PointsInput()

    if hasattr(legacy_points, "daily_social"):
        return legacy_points

    legacy_dict = {
        "learning": getattr(legacy_points, "learning", 0),
        "challenge": getattr(legacy_points, "challenge", 0),
        "safety": getattr(legacy_points, "safety", 0),
        "customer": getattr(legacy_points, "customer", 0),
        "other": getattr(legacy_points, "other", 0),
    }
    return _legacy_5_to_9cells(legacy_dict)
