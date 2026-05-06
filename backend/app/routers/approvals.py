"""ポイント承認エンドポイント（spec.md §3.7 / WF-03）。

承認者視点。承認待ち / 完了 / すべての3タブ、申請者フィルタ、検索、
承認・差戻しに対応する。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.auth import get_current_user
from app.db import get_db
from app.models import ActivityGenre, PointApplication, User
from app.schemas.master import UserBriefOut
from app.schemas.point_application import PointApplicationOut
from app.services.applications import (
    enrich_application,
    enrich_applications,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

ApprovalTab = Literal["waiting", "completed", "all"]


def _is_approver_of(application: PointApplication, user_id: str) -> bool:
    return user_id in {
        application.approver_1_user_id,
        application.approver_2_user_id,
        application.approver_3_user_id,
    }


def _my_step(application: PointApplication, user_id: str) -> int | None:
    """user_id がこの申請で第何段の承認者か（1/2/3）。承認者でなければ None。"""
    if application.approver_1_user_id == user_id:
        return 1
    if application.approver_2_user_id == user_id:
        return 2
    if application.approver_3_user_id == user_id:
        return 3
    return None


def _has_user_completed_step(application: PointApplication, user_id: str) -> bool:
    """user_id にとって「自分の段は完了済み」と言えるかどうか。

    spec.md §3.7 の「完了」タブの判定に使用。
    - approved: 全段承認 → 自分の段も通過済み
    - submitted: current_approval_step が自分の段より進んでいれば通過済み
    - returned: 自分が差し戻した、または自分の段 ≤ 差し戻した人の段
    """
    my = _my_step(application, user_id)
    if my is None:
        return False
    if application.status == "approved":
        return True
    if application.status == "submitted":
        return (application.current_approval_step or 0) > my
    if application.status == "returned":
        if application.returned_by == user_id:
            return True
        if application.returned_by is None:
            return False
        returner_step = _my_step(application, application.returned_by)
        if returner_step is None:
            return False
        return my <= returner_step
    return False


def _step_owner(application: PointApplication) -> str | None:
    """current_approval_step に対応する承認者の user_id を返す。"""
    step = application.current_approval_step
    if step == 1:
        return application.approver_1_user_id
    if step == 2:
        return application.approver_2_user_id
    if step == 3:
        return application.approver_3_user_id
    return None


def _involves_me_clause(me_id: str):
    """自分が approver_1/2/3 のいずれか、という where 句。"""
    return or_(
        PointApplication.approver_1_user_id == me_id,
        PointApplication.approver_2_user_id == me_id,
        PointApplication.approver_3_user_id == me_id,
    )


def _waiting_for_me_clause(me_id: str):
    """自分の段で待ち状態、という where 句。submitted かつ current_step が自分の段。"""
    return and_(
        PointApplication.status == "submitted",
        or_(
            and_(
                PointApplication.current_approval_step == 1,
                PointApplication.approver_1_user_id == me_id,
            ),
            and_(
                PointApplication.current_approval_step == 2,
                PointApplication.approver_2_user_id == me_id,
            ),
            and_(
                PointApplication.current_approval_step == 3,
                PointApplication.approver_3_user_id == me_id,
            ),
        ),
    )


@router.get("", response_model=list[PointApplicationOut])
def list_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tab: ApprovalTab = Query(default="waiting"),
    applicant_user_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[PointApplicationOut]:
    """spec.md §3.7 — 承認者視点の一覧。タブ・申請者フィルタ・検索を AND 結合。"""
    me = current_user.id

    # 「完了」は自分の段が通過済みかどうかで判定（spec.md §3.7、本プロジェクトでの解釈変更）。
    # 厳密判定には ApprovalHistory が必要だが MVP は returned_by の段で代替する。
    # SQL で一発判定が複雑なので、関与する全件を取って Python でフィルタ → ページング。
    if tab == "waiting":
        base = _waiting_for_me_clause(me)
        post_filter = None
    elif tab == "completed":
        base = _involves_me_clause(me)
        post_filter = lambda a: _has_user_completed_step(a, me)  # noqa: E731
    else:  # all — 関与する全申請（draft 含む）
        base = _involves_me_clause(me)
        post_filter = None

    stmt = select(PointApplication).where(base)

    if applicant_user_id:
        stmt = stmt.where(PointApplication.applicant_user_id == applicant_user_id)

    if q:
        # spec.md §3.6.4 / §5.2 — タイトル/活動内容/申請者氏名/ジャンル名を横断
        pattern = f"%{q.lower()}%"
        applicant_alias = aliased(User)
        stmt = (
            stmt.outerjoin(
                applicant_alias,
                applicant_alias.id == PointApplication.applicant_user_id,
            )
            .outerjoin(
                ActivityGenre,
                ActivityGenre.id == PointApplication.activity_genre_id,
            )
            .where(
                or_(
                    func.lower(PointApplication.title).like(pattern),
                    func.lower(PointApplication.description).like(pattern),
                    func.lower(applicant_alias.name).like(pattern),
                    func.lower(ActivityGenre.name).like(pattern),
                )
            )
        )

    # spec.md §3.7 — 新しい順
    stmt = stmt.order_by(
        PointApplication.submitted_at.desc().nulls_last(),
        PointApplication.created_at.desc(),
    )

    if post_filter is None:
        # SQL 側で limit/offset
        stmt = stmt.limit(limit).offset(offset)
        apps = list(db.scalars(stmt))
    else:
        # Python 側でフィルタ → ページング（件数が爆発しない MVP 規模を想定）
        all_apps = list(db.scalars(stmt))
        filtered = [a for a in all_apps if post_filter(a)]
        apps = filtered[offset : offset + limit]
    return enrich_applications(apps, db)


@router.get("/applicants", response_model=list[UserBriefOut])
def list_filterable_applicants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserBriefOut]:
    """spec.md §3.7.4 — 自分が承認に関わる全申請の、申請者一覧（氏名 50 音順）。"""
    me = current_user.id
    applicant_ids_stmt = (
        select(PointApplication.applicant_user_id)
        .where(_involves_me_clause(me))
        .distinct()
    )
    applicant_ids = [row for row in db.scalars(applicant_ids_stmt) if row is not None]
    if not applicant_ids:
        return []
    users = db.scalars(
        select(User).where(User.id.in_(applicant_ids)).order_by(User.name)
    ).all()
    return [UserBriefOut.model_validate(u) for u in users]


@router.get("/{application_id}", response_model=PointApplicationOut)
def get_approval(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    # 関与する申請のみ閲覧可
    if not _is_approver_of(application, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    return enrich_application(application, db)


@router.post("/{application_id}/approve", response_model=PointApplicationOut)
def approve_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    """spec.md §3.4 — 現在の段を承認。最終段なら status=approved。"""
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="承認可能な状態ではありません"
        )
    if _step_owner(application) != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="あなたの承認段ではありません")

    total = application.approval_total_steps or 0
    current = application.current_approval_step or 0
    if current >= total:
        # 最終段 → 承認確定。spec.md §3.3 #4: 申請者へ approved 通知。
        application.status = "approved"
        application.current_approval_step = None
        application.decided_at = datetime.now(timezone.utc)
        create_notification(
            db,
            recipient_user_id=application.applicant_user_id,
            sender_user_id=current_user.id,
            notification_type="approved",
            application=application,
        )
    else:
        # 次段の承認者へ approval_request 通知（spec.md §3.3 #2 / #3）
        application.current_approval_step = current + 1
        next_approver_id = getattr(
            application, f"approver_{application.current_approval_step}_user_id"
        )
        if next_approver_id:
            create_notification(
                db,
                recipient_user_id=next_approver_id,
                sender_user_id=current_user.id,
                notification_type="approval_request",
                application=application,
            )

    db.commit()
    db.refresh(application)
    return enrich_application(application, db)


@router.post("/{application_id}/return", response_model=PointApplicationOut)
def return_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    """spec.md §3.4 — 差戻し。status=returned、申請者まで戻す。コメントは保持しない。"""
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="差戻し可能な状態ではありません"
        )
    if _step_owner(application) != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="あなたの承認段ではありません")

    now = datetime.now(timezone.utc)
    application.status = "returned"
    application.current_approval_step = None
    application.returned_at = now
    application.returned_by = current_user.id

    # spec.md §3.3 #5 — 申請者へ returned 通知
    create_notification(
        db,
        recipient_user_id=application.applicant_user_id,
        sender_user_id=current_user.id,
        notification_type="returned",
        application=application,
    )

    db.commit()
    db.refresh(application)
    return enrich_application(application, db)