"""通知エンドポイント（spec.md §3.8 / §1.3）。

- S-06 通知一覧画面（タブ: すべて / 未読、検索）
- 共通シェルの通知ベル（最新 N 件 / 未読カウント）
- 詳細パネル表示時の既読化
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from app.auth import get_current_user
from app.db import get_db
from app.models import Notification, User
from app.schemas.notification import NotificationOut, UnreadCountOut
from app.services.notifications import (
    enrich_notification,
    enrich_notifications,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

NotificationTab = Literal["all", "unread"]


def _base_query(me_id: str):
    return select(Notification).where(Notification.recipient_user_id == me_id)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tab: NotificationTab = Query(default="all"),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[NotificationOut]:
    """spec.md §3.8 — タブ・検索の AND 結合、created_at 降順固定。"""
    stmt = _base_query(current_user.id)
    if tab == "unread":
        stmt = stmt.where(Notification.read_at.is_(None))
    if q:
        # spec.md §3.8 検索バー — タイトル / 本文 / 送信者氏名（部分一致・小文字化）
        pattern = f"%{q.lower()}%"
        sender_alias = aliased(User)
        stmt = stmt.outerjoin(
            sender_alias, sender_alias.id == Notification.sender_user_id
        ).where(
            or_(
                func.lower(Notification.title).like(pattern),
                func.lower(Notification.body).like(pattern),
                func.lower(sender_alias.name).like(pattern),
            )
        )
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
    return enrich_notifications(list(db.scalars(stmt)), db)


@router.get("/recent", response_model=list[NotificationOut])
def list_recent_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=4, ge=1, le=20),
) -> list[NotificationOut]:
    """spec.md §1.3 — ベルポップオーバー用の最新 N 件（既読・未読を区別しない）。"""
    stmt = (
        _base_query(current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return enrich_notifications(list(db.scalars(stmt)), db)


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnreadCountOut:
    """spec.md §1.3 — ベルバッジ用、未読総数。"""
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    return UnreadCountOut(count=int(count or 0))


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationOut:
    """spec.md §3.8 — 詳細パネル表示時に既読化。冪等（既に既読でも 200 を返す）。"""
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知が見つかりません")
    if notification.recipient_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限がありません")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return enrich_notification(notification, db)
