"""ユーザー role 表記を dashboard / 承認ルート統一値へ移行

PR-B（#33）で APPROVAL_ROUTE_BY_ROLE と UI 表示を
「一般社員」「部長」に揃えたため、レガシーの
「一般職員」「部門長」を更新する。

downgrade は同じ値に戻すだけの単純化（運用上の注意あり）。

Revision ID: b72a9c104d61
Revises: a1f8d3c92b4e
Create Date: 2026-05-16

"""

from typing import Sequence, Union

from alembic import op


revision: str = "b72a9c104d61"
down_revision: Union[str, None] = "a1f8d3c92b4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = '一般社員' WHERE role = '一般職員'")
    op.execute("UPDATE users SET role = '部長' WHERE role = '部門長'")


def downgrade() -> None:
    """注意: 当初から『一般社員』のユーザーが『一般職員』になる誤復元の余地あり。"""
    op.execute("UPDATE users SET role = '一般職員' WHERE role = '一般社員'")
    op.execute("UPDATE users SET role = '部門長' WHERE role = '部長'")
