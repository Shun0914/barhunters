"""ダッシュボード API（PR-B）。

4 つの集計エンドポイントを提供：
  - GET /api/dashboard/active-rate    : アクティブ率（rate / mom / vs_company）
  - GET /api/dashboard/oneonone        : 1on1 件数（pair_type 別 + 合計）
  - GET /api/dashboard/points-summary  : 合計ポイント + 年間目標
  - GET /api/dashboard/member-points-by-genre : 課長・部長向けジャンル別（自 org）

クエリパラメータ共通（複数値対応・空 = フィルタなし＝全件対象）：
  companies    : "HD" / "SAIBU"（MVP では DB 絞り込みに使わない）
  hqs          : 本部キー（MVP では DB 絞り込みに使わない）
  departments  : Organization.name と一致するもののみ集計対象に。
  roles        : 役職（MVP では DB 絞り込みに使わない）
  fy           : "FY2026" など
  month        : 1-12

例:
  GET /api/dashboard/active-rate?companies=HD&companies=SAIBU&hqs=SALES&hqs=ENERGY
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.schemas.points_breakdown import OrgMemberGenrePointsRowOut, OrgMemberPointsByGenreOut
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

MANAGER_MEMBER_POINTS_ROLES = frozenset({"課長", "部長"})


def _validated_fy(fy: str) -> str:
    try:
        return dashboard_service.normalize_fy(fy)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/active-rate")
def get_active_rate(
    companies: list[str] = Query(default_factory=list),
    hqs: list[str] = Query(default_factory=list),
    departments: list[str] = Query(default_factory=list),
    roles: list[str] = Query(default_factory=list),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    org_ids = dashboard_service.resolve_org_ids(db, departments=departments)
    return dashboard_service.aggregate_active_rate(db, org_ids, fy, month)


@router.get("/oneonone")
def get_one_on_one(
    companies: list[str] = Query(default_factory=list),
    hqs: list[str] = Query(default_factory=list),
    departments: list[str] = Query(default_factory=list),
    roles: list[str] = Query(default_factory=list),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    org_ids = dashboard_service.resolve_org_ids(db, departments=departments)
    return dashboard_service.aggregate_one_on_one(db, org_ids, fy, month)


@router.get("/points-summary")
def get_points_summary(
    companies: list[str] = Query(default_factory=list),
    hqs: list[str] = Query(default_factory=list),
    departments: list[str] = Query(default_factory=list),
    roles: list[str] = Query(default_factory=list),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    org_ids = dashboard_service.resolve_org_ids(db, departments=departments)
    dept_name = departments[0] if len(departments) == 1 else None
    return dashboard_service.aggregate_points_summary(
        db, org_ids, fy, month, dept_name=dept_name
    )


@router.get("/member-points-by-genre", response_model=OrgMemberPointsByGenreOut)
def get_member_points_by_genre_for_my_org(
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrgMemberPointsByGenreOut:
    """課長・部長のみ: 自分の所属 org メンバーのジャンル別ポイント（一覧表 UI 向けフラット行）。"""
    if current_user.role not in MANAGER_MEMBER_POINTS_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この一覧は課長・部長のみ利用できます",
        )
    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="所属部署が未設定のため集計できません",
        )

    fy = _validated_fy(fy)
    rows_raw = dashboard_service.aggregate_org_member_points_by_genre(
        db,
        org_id=current_user.org_id,
        fy=fy,
        month=month,
    )
    return OrgMemberPointsByGenreOut(
        fy=fy,
        month=month,
        rows=[OrgMemberGenrePointsRowOut.model_validate(r) for r in rows_raw],
    )
