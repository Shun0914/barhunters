"""Notification のリクエスト／レスポンススキーマ（spec.md §3.8 / §4.5）。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


NotificationType = Literal["approval_request", "approved", "returned", "withdrawn"]


class NotificationOut(BaseModel):
    """frontend `Notification` と対応。送信者名はサーバ側で詰めて返す。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    recipient_user_id: str
    sender_user_id: str | None
    sender_name: str | None = None
    type: NotificationType
    title: str
    body: str
    read_at: datetime | None
    related_application_id: str | None
    created_at: datetime


class UnreadCountOut(BaseModel):
    count: int
