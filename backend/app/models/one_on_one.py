"""OneOnOne — ダッシュボードの 1on1 件数集計用。

シンプル設計：
- recorder_id（記録者）と partner_role（相手役職）を持つ
- pair_type は (recorder.role × partner_role) を文字列化して保持
  （frontend 凡例キー: seniorToLead / leadToChief / leadToGeneral / chiefToGeneral）
- conducted_at は日次（時刻は不要）

入力 UI は別 PR で対応。本 PR では集計とシードのみ。
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OneOnOne(Base):
    __tablename__ = "one_on_ones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recorder_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    partner_role: Mapped[str] = mapped_column(String(32), nullable=False)
    # 凡例キーと一致する文字列。frontend の DashboardData.oneOnOneBreakdown キーと対応。
    pair_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    conducted_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
