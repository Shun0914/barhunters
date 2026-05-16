#!/usr/bin/env python3
"""1on1 ダミーデータをシード（idempotent）。

各 recorder（部長/課長/係長）が直近 3 ヶ月で複数件の 1on1 を記録した想定で投入する。
pair_type は (recorder.role, partner_role) から算出し、frontend 凡例キーと一致させる。

`backend/` をカレントにして実行::

    PYTHONPATH=. python scripts/seed_one_on_ones.py
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path
from random import Random

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_engine
from app.models import OneOnOne, User
from app.settings import get_settings

# frontend DashboardData.oneOnOneBreakdown のキーと一致させる。
PAIR_TYPE_MAP: dict[tuple[str, str], str] = {
    ("部長", "課長"): "seniorToLead",
    ("課長", "係長"): "leadToChief",
    ("課長", "一般社員"): "leadToGeneral",
    ("係長", "一般社員"): "chiefToGeneral",
}

# frontend Dashboard の pair_type と一致させる。**記録できる相手役職一覧は app.routers.one_on_ones.RECORDABLE_PARTNER_ROLES と同期すること。**
SUBORDINATE_ROLES: dict[str, list[str]] = {
    "部長": ["課長"],
    "課長": ["係長", "一般社員"],
    "係長": ["一般社員"],
}


def compute_pair_type(recorder_role: str, partner_role: str) -> str:
    return PAIR_TYPE_MAP.get((recorder_role, partner_role), "other")


def main() -> None:
    rng = Random(42)  # 再現性のため固定シード
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()

    # idempotent: 既存データを削除して入れ直す。
    deleted = session.query(OneOnOne).delete()
    session.commit()

    recorders = session.scalars(
        select(User).where(User.role.in_(list(SUBORDINATE_ROLES.keys())))
    ).all()
    if not recorders:
        print(
            "recorder 候補ユーザー（部長/課長/係長）が居ません。"
            "先に `python scripts/seed_minimal.py` を実行してください。"
        )
        session.close()
        return

    records: list[OneOnOne] = []
    today = date.today()
    for recorder in recorders:
        partner_candidates = SUBORDINATE_ROLES.get(recorder.role or "", [])
        if not partner_candidates:
            continue
        num_sessions = rng.randint(3, 12)
        for _ in range(num_sessions):
            partner_role = rng.choice(partner_candidates)
            pair_type = compute_pair_type(recorder.role or "", partner_role)
            days_ago = rng.randint(0, 90)
            records.append(
                OneOnOne(
                    recorder_id=recorder.id,
                    partner_role=partner_role,
                    pair_type=pair_type,
                    conducted_at=today - timedelta(days=days_ago),
                    note=None,
                )
            )

    session.add_all(records)
    session.commit()
    session.close()
    print(f"Seed OK: deleted {deleted} old, inserted {len(records)} 1on1 records.")


if __name__ == "__main__":
    main()
