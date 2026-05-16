"""ポイント申請領域のビジネスロジック（v7）。

@owner: ポイント申請担当チーム
@used_by:
  - app/routers/point_applications.py
  - app/services/points_service.py:aggregate_approved_points()
    → app/routers/cascade.py（因果ストーリー）から呼ばれる

v5 → v7: 9 セル集計 → 3 カテゴリ集計（PointApplication.category を pivot キーに使う）。
"""

from sqlalchemy import select
from sqlalchemy.engine import Engine

from app.models import PointApplication, User
from app.schemas.cascade import PointsInput
from app.services.point_calc import CATEGORIES


def aggregate_approved_points(
    engine: Engine,
    statuses: list[str],
    org_id: str | None = None,
) -> PointsInput:
    """承認済 (or 指定ステータス) の申請を category 別に合計し、PointsInput で返す。

    final_point が未設定の旧 row は points 列で代替（マイグレーション以前のデータ向け）。
    """
    if not statuses:
        return PointsInput()

    stmt = select(
        PointApplication.category,
        PointApplication.final_point,
        PointApplication.points,
    ).where(PointApplication.status.in_(statuses))
    if org_id is not None:
        stmt = stmt.join(User, User.id == PointApplication.applicant_user_id).where(
            User.org_id == org_id
        )

    totals: dict[str, float] = {c: 0.0 for c in CATEGORIES}

    with engine.connect() as conn:
        for category, final_point, points in conn.execute(stmt).all():
            if category not in totals:
                continue
            if final_point is not None:
                totals[category] += float(final_point)
            elif points is not None:
                totals[category] += float(points)

    return PointsInput(**totals)
