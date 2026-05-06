#!/usr/bin/env python3
"""S-02 動作確認用のサンプル申請を追加投入する。

- 一般職員 申太郎（DEV_DEFAULT_USER_ID）の申請
- status=submitted, current_approval_step=2（第1承認者承認済 → 第2承認者が決裁中）
- application_number は採番テーブルから取得（既存の連番を進める）

`backend/` をカレントにして実行::

    PYTHONPATH=. python scripts/seed_sample_application.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
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
    PointApplication,
    User,
)
from app.settings import get_settings

DEV_DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111"
SAMPLE_TITLE = "業務改善提案発表会への登壇"


def main() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()
    try:
        applicant = session.get(User, DEV_DEFAULT_USER_ID)
        if applicant is None:
            print(
                f"DEV_DEFAULT_USER_ID={DEV_DEFAULT_USER_ID} のユーザーが見つかりません。"
                " 先に scripts/seed_minimal.py を実行してください。"
            )
            return

        # 既に同タイトルが入っていれば二重投入しない（冪等）
        exists = session.scalars(
            select(PointApplication).where(
                PointApplication.applicant_user_id == applicant.id,
                PointApplication.title == SAMPLE_TITLE,
            )
        ).first()
        if exists is not None:
            print(f"既に投入済みです: id={exists.id} number={exists.application_number}")
            return

        # 申請者と同じ組織から係長・課長・部門長を 1 名ずつ取得
        def _pick(role: str) -> User:
            user = session.scalars(
                select(User)
                .where(User.org_id == applicant.org_id, User.role == role)
                .order_by(User.name)
                .limit(1)
            ).first()
            if user is None:
                raise RuntimeError(f"組織 {applicant.org_id} に role={role!r} のユーザーがいません")
            return user

        approver_1 = _pick("係長")
        approver_2 = _pick("課長")
        approver_3 = _pick("部門長")

        # 「挑戦」ジャンルを使用
        genre = session.scalars(
            select(ActivityGenre).where(ActivityGenre.name == "挑戦").limit(1)
        ).first()
        if genre is None:
            raise RuntimeError("ActivityGenre name='挑戦' が見つかりません")

        # 採番カウンタから application_number を取得
        counter = session.get(ApplicationNumberCounter, 1)
        if counter is None:
            counter = ApplicationNumberCounter(id=1, next_number=1)
            session.add(counter)
            session.flush()
        number = f"{counter.next_number:06d}"
        counter.next_number = counter.next_number + 1
        session.flush()

        now = datetime.now(timezone.utc)
        application = PointApplication(
            id=str(uuid4()),
            application_number=number,
            applicant_user_id=applicant.id,
            title=SAMPLE_TITLE,
            activity_genre_id=genre.id,
            points=genre.default_points,
            description=(
                "全社の業務改善提案発表会で、人材戦略部の生産性向上プロジェクトの"
                "取り組みについて 15 分間の発表を行いました。"
            ),
            approver_1_user_id=approver_1.id,
            approver_2_user_id=approver_2.id,
            approver_3_user_id=approver_3.id,
            approval_total_steps=3,
            current_approval_step=2,  # ← 第1承認者が承認済 / 第2承認者が決裁中
            status="submitted",
            submitted_at=now,
        )
        session.add(application)
        session.commit()
        print(
            "Seed sample application OK\n"
            f"  id={application.id}\n"
            f"  application_number={application.application_number}\n"
            f"  current_approval_step={application.current_approval_step}\n"
            f"  approver_1={approver_1.name} (承認済の想定)\n"
            f"  approver_2={approver_2.name} (決裁中)\n"
            f"  approver_3={approver_3.name}"
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()
