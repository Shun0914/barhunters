"""通知（Notification）の作成・enrich ヘルパー（spec.md §3.3 / §3.8）。

- 申請送信／承認／差戻しの各イベントで、誰宛に何を送るかをここに集約する。
- 通知本文は MVP 仕様に従いコード内テンプレートで生成し、`body` カラムにそのまま保存。
"""

from __future__ import annotations

from typing import Literal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Notification, PointApplication, User
from app.schemas.notification import NotificationOut

NotificationType = Literal[
    "approval_request", "approved", "returned", "withdrawn"
]


def _ensure_user_name(db: Session, user_id: str | None) -> str:
    if user_id is None:
        return "—"
    user = db.get(User, user_id)
    return user.name if user else "—"


def _make_body(
    notification_type: NotificationType,
    sender_name: str,
    application_title: str,
) -> str:
    # spec.md §3.8 — テンプレート文字列
    if notification_type == "approval_request":
        return (
            f"{sender_name}さんよりポイント申請の承認依頼が届きました。"
            "ポイント承認画面より内容をご確認ください。"
        )
    if notification_type == "approved":
        return f"{application_title}が承認されました。"
    if notification_type == "withdrawn":
        return (
            f"{sender_name}さんが申請「{application_title}」を取り戻しました。"
            "承認は不要になりました。"
        )
    # returned
    return f"{application_title}が差戻されました。再編集して再申請してください。"


def _make_title(notification_type: NotificationType, application_title: str) -> str:
    # spec.md §3.3 — 通知タイトル例
    if notification_type == "approval_request":
        return f"承認依頼: {application_title}"
    if notification_type == "approved":
        return "申請承認のお知らせ"
    if notification_type == "withdrawn":
        return f"申請が取り戻されました: {application_title}"
    return "申請が差戻されました"


def create_notification(
    db: Session,
    *,
    recipient_user_id: str,
    sender_user_id: str | None,
    notification_type: NotificationType,
    application: PointApplication,
) -> Notification:
    """通知レコードを作成して `db.add()` する（commit は呼び出し側）。"""
    sender_name = _ensure_user_name(db, sender_user_id)
    title = _make_title(notification_type, application.title or "（タイトル未設定）")
    body = _make_body(notification_type, sender_name, application.title or "（タイトル未設定）")
    notification = Notification(
        id=str(uuid4()),
        recipient_user_id=recipient_user_id,
        sender_user_id=sender_user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        related_application_id=application.id,
    )
    db.add(notification)
    return notification


# --- enrich (sender_name 埋め込み) -----------------------------------------


def _load_sender_names(
    db: Session, sender_ids: list[str | None]
) -> dict[str, str]:
    ids = {sid for sid in sender_ids if sid}
    if not ids:
        return {}
    users = db.scalars(select(User).where(User.id.in_(ids))).all()
    return {u.id: u.name for u in users}


def _to_out(n: Notification, sender_map: dict[str, str]) -> NotificationOut:
    """Notification モデルの `notification_type` → スキーマの `type` を明示マップ。"""
    return NotificationOut(
        id=n.id,
        recipient_user_id=n.recipient_user_id,
        sender_user_id=n.sender_user_id,
        sender_name=sender_map.get(n.sender_user_id) if n.sender_user_id else None,
        type=n.notification_type,  # type: ignore[arg-type]
        title=n.title,
        body=n.body,
        read_at=n.read_at,
        related_application_id=n.related_application_id,
        created_at=n.created_at,
    )


def enrich_notification(notification: Notification, db: Session) -> NotificationOut:
    sender_map = _load_sender_names(db, [notification.sender_user_id])
    return _to_out(notification, sender_map)


def enrich_notifications(
    notifications: list[Notification], db: Session
) -> list[NotificationOut]:
    sender_map = _load_sender_names(db, [n.sender_user_id for n in notifications])
    return [_to_out(n, sender_map) for n in notifications]
