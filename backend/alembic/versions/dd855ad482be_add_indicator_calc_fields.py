"""add_indicator_calc_fields — 04 §7.3 推奨に基づく indicators 拡張。

docs/requirements/04_データ要件.md §7.3 に基づき、indicators テーブルに以下を追加：
  - calc_id     : 計算結果との紐付けキー（"eng" / "jcsi" / "roe" など）
  - source_type : 値の出所（calculated / manual / api / file）
  - as_of_date  : 基準日（財務指標の更新時点）

これにより因果ストーリー画面の動的計算結果と、表示用 Indicator レコードを紐付けられる。

Revision ID: dd855ad482be
Revises: e7f2c1a93b08
Create Date: 2026-05-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "dd855ad482be"
down_revision: Union[str, None] = "e7f2c1a93b08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "indicators",
        sa.Column("calc_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "indicators",
        sa.Column(
            "source_type",
            sa.String(length=32),
            nullable=False,
            server_default="calculated",
        ),
    )
    op.add_column(
        "indicators",
        sa.Column("as_of_date", sa.Date(), nullable=True),
    )
    op.create_index(
        "ix_indicators_calc_id",
        "indicators",
        ["calc_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_indicators_calc_id", table_name="indicators")
    op.drop_column("indicators", "as_of_date")
    op.drop_column("indicators", "source_type")
    op.drop_column("indicators", "calc_id")
