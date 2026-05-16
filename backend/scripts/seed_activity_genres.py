"""活動ジャンルの 2 × 3 = 6 マスターデータをシード（idempotent）。

v7 (5/14 合意): 9 ジャンル → 6 ジャンルに削減
  - 日常 / 創造 × 社会貢献 / 安心安全 / 未来共創
  - 「越境×〜」は廃止（マイグレーション c83e1f4a2d09 で既存 row も削除済み）

default_points は新スキーマでは参照しない（base_point は level から導出）が、
旧クライアント互換のため代表値（daily=1 / creative=5）を残す。

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
# v7 — 5/14 チーム合意の 2×3 マスタ
GENRES: list[tuple[str, int, int]] = [
    ("日常×社会貢献", 1, 1),
    ("日常×安心安全", 1, 2),
    ("日常×未来共創", 1, 3),
    ("創造×社会貢献", 5, 4),
    ("創造×安心安全", 5, 5),
    ("創造×未来共創", 5, 6),
]

LEGACY_NAMES_TO_DEACTIVATE: list[str] = [
    "越境×社会貢献",
    "越境×安心安全",
    "越境×未来共創",
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

        # 既に残っている越境×〜 row を非アクティブ化（マイグレーション後の保険）
        deactivated = 0
        for legacy in LEGACY_NAMES_TO_DEACTIVATE:
            row = session.scalar(
                select(ActivityGenre).where(ActivityGenre.name == legacy)
            )
            if row is not None and row.is_active:
                row.is_active = False
                deactivated += 1

        session.commit()

    print(
        f"✓ Seeded activity genres: inserted={inserted}, updated={updated}, "
        f"legacy_deactivated={deactivated}"
    )


if __name__ == "__main__":
    seed()
