#!/usr/bin/env python3
"""開発用の最小シード（ユーザー・ジャンル・指標・下書き申請1件）。

`backend/` をカレントにして実行::

    pip install -e ".[dev]"
    alembic upgrade head
    PYTHONPATH=. python scripts/seed_minimal.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_engine
from app.models import ActivityGenre, Indicator, PointApplication, User
from app.settings import get_settings


def main() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session: Session = SessionLocal()

    if session.scalars(select(User).limit(1)).first() is not None:
        print(
            "既に users が存在するためスキップします（再投入する場合は DB をクリーンにしてください）。"
        )
        session.close()
        return

    uid_demo = str(uuid4())
    uid_approver = str(uuid4())

    session.add(User(id=uid_demo, name="デモ申請者"))
    session.add(User(id=uid_approver, name="デモ承認者"))
    session.flush()

    g1 = ActivityGenre(name="挑戦", sort_order=1)
    g2 = ActivityGenre(name="その他", sort_order=2)
    session.add_all([g1, g2])
    session.flush()

    session.add(
        Indicator(
            tab_key="all",
            column_key="lead",
            label="指標サンプル",
            value_display="42",
            sort_order=0,
            link_url=None,
        )
    )

    session.add(
        PointApplication(
            id=str(uuid4()),
            applicant_user_id=uid_demo,
            title="下書きサンプル",
            activity_genre_id=g1.id,
            points=10,
            description="シード用の下書きです。",
            approver_user_id=None,
            status="draft",
        )
    )
    session.commit()
    session.close()
    print("Seed OK: users x2, activity_genres x2, indicators x1, point_applications x1 (draft).")


if __name__ == "__main__":
    main()
