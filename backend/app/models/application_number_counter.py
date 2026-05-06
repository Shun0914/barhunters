"""ApplicationNumberCounter — spec.md §4.6 採番テーブル方式（SQLite 前提の MVP）。

シングルトン行（id=1）を ROW LOCK して `next_number` をインクリメントする運用。
"""

from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ApplicationNumberCounter(Base):
    __tablename__ = "application_number_counters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    next_number: Mapped[int] = mapped_column(Integer, nullable=False)
