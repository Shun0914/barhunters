"""v7: 2値ポイント体系 + 役職傾斜 + 集計バッジ用テーブル

変更内容（5/16 確定）:
- point_applications に level / category / final_point カラム追加
- points 列を Integer → Numeric(10, 2) に変更（daily 0.1P を欠落させないため）
- 既存 row の活動ジャンル名から level/category を逆引き、final_point を再計算
  （管理職=課長/部長/役員=3.0x / それ以外=1.0x）
- 「越境×〜」ジャンルの PointApplication row および activity_genre row を削除
- 集計バッジ用 department_category_points テーブルを新設

Revision ID: c83e1f4a2d09
Revises: b72a9c104d61
Create Date: 2026-05-16
"""

from decimal import Decimal
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c83e1f4a2d09"
down_revision: Union[str, None] = "b72a9c104d61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 役職傾斜 — services/point_calc.py と一致させる必要あり
MANAGER_ROLES = {"課長", "部長", "役員"}
MANAGER_MULTIPLIER = Decimal("3.0")
GENERAL_MULTIPLIER = Decimal("1.0")
BASE_POINT_BY_LEVEL = {"daily": Decimal("0.1"), "creative": Decimal("5")}

# 旧 9 ジャンル → 新 (level, category) の逆引き
LEGACY_TO_NEW = {
    "日常×社会貢献": ("daily", "social"),
    "日常×安心安全": ("daily", "safety"),
    "日常×未来共創": ("daily", "future"),
    "創造×社会貢献": ("creative", "social"),
    "創造×安心安全": ("creative", "safety"),
    "創造×未来共創": ("creative", "future"),
}
LEGACY_CROSS_NAMES = {"越境×社会貢献", "越境×安心安全", "越境×未来共創"}


def upgrade() -> None:
    bind = op.get_bind()

    # 1) 新カラムを nullable で追加
    with op.batch_alter_table("point_applications") as batch:
        batch.add_column(sa.Column("level", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("category", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("final_point", sa.Numeric(10, 2), nullable=True))

    # 2) 越境 row を削除（PointApplication）
    bind.execute(
        sa.text(
            "DELETE FROM point_applications "
            "WHERE activity_genre_id IN ("
            "  SELECT id FROM activity_genres WHERE name IN (:n1, :n2, :n3)"
            ")"
        ),
        {"n1": "越境×社会貢献", "n2": "越境×安心安全", "n3": "越境×未来共創"},
    )

    # 3) 既存 row の level / category / final_point を埋める
    rows = bind.execute(
        sa.text(
            "SELECT pa.id, ag.name, u.role "
            "FROM point_applications pa "
            "JOIN activity_genres ag ON ag.id = pa.activity_genre_id "
            "JOIN users u ON u.id = pa.applicant_user_id"
        )
    ).all()
    for row_id, genre_name, role in rows:
        new_pair = LEGACY_TO_NEW.get(genre_name)
        if new_pair is None:
            continue
        level, category = new_pair
        multiplier = MANAGER_MULTIPLIER if role in MANAGER_ROLES else GENERAL_MULTIPLIER
        final_point = BASE_POINT_BY_LEVEL[level] * multiplier
        bind.execute(
            sa.text(
                "UPDATE point_applications "
                "SET level = :level, category = :category, "
                "    final_point = :fp, points = :fp "
                "WHERE id = :id"
            ),
            {"level": level, "category": category, "fp": float(final_point), "id": row_id},
        )

    # 4) points 列を Numeric(10, 2) に変更
    #    SQLite は ALTER COLUMN 不可なので batch_alter_table で temp-table swap させる
    with op.batch_alter_table("point_applications") as batch:
        batch.alter_column(
            "points",
            existing_type=sa.Integer(),
            type_=sa.Numeric(10, 2),
            existing_nullable=True,
        )

    # 5) 越境ジャンル master row を削除
    bind.execute(
        sa.text(
            "DELETE FROM activity_genres WHERE name IN (:n1, :n2, :n3)"
        ),
        {"n1": "越境×社会貢献", "n2": "越境×安心安全", "n3": "越境×未来共創"},
    )

    # 6) department_category_points: バッジ集計テーブル（毎日0時更新前提）
    op.create_table(
        "department_category_points",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "department_id",
            sa.String(length=64),
            nullable=False,
            index=True,
        ),
        sa.Column("category", sa.String(length=16), nullable=False),
        sa.Column("total_point", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "department_id",
            "category",
            name="uq_dept_category_points",
        ),
    )


def downgrade() -> None:
    op.drop_table("department_category_points")

    # 6) 越境ジャンルを復元（マスタは戻すが、削除した PointApplication row は復元できない）
    bind = op.get_bind()
    for name, points, order in [
        ("越境×社会貢献", 3, 4),
        ("越境×安心安全", 3, 5),
        ("越境×未来共創", 3, 6),
    ]:
        bind.execute(
            sa.text(
                "INSERT OR IGNORE INTO activity_genres "
                "(name, default_points, sort_order, is_active) "
                "VALUES (:name, :pts, :ord, 1)"
            ),
            {"name": name, "pts": points, "ord": order},
        )

    # 5) points を Integer に戻す（小数部は切り捨て）
    with op.batch_alter_table("point_applications") as batch:
        batch.alter_column(
            "points",
            existing_type=sa.Numeric(10, 2),
            type_=sa.Integer(),
            existing_nullable=True,
        )

    # 1) 新カラムを削除
    with op.batch_alter_table("point_applications") as batch:
        batch.drop_column("final_point")
        batch.drop_column("category")
        batch.drop_column("level")
