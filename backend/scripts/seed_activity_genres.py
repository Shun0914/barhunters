"""活動ジャンルの3x3マスターデータをシード（idempotent）

3x3 = 9ジャンル（日常/越境/創造 × 社会貢献/安心安全/未来共創）を
activity_genres テーブルに投入する。

既存のジャンル名と一致する行があれば更新、無ければ INSERT。
idempotent（複数回実行しても安全）。

実行方法:
    cd backend
    python -m scripts.seed_activity_genres
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import ActivityGenre
from app.settings import get_settings

# (name, default_points, sort_order)
# 5/10 チームMTG で合意した3x3マスターデータ
GENRES: list[tuple[str, int, int]] = [
    ("日常×社会貢献", 1, 1),
    ("日常×安心安全", 1, 2),
    ("日常×未来共創", 1, 3),
    ("越境×社会貢献", 3, 4),
    ("越境×安心安全", 3, 5),
    ("越境×未来共創", 3, 6),
    ("創造×社会貢献", 5, 7),
    ("創造×安心安全", 5, 8),
    ("創造×未来共創", 5, 9),
]


def seed() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)

    inserted = 0
    updated = 0

    with Session(engine) as session:
        for name, points, order in GENRES:
            existing = session.scalar(
                select(ActivityGenre).where(ActivityGenre.name == name)
            )
            if existing:
                existing.default_points = points
                existing.sort_order = order
                existing.is_active = True
                updated += 1
            else:
                session.add(
                    ActivityGenre(
                        name=name,
                        default_points=points,
                        sort_order=order,
                        is_active=True,
                    )
                )
                inserted += 1
        session.commit()

    print(f"✓ Seeded activity genres: inserted={inserted}, updated={updated}")


if __name__ == "__main__":
    seed()
