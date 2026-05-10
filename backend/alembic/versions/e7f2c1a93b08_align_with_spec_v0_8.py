"""align_with_spec_v0_8 — spec.md v0.8 のスキーマに合わせる。

主な変更:
- organizations テーブル新設（§4.1）
- application_number_counters テーブル新設（§4.6 採番テーブル方式）
- activity_genres に default_points / is_active 追加（§4.4）
- notifications: body_summary → body にリネーム、sender_user_id 追加（§4.5）
- point_applications: 単一 approver_user_id を 1/2/3 に分割、application_number / approval_total_steps /
  current_approval_step / submitted_at / decided_at / returned_at / returned_by を追加。
  title / activity_genre_id / points / description は draft 状態で空を許すため nullable に変更（§2.6 / §4.2）

Revision ID: e7f2c1a93b08
Revises: d4e8f0a2b6c1
Create Date: 2026-05-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e7f2c1a93b08"
down_revision: Union[str, None] = "d4e8f0a2b6c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) organizations
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2) application_number_counters（シングルトン行 id=1, next_number=1 で初期化）
    op.create_table(
        "application_number_counters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("next_number", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("INSERT INTO application_number_counters (id, next_number) VALUES (1, 1)")

    # 3) activity_genres: 列追加
    with op.batch_alter_table("activity_genres") as batch:
        batch.add_column(
            sa.Column("default_points", sa.Integer(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    # 4) notifications: body_summary → body にリネーム、sender_user_id 追加
    # MySQL は CHANGE/MODIFY に既存型の明示が必須（SQLite の batch とは要件が異なる）
    with op.batch_alter_table("notifications") as batch:
        batch.alter_column(
            "body_summary",
            existing_type=sa.Text(),
            existing_nullable=False,
            new_column_name="body",
        )
        batch.add_column(sa.Column("sender_user_id", sa.String(length=36), nullable=True))
        batch.create_foreign_key(
            "fk_notifications_sender_user_id_users",
            "users",
            ["sender_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # 5) point_applications: 単一 approver_user_id を 1/2/3 に分割し、ステータス管理列を追加
    with op.batch_alter_table("point_applications") as batch:
        batch.add_column(sa.Column("application_number", sa.String(length=6), nullable=True))
        batch.create_unique_constraint(
            "uq_point_applications_application_number", ["application_number"]
        )

        batch.alter_column("title", existing_type=sa.String(length=512), nullable=True)
        batch.alter_column("activity_genre_id", existing_type=sa.Integer(), nullable=True)
        batch.alter_column("points", existing_type=sa.Integer(), nullable=True)
        batch.alter_column("description", existing_type=sa.Text(), nullable=True)

        batch.drop_column("approver_user_id")
        batch.add_column(sa.Column("approver_1_user_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("approver_2_user_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("approver_3_user_id", sa.String(length=36), nullable=True))
        batch.create_foreign_key(
            "fk_point_applications_approver_1",
            "users",
            ["approver_1_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_foreign_key(
            "fk_point_applications_approver_2",
            "users",
            ["approver_2_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_foreign_key(
            "fk_point_applications_approver_3",
            "users",
            ["approver_3_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

        batch.add_column(sa.Column("approval_total_steps", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("current_approval_step", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("returned_by", sa.String(length=36), nullable=True))
        batch.create_foreign_key(
            "fk_point_applications_returned_by",
            "users",
            ["returned_by"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("point_applications") as batch:
        batch.drop_constraint("fk_point_applications_returned_by", type_="foreignkey")
        batch.drop_column("returned_by")
        batch.drop_column("returned_at")
        batch.drop_column("decided_at")
        batch.drop_column("submitted_at")
        batch.drop_column("current_approval_step")
        batch.drop_column("approval_total_steps")
        batch.drop_constraint("fk_point_applications_approver_3", type_="foreignkey")
        batch.drop_constraint("fk_point_applications_approver_2", type_="foreignkey")
        batch.drop_constraint("fk_point_applications_approver_1", type_="foreignkey")
        batch.drop_column("approver_3_user_id")
        batch.drop_column("approver_2_user_id")
        batch.drop_column("approver_1_user_id")
        batch.add_column(sa.Column("approver_user_id", sa.String(length=36), nullable=True))
        batch.alter_column("description", existing_type=sa.Text(), nullable=False)
        batch.alter_column("points", existing_type=sa.Integer(), nullable=False)
        batch.alter_column("activity_genre_id", existing_type=sa.Integer(), nullable=False)
        batch.alter_column("title", existing_type=sa.String(length=512), nullable=False)
        batch.drop_constraint("uq_point_applications_application_number", type_="unique")
        batch.drop_column("application_number")

    with op.batch_alter_table("notifications") as batch:
        batch.drop_constraint("fk_notifications_sender_user_id_users", type_="foreignkey")
        batch.drop_column("sender_user_id")
        batch.alter_column(
            "body",
            existing_type=sa.Text(),
            existing_nullable=False,
            new_column_name="body_summary",
        )

    with op.batch_alter_table("activity_genres") as batch:
        batch.drop_column("is_active")
        batch.drop_column("default_points")

    op.drop_table("application_number_counters")
    op.drop_table("organizations")
