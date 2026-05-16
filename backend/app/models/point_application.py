"""PointApplication — spec.md §4.2。"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func  # noqa: F401
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PointApplication(Base):
    __tablename__ = "point_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    application_number: Mapped[str | None] = mapped_column(String(6), nullable=True, unique=True)
    applicant_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 旧 9 ジャンル → 新 6 ジャンル（{level}_{category}）への移行後も、
    # dashboard / mypage のジャンル別内訳で pivot キーとして使うため残す。
    activity_genre_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("activity_genres.id", ondelete="RESTRICT"), nullable=True
    )
    # 2値ポイント体系（v7）— ベースポイントの算出元。
    #   level    : "daily" (0.1P) / "creative" (5P)
    #   category : "social" / "safety" / "future"
    # 既存ジャンル名「{日常|越境|創造}×{社会貢献|安心安全|未来共創}」から派生。
    # 越境 row はマイグレーション時に削除する方針。
    level: Mapped[str | None] = mapped_column(String(16), nullable=True)
    category: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # 役職傾斜（管理職=3.0x / 一般=1.0x）適用後の最終ポイント。
    final_point: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    # 旧 points 列は dashboard / mypage が pivot サムに使うので、新規申請でも
    # final_point と同じ値を Numeric 形式で保持する（daily 0.1P を欠落させないため）。
    points: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    approver_1_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approver_2_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approver_3_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approval_total_steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_approval_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    returned_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
