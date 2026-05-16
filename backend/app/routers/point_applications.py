"""ポイント申請エンドポイント。spec §5.1 — 下書き作成・更新・申請送信・一覧。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import (
    ActivityGenre,
    ApplicationNumberCounter,
    PointApplication,
    User,
)
from app.query_order import submitted_at_desc_nulls_last
from app.routers.users import APPROVAL_ROUTE_BY_ROLE
from app.schemas.point_application import (
    PointApplicationDraftIn,
    PointApplicationOut,
)
from app.services.applications import (
    enrich_application,
    enrich_applications,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/point-applications", tags=["point-applications"])

TITLE_MAX = 50
DESCRIPTION_MAX = 500

# spec.md §3.6 のタブ→ステータス対応。
# `returned`（差戻し）は申請者の対応待ちなので「未完了」に含める（プロジェクト独自仕様）。
# `all` は draft も含む全件。
TAB_TO_STATUSES: dict[str, list[str] | None] = {
    "incomplete": ["submitted", "returned"],
    "completed": ["approved"],
    "all": None,
}


def _validate_draft_payload(payload: PointApplicationDraftIn) -> dict[str, str]:
    """下書き保存時の最低限のバリデーション（spec §2.6 — タイトルのみ必須、最大長は遵守）。"""
    errors: dict[str, str] = {}
    if payload.title is None or payload.title == "":
        errors["title"] = "タイトルは必須です"
    elif len(payload.title) > TITLE_MAX:
        errors["title"] = f"タイトルは {TITLE_MAX} 文字以内で入力してください"
    if payload.description is not None and len(payload.description) > DESCRIPTION_MAX:
        errors["description"] = f"活動内容は {DESCRIPTION_MAX} 文字以内で入力してください"
    return errors


def _validate_submit(application: PointApplication) -> dict[str, str]:
    """申請送信時のサーバ側バリデーション（spec §2.7 / IN-09）。"""
    errors: dict[str, str] = {}
    if not application.title:
        errors["title"] = "タイトルは必須です"
    elif len(application.title) > TITLE_MAX:
        errors["title"] = f"タイトルは {TITLE_MAX} 文字以内で入力してください"
    if application.activity_genre_id is None:
        errors["activity_genre_id"] = "活動ジャンルは必須です"
    if not application.description:
        errors["description"] = "活動内容は必須です"
    elif len(application.description) > DESCRIPTION_MAX:
        errors["description"] = f"活動内容は {DESCRIPTION_MAX} 文字以内で入力してください"
    total = application.approval_total_steps or 0
    if total >= 1 and not application.approver_1_user_id:
        errors["approver_1_user_id"] = "第1承認者は必須です"
    if total >= 2 and not application.approver_2_user_id:
        errors["approver_2_user_id"] = "第2承認者は必須です"
    if total >= 3 and not application.approver_3_user_id:
        errors["approver_3_user_id"] = "第3承認者は必須です"
    return errors


def _allocate_application_number(db: Session) -> str:
    """spec §4.6 — 採番テーブルから連番を取得し、6 桁ゼロ埋め。"""
    counter = db.get(ApplicationNumberCounter, 1)
    if counter is None:
        counter = ApplicationNumberCounter(id=1, next_number=1)
        db.add(counter)
        db.flush()
    n = counter.next_number
    counter.next_number = n + 1
    db.flush()
    return f"{n:06d}"


@router.post("", response_model=PointApplicationOut, status_code=status.HTTP_201_CREATED)
def create_draft(
    payload: PointApplicationDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    points = _resolve_points(db, payload.activity_genre_id, payload.points)
    application = PointApplication(
        id=str(uuid4()),
        applicant_user_id=current_user.id,
        title=payload.title,
        activity_genre_id=payload.activity_genre_id,
        points=points,
        description=payload.description,
        approver_1_user_id=payload.approver_1_user_id,
        approver_2_user_id=payload.approver_2_user_id,
        approver_3_user_id=payload.approver_3_user_id,
        status="draft",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return enrich_application(application, db)


@router.get("", response_model=list[PointApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: str | None = Query(default=None, alias="status"),
    tab: Literal["incomplete", "completed", "all"] | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    order: Literal["updated_at_desc", "submitted_at_desc"] = "submitted_at_desc",
) -> list[PointApplicationOut]:
    """spec.md §3.6 — 申請者本人の申請一覧。タブ・検索・既存の status filter に対応。"""
    stmt = select(PointApplication).where(PointApplication.applicant_user_id == current_user.id)
    if tab is not None:
        statuses = TAB_TO_STATUSES[tab]
        if statuses is not None:
            stmt = stmt.where(PointApplication.status.in_(statuses))
    if status_filter is not None:
        stmt = stmt.where(PointApplication.status == status_filter)
    if q:
        # spec.md §3.6.4 / §5.2 — title / description / 申請者氏名 / ジャンル名を横断
        pattern = f"%{q.lower()}%"
        stmt = (
            stmt.outerjoin(User, User.id == PointApplication.applicant_user_id)
            .outerjoin(
                ActivityGenre,
                ActivityGenre.id == PointApplication.activity_genre_id,
            )
            .where(
                or_(
                    func.lower(PointApplication.title).like(pattern),
                    func.lower(PointApplication.description).like(pattern),
                    func.lower(User.name).like(pattern),
                    func.lower(ActivityGenre.name).like(pattern),
                )
            )
        )
    if order == "updated_at_desc":
        stmt = stmt.order_by(PointApplication.updated_at.desc())
    else:
        stmt = stmt.order_by(
            *submitted_at_desc_nulls_last(
                PointApplication.submitted_at,
                PointApplication.updated_at.desc(),
            )
        )
    stmt = stmt.limit(limit).offset(offset)
    apps = list(db.scalars(stmt))
    return enrich_applications(apps, db)


@router.get("/{application_id}", response_model=PointApplicationOut)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.applicant_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    return enrich_application(application, db)


@router.patch("/{application_id}", response_model=PointApplicationOut)
def update_draft(
    application_id: str,
    payload: PointApplicationDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.applicant_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    if application.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="下書き状態の申請のみ更新できます",
        )

    application.title = payload.title
    application.activity_genre_id = payload.activity_genre_id
    application.description = payload.description
    application.approver_1_user_id = payload.approver_1_user_id
    application.approver_2_user_id = payload.approver_2_user_id
    application.approver_3_user_id = payload.approver_3_user_id
    application.points = _resolve_points(db, payload.activity_genre_id, payload.points)

    db.commit()
    db.refresh(application)
    return enrich_application(application, db)


@router.post("/{application_id}/submit", response_model=PointApplicationOut)
def submit_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.applicant_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    if application.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="下書き状態の申請のみ送信できます",
        )

    # 申請者の役職から段数を確定（部長は段数 0 = 申請不可、Q-01 確定）
    total_steps = len(APPROVAL_ROUTE_BY_ROLE.get(current_user.role or "", []))
    if total_steps == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": {"_global": "現在、部長の方の申請は受け付けていません"}},
        )
    application.approval_total_steps = total_steps

    errors = _validate_submit(application)
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"detail": errors})

    # 未採番のときのみ採番（取消し→再申請時は同一番号を維持）
    if application.application_number is None:
        application.application_number = _allocate_application_number(db)

    now = datetime.now(timezone.utc)
    application.status = "submitted"
    application.current_approval_step = 1
    application.submitted_at = now

    # spec.md §3.3 #1 — 第1承認者へ approval_request 通知
    if application.approver_1_user_id:
        create_notification(
            db,
            recipient_user_id=application.approver_1_user_id,
            sender_user_id=current_user.id,
            notification_type="approval_request",
            application=application,
        )

    db.commit()
    db.refresh(application)
    return enrich_application(application, db)


def _step_of_user(application: PointApplication, user_id: str | None) -> int | None:
    """user_id がこの申請で第何段の承認者か（1/2/3）。承認者でなければ None。"""
    if user_id is None:
        return None
    if application.approver_1_user_id == user_id:
        return 1
    if application.approver_2_user_id == user_id:
        return 2
    if application.approver_3_user_id == user_id:
        return 3
    return None


@router.post("/{application_id}/resubmit", response_model=PointApplicationOut)
def resubmit_application(
    application_id: str,
    payload: PointApplicationDraftIn | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    """差戻し申請の再申請（spec の合意 — 差戻し段から再開）。

    - 承認ルートは元のまま（spec.md §2.5 — 再計算しない、payload の承認者は無視）
    - 差戻し段（returned_by の段）から再開。特定できなければ第1からやり直し
    - payload があればタイトル/ジャンル/活動内容を更新してから再申請
    - 差戻し段の承認者に approval_request 通知を送る
    """
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.applicant_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    if application.status != "returned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="差戻し中の申請のみ再申請できます",
        )

    # 編集内容があれば反映（承認者は変更しない — spec §2.5）
    if payload is not None:
        application.title = payload.title
        application.activity_genre_id = payload.activity_genre_id
        application.description = payload.description
        application.points = _resolve_points(db, payload.activity_genre_id, payload.points)

    # 必須項目バリデーション（再申請時も submit と同じ条件）
    errors = _validate_submit(application)
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"detail": errors})

    resume_step = _step_of_user(application, application.returned_by) or 1
    now = datetime.now(timezone.utc)
    application.status = "submitted"
    application.current_approval_step = resume_step
    application.submitted_at = now
    application.returned_at = None
    application.returned_by = None

    next_approver_id = getattr(application, f"approver_{resume_step}_user_id")
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


@router.post("/{application_id}/withdraw", response_model=PointApplicationOut)
def withdraw_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PointApplicationOut:
    """spec.md §3.6.3 — 第1承認前のみ取消し可能。draft に戻し application_number は引き継ぐ。"""
    application = db.get(PointApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申請が見つかりません")
    if application.applicant_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    if application.status != "submitted" or application.current_approval_step != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="取り消しできません",
        )

    # 取戻し時、第1承認者にも通知して「もう承認不要」を伝える
    # （spec の元仕様では発火しないが、運用上「同じ申請が2件届く」混乱を避けるため発火する）
    if application.approver_1_user_id:
        create_notification(
            db,
            recipient_user_id=application.approver_1_user_id,
            sender_user_id=current_user.id,
            notification_type="withdrawn",
            application=application,
        )

    application.status = "draft"
    application.current_approval_step = None
    application.submitted_at = None

    db.commit()
    db.refresh(application)
    return enrich_application(application, db)


def _resolve_points(
    db: Session,
    activity_genre_id: int | None,
    override: int | None = None,
) -> int | None:
    """payload に points が明示されていればそれを採用し、無ければ genre の default_points を返す。"""
    if override is not None:
        return override
    if activity_genre_id is None:
        return None
    genre = db.get(ActivityGenre, activity_genre_id)
    if genre is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": {"activity_genre_id": "存在しない活動ジャンルです"}},
        )
    return genre.default_points
