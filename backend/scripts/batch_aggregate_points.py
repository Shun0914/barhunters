"""部署×カテゴリ別の承認済ポイントを集計し department_category_points に upsert する。

設計思想（5/14 議論）:
- リアルタイム計算でなく、毎日 0:00 にスナップショットを更新する
  「バッジ処理」によって "先にやった人が有利" 感を排除する
- cron / Azure scheduler の設定は別タスク（Azure デプロイ時）

手動実行:
    cd backend
    python -m scripts.batch_aggregate_points
"""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import PointApplication, User
from app.services.point_calc import CATEGORIES
from app.settings import get_settings


def aggregate_daily() -> dict[tuple[str, str], Decimal]:
    """承認済の PointApplication を (department, category) で集計し dict を返す。

    department は User.org_id を採用（spec.md §4.1 暫定モデル）。
    final_point が NULL の row は points 列で代替（移行直後の互換）。
    """
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    totals: dict[tuple[str, str], Decimal] = {}

    with Session(engine) as session:
        stmt = (
            select(
                User.org_id,
                PointApplication.category,
                func.sum(func.coalesce(PointApplication.final_point, PointApplication.points, 0)),
            )
            .join(User, User.id == PointApplication.applicant_user_id)
            .where(
                PointApplication.status == "approved",
                PointApplication.category.is_not(None),
                User.org_id.is_not(None),
            )
            .group_by(User.org_id, PointApplication.category)
        )
        for org_id, category, total in session.execute(stmt).all():
            if org_id is None or category not in CATEGORIES:
                continue
            totals[(str(org_id), str(category))] = Decimal(str(total or 0))

    return totals


def upsert(totals: dict[tuple[str, str], Decimal]) -> int:
    """totals を department_category_points に upsert。
    SQLite / PostgreSQL 両対応のため、SELECT → UPDATE / INSERT で実装。
    戻り値は更新 + 挿入の合計行数。
    """
    from sqlalchemy import text

    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    written = 0
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        for (dept_id, category), total in totals.items():
            existing = session.execute(
                text(
                    "SELECT id FROM department_category_points "
                    "WHERE department_id = :d AND category = :c"
                ),
                {"d": dept_id, "c": category},
            ).first()
            if existing is None:
                session.execute(
                    text(
                        "INSERT INTO department_category_points "
                        "(id, department_id, category, total_point, updated_at) "
                        "VALUES (:id, :d, :c, :tp, :ts)"
                    ),
                    {
                        "id": str(uuid4()),
                        "d": dept_id,
                        "c": category,
                        "tp": float(total),
                        "ts": now,
                    },
                )
            else:
                session.execute(
                    text(
                        "UPDATE department_category_points "
                        "SET total_point = :tp, updated_at = :ts "
                        "WHERE department_id = :d AND category = :c"
                    ),
                    {"tp": float(total), "ts": now, "d": dept_id, "c": category},
                )
            written += 1
        session.commit()
    return written


def main() -> None:
    totals = aggregate_daily()
    written = upsert(totals)
    print(
        f"✓ Aggregated {len(totals)} (department, category) pairs → "
        f"{written} rows upserted into department_category_points"
    )


if __name__ == "__main__":
    main()
