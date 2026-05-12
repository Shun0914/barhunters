"""add_one_on_ones_table — ダッシュボードの 1on1 件数集計用テーブル新設。

PR-B（ダッシュボード実データ統合）の一部。1on1 を pair_type（部↔課 / 課↔係 / etc）で
集計するための最小スキーマ。入力 UI は別 PR で対応。

Revision ID: a1f8d3c92b4e
Revises: dd855ad482be
Create Date: 2026-05-12

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1f8d3c92b4e"
down_revision: Union[str, None] = "dd855ad482be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "one_on_ones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "recorder_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("partner_role", sa.String(length=32), nullable=False),
        sa.Column("pair_type", sa.String(length=32), nullable=False),
        sa.Column("conducted_at", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_one_on_ones_recorder_id", "one_on_ones", ["recorder_id"])
    op.create_index("ix_one_on_ones_pair_type", "one_on_ones", ["pair_type"])
    op.create_index("ix_one_on_ones_conducted_at", "one_on_ones", ["conducted_at"])


def downgrade() -> None:
    op.drop_index("ix_one_on_ones_conducted_at", table_name="one_on_ones")
    op.drop_index("ix_one_on_ones_pair_type", table_name="one_on_ones")
    op.drop_index("ix_one_on_ones_recorder_id", table_name="one_on_ones")
    op.drop_table("one_on_ones")
