"""ポイント申請領域のビジネスロジック。

@owner: ポイント申請担当チーム
@used_by:
  - app/routers/points.py（ポイント申請担当者が実装予定）
  - app/services/points_service.py:aggregate_approved_points()
    → app/routers/cascade.py（因果ストーリー）から呼ばれる

このファイルにポイント申請に関する全ビジネスロジックを集約する。
申請のCRUD、承認/差戻し、集計など。
"""

from sqlalchemy import select
from sqlalchemy.engine import Engine

from app.models import ActivityGenre, PointApplication
from app.schemas.cascade import PointsInput

# ════════════════════════════════════════════════════════════
# 集計：因果ストーリー画面から呼ばれる
# ════════════════════════════════════════════════════════════

# activity_genre.name → PointsInput field のマッピング
GENRE_TO_FIELD: dict[str, str] = {
    "学習系": "learning",
    "挑戦系": "challenge",
    "保安系": "safety",
    "顧客系": "customer",
    "□□系": "other",
}


def aggregate_approved_points(engine: Engine, statuses: list[str]) -> PointsInput:
    """指定ステータスの申請を活動ジャンル別に集計する。

    因果ストーリー画面（cascade router）が呼び出す。

    Args:
        engine: SQLAlchemy Engine
        statuses: 集計対象ステータス（例 ["承認済"]）

    Returns:
        PointsInput（learning/challenge/safety/customer/other）
    """
    if not statuses:
        return PointsInput()

    stmt = (
        select(ActivityGenre.name, PointApplication.points)
        .join(ActivityGenre, ActivityGenre.id == PointApplication.activity_genre_id)
        .where(PointApplication.status.in_(statuses))
    )

    totals: dict[str, int] = {
        f: 0 for f in ("learning", "challenge", "safety", "customer", "other")
    }

    with engine.connect() as conn:
        for genre_name, points in conn.execute(stmt).all():
            field = GENRE_TO_FIELD.get(genre_name, "other")
            totals[field] += int(points or 0)

    return PointsInput(**totals)


# ════════════════════════════════════════════════════════════
# 以下、ポイント申請担当者が実装する関数（スタブ）
# ════════════════════════════════════════════════════════════

# def create_application(...) -> PointApplication:
#     """新規ポイント申請を作成。"""
#     pass

# def submit_application(...) -> PointApplication:
#     """下書きを提出する（status: 下書き → 提出済）。"""
#     pass

# def approve_application(...) -> PointApplication:
#     """申請を承認する（status: 提出済 → 承認済）。承認時通知も発火。"""
#     pass

# def reject_application(...) -> PointApplication:
#     """申請を却下する。"""
#     pass

# def list_applications_by_user(...) -> list[PointApplication]:
#     """指定ユーザーの申請一覧。"""
#     pass
