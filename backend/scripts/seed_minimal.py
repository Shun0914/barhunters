#!/usr/bin/env python3
"""開発用シード（spec.md §4.1 MVP 組織モデル準拠）。

- 1 組織 + 11 名（部門長 1 / 課長 1 / 係長 1 / 一般職員 8）
- 活動ジャンル: 挑戦 (10P) / その他 (5P)（Q-02 暫定値、決まり次第差し替え）
- 既定の current user 用の固定 UUID を 1 名（一般職員）に割り当て、`backend/.env` に
  `DEV_DEFAULT_USER_ID=...` として転記して使う運用。

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
from app.models import (
    ActivityGenre,
    ApplicationNumberCounter,
    Indicator,
    Organization,
    User,
)
from app.settings import get_settings

# 開発で使う固定の current user。`.env` に DEV_DEFAULT_USER_ID として書く前提。
DEV_DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111"


def main() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()

    if session.scalars(select(User).limit(1)).first() is not None:
        print(
            "既に users が存在するためスキップします（再投入する場合は DB をクリーンにしてください）。"
        )
        session.close()
        return

    org_id = str(uuid4())
    session.add(Organization(id=org_id, name="人材戦略部 第1課 1係"))
    session.flush()

    # 役職ヒエラルキー: 部門長 1 / 課長 1 / 係長 1 / 一般職員 8
    session.add(User(id=str(uuid4()), name="部門長 太郎", org_id=org_id, role="部門長"))
    session.add(User(id=str(uuid4()), name="課長 花子", org_id=org_id, role="課長"))
    session.add(User(id=str(uuid4()), name="係長 次郎", org_id=org_id, role="係長"))
    session.add(
        User(
            id=DEV_DEFAULT_USER_ID,
            name="一般職員 申太郎",
            org_id=org_id,
            role="一般職員",
        )
    )
    for i in range(2, 9):
        session.add(User(id=str(uuid4()), name=f"一般職員 {i:02d}", org_id=org_id, role="一般職員"))

    # 活動ジャンル（Q-02 暫定値）
    session.add(ActivityGenre(name="挑戦", default_points=10, sort_order=1, is_active=True))
    session.add(ActivityGenre(name="その他", default_points=5, sort_order=2, is_active=True))

    # 指標サンプル（既存仕様の維持）
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

    # 採番カウンタ（マイグレーションで初期化済だが、テーブルクリア再投入にも対応）
    counter = session.get(ApplicationNumberCounter, 1)
    if counter is None:
        session.add(ApplicationNumberCounter(id=1, next_number=1))

    session.commit()
    session.close()
    print(
        f"Seed OK: organization x1, users x11, activity_genres x2, indicators x1\n"
        f"  DEV_DEFAULT_USER_ID = {DEV_DEFAULT_USER_ID}\n"
        f"  → backend/.env に転記してサーバ起動してください。"
    )


if __name__ == "__main__":
    main()
