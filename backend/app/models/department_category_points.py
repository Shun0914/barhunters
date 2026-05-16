"""DepartmentCategoryPoints — v7 バッジ集計テーブル。

毎日 0 時に scripts/batch_aggregate_points.py で更新する想定。
GET /api/cascade/aggregated-points が将来このテーブルから読む可能性に備えて定義。
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DepartmentCategoryPoints(Base):
    __tablename__ = "department_category_points"
    __table_args__ = (
        UniqueConstraint("department_id", "category", name="uq_dept_category_points"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    department_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    total_point: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
