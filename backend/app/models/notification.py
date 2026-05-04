"""Notification — アプリ内通知。04 §2.5。"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    recipient_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # DB 列名は要件の `type`（Python の組み込みと衝突するため属性名は別）
    notification_type: Mapped[str] = mapped_column("type", String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body_summary: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    related_application_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("point_applications.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
