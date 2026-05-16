"""方言差分を吸収する ORDER BY 用ヘルパー。

Azure MySQL 等は `ORDER BY col DESC NULLS LAST`（SQLAlchemy の `.nulls_last()` が
生成する句）を解釈できず 1064 になる。PostgreSQL と同等の並びを CASE で表現する。
"""

from __future__ import annotations

from sqlalchemy import ColumnElement, case


def submitted_at_desc_nulls_last(
    submitted_at: ColumnElement,
    *tiebreakers: object,
) -> tuple[object, ...]:
    """submitted_at 降順で、NULL の行を末尾へ（PostgreSQL の NULLS LAST 相当）。

    Args:
        submitted_at: ソート対象カラム
        tiebreakers: submitted_at が同順位のときの追加キー（例: `.desc()` 付きカラム）
    """
    return (
        case((submitted_at.is_(None), 1), else_=0),
        submitted_at.desc(),
        *tiebreakers,
    )
