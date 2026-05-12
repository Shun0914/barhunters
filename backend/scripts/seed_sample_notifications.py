#!/usr/bin/env python3
"""S-06 動作確認用のサンプル通知を投入する。

既存の申請に紐付ける形で、課長花子・申太郎宛てに数件作る。
- 課長花子: 申太郎の #000002 申請の承認依頼（未読）
- 申太郎: 過去の申請が承認 / 差戻しされた想定の通知（混在）

`backend/` をカレントにして実行::

    PYTHONPATH=. python scripts/seed_sample_notifications.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_engine
from app.models import Notification, PointApplication, User
from app.settings import get_settings

DEV_DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111"
SAMPLE_TAG = "[seed_sample_notifications]"  # 重複検知用に title 末尾に付与


def main() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()
    try:
        applicant = session.get(User, DEV_DEFAULT_USER_ID)
        if applicant is None:
            print("先に scripts/seed_minimal.py を実行してください。")
            return

        # 既に投入済みなら何もしない（タグ付き title の有無で判定）
        exists = session.scalars(
            select(Notification).where(Notification.title.like(f"%{SAMPLE_TAG}%"))
        ).first()
        if exists is not None:
            print(f"既に投入済みのため何もしません: {exists.id}")
            return

        kacho = session.scalars(select(User).where(User.role == "課長").limit(1)).first()
        kakaricho = session.scalars(select(User).where(User.role == "係長").limit(1)).first()
        bumoncho = session.scalars(select(User).where(User.role == "部長").limit(1)).first()
        if kacho is None or kakaricho is None or bumoncho is None:
            print("ユーザー（課長/係長/部長）が揃っていません。")
            return

        application = session.scalars(
            select(PointApplication)
            .where(PointApplication.applicant_user_id == applicant.id)
            .where(PointApplication.application_number.is_not(None))
            .order_by(PointApplication.application_number.desc())
            .limit(1)
        ).first()
        if application is None:
            print("既存の申請がありません。先に seed_sample_application.py を実行してください。")
            return

        now = datetime.now(timezone.utc)

        notes: list[Notification] = []

        def add(
            recipient: User,
            sender: User,
            ntype: str,
            title: str,
            body: str,
            created_at: datetime,
            read: bool = False,
        ) -> None:
            notes.append(
                Notification(
                    id=str(uuid4()),
                    recipient_user_id=recipient.id,
                    sender_user_id=sender.id,
                    notification_type=ntype,
                    title=f"{title} {SAMPLE_TAG}",
                    body=body,
                    read_at=now if read else None,
                    related_application_id=application.id,
                    created_at=created_at,
                )
            )

        # 課長花子宛: 申太郎からの承認依頼（未読 1 件 + 既読 1 件）
        add(
            recipient=kacho,
            sender=applicant,
            ntype="approval_request",
            title=f"承認依頼: {application.title}",
            body=(
                f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                "ポイント承認画面より内容をご確認ください。"
            ),
            created_at=now - timedelta(minutes=10),
            read=False,
        )
        add(
            recipient=kacho,
            sender=applicant,
            ntype="approval_request",
            title="承認依頼: 講義動画視聴",
            body=(
                f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                "ポイント承認画面より内容をご確認ください。"
            ),
            created_at=now - timedelta(hours=2),
            read=True,
        )

        # 申太郎宛: 過去の承認 / 差戻し通知（混在）
        add(
            recipient=applicant,
            sender=bumoncho,
            ntype="approved",
            title="申請承認のお知らせ",
            body=f"{application.title}が承認されました。",
            created_at=now - timedelta(days=1),
            read=False,
        )
        add(
            recipient=applicant,
            sender=kakaricho,
            ntype="returned",
            title="申請が差戻されました",
            body=(f"{application.title}が差戻されました。再編集して再申請してください。"),
            created_at=now - timedelta(days=2),
            read=True,
        )

        for n in notes:
            session.add(n)
        session.commit()
        print(f"OK: {len(notes)} 件の通知を投入しました。")
        for n in notes:
            print(
                f"  - to={n.recipient_user_id[:8]}... type={n.notification_type:18s}"
                f" title={n.title}"
            )
    finally:
        session.close()


if __name__ == "__main__":
    main()
