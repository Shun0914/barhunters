"""Indicator — 因果ストーリー用カード。04 §2.3 + §7.3 拡張。"""

from datetime import date

from sqlalchemy import Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Indicator(Base):
    __tablename__ = "indicators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tab_key: Mapped[str] = mapped_column(String(64), nullable=False)
    column_key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    value_display: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    link_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # ── §7.3 推奨拡張 ────────────────────────────────────────────────
    # calc_id: 計算エンジンの結果と紐付けるキー（"eng" / "jcsi" / "roe" など）
    calc_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # source_type: 値の出所（"calculated"=動的計算 / "manual" / "api" / "file"）
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="calculated")
    # as_of_date: 基準日（財務指標などの更新時点）
    as_of_date: Mapped[date | None] = mapped_column(Date, nullable=True)
