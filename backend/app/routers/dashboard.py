"""ダッシュボード API（PR-B）。

3 つの集計エンドポイントを提供：
  - GET /api/dashboard/active-rate    : アクティブ率（rate / mom / vs_company）
  - GET /api/dashboard/oneonone        : 1on1 件数（pair_type 別 + 合計）
  - GET /api/dashboard/points-summary  : 合計ポイント + 年間目標

クエリパラメータ共通：
  company    : "HD" | "SAIBU"（MVP では DB 絞り込みに使わない）
  hq         : 本部キー（MVP では DB 絞り込みに使わない）
  departments: CSV 文字列。Organization.name と一致するもののみ集計対象に。
  roles      : CSV 文字列（MVP では DB 絞り込みに使わない）
  fy         : "FY2026" など
  month      : 1-12
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _validated_fy(fy: str) -> str:
    try:
        return dashboard_service.normalize_fy(fy)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v for v in (s.strip() for s in value.split(",")) if v]


@router.get("/active-rate")
def get_active_rate(
    company: str = Query("SAIBU"),
    hq: str | None = Query(None),
    departments: str | None = Query(None),
    roles: str | None = Query(None),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    dept_list = _parse_csv(departments)
    org_ids = dashboard_service.resolve_org_ids(db, departments=dept_list)
    return dashboard_service.aggregate_active_rate(db, org_ids, fy, month)


@router.get("/oneonone")
def get_one_on_one(
    company: str = Query("SAIBU"),
    hq: str | None = Query(None),
    departments: str | None = Query(None),
    roles: str | None = Query(None),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    dept_list = _parse_csv(departments)
    org_ids = dashboard_service.resolve_org_ids(db, departments=dept_list)
    return dashboard_service.aggregate_one_on_one(db, org_ids, fy, month)


@router.get("/points-summary")
def get_points_summary(
    company: str = Query("SAIBU"),
    hq: str | None = Query(None),
    departments: str | None = Query(None),
    roles: str | None = Query(None),
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    fy = _validated_fy(fy)
    dept_list = _parse_csv(departments)
    org_ids = dashboard_service.resolve_org_ids(db, departments=dept_list)
    dept_name = dept_list[0] if len(dept_list) == 1 else None
    return dashboard_service.aggregate_points_summary(
        db, org_ids, fy, month, dept_name=dept_name
    )
