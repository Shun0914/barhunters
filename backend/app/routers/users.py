"""ユーザー関連エンドポイント。spec §5.1 / §2.5。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.schemas.master import ApprovalRouteOut, UserBriefOut
from app.schemas.points_breakdown import GenrePointsRowOut, MyPointsByGenreOut
from app.services import dashboard_service

router = APIRouter(prefix="/api/users", tags=["users"])

# spec §2.5 — 申請者の役職から N 階層上の役職列を返す。
# 部長は申請不可（Q-01 確定）→ 段数 0、候補なし。
APPROVAL_ROUTE_BY_ROLE: dict[str, list[str]] = {
    "一般社員": ["係長", "課長", "部長"],
    "係長": ["課長", "部長"],
    "課長": ["部長"],
    "部長": [],
}


@router.get("", response_model=list[UserBriefOut])
def list_users(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[UserBriefOut]:
    """ログイン後: 全ユーザー一覧（デモのユーザー切替 UI で使用）。氏名 50 音順。"""
    users = db.scalars(select(User).order_by(User.name)).all()
    return [UserBriefOut.model_validate(u) for u in users]


@router.get("/me", response_model=UserBriefOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserBriefOut:
    """現在のログインユーザーを返す（サイドバー左下の表示用）。"""
    return UserBriefOut.model_validate(current_user)


@router.get("/me/points-by-genre", response_model=MyPointsByGenreOut)
def get_my_points_by_genre(
    fy: str = Query("FY2026"),
    month: int = Query(5, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyPointsByGenreOut:
    """自分の承認済みポイントを活動ジャンル別に返す（ダッシュボードと同 FY 累積期間）。"""
    try:
        fy_n = dashboard_service.normalize_fy(fy)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    agg = dashboard_service.aggregate_my_points_by_genre(
        db,
        user_id=current_user.id,
        fy=fy_n,
        month=month,
    )
    return MyPointsByGenreOut(
        fy=fy_n,
        month=month,
        rows=[GenrePointsRowOut.model_validate(r) for r in agg["rows"]],
        total_points=agg["total_points"],
    )


@router.get("/approval-route", response_model=ApprovalRouteOut)
def get_approval_route(
    applicant_user_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalRouteOut:
    user_id = applicant_user_id or current_user.id
    applicant = db.get(User, user_id)
    if applicant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"applicant_user_id={user_id} のユーザーが見つかりません",
        )

    roles_per_step = APPROVAL_ROUTE_BY_ROLE.get(applicant.role or "", [])
    total_steps = len(roles_per_step)

    candidates_per_step: list[list[UserBriefOut]] = []
    default_approver_user_ids: list[str | None] = []

    for required_role in roles_per_step:
        if applicant.org_id is None:
            users_in_step: list[User] = []
        else:
            stmt = (
                select(User)
                .where(User.org_id == applicant.org_id, User.role == required_role)
                .order_by(User.name)
            )
            users_in_step = list(db.scalars(stmt))
        candidates_per_step.append([UserBriefOut.model_validate(u) for u in users_in_step])
        default_approver_user_ids.append(users_in_step[0].id if users_in_step else None)

    return ApprovalRouteOut(
        applicant_user_id=applicant.id,
        applicant_role=applicant.role,
        approval_total_steps=total_steps,
        default_approver_user_ids=default_approver_user_ids,
        candidates_per_step=candidates_per_step,
    )
