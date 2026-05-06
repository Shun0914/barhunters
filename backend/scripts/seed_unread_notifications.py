#!/usr/bin/env python3
"""未読通知のサンプルを追加投入する。

S-06 の青ドット表示や、ベルバッジの未読カウント確認用。
全ロール（申太郎・係長・課長・部門長）に対してそれぞれ数件作成し、
ログイン中ユーザーを切り替えても未読が見えるようにする。

冪等性: タグ `[seed_unread]` を title 末尾に含むレコードが既にあれば何もしない。

`backend/` をカレントにして実行::

    PYTHONPATH=. python scripts/seed_unread_notifications.py
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
TAG = "[seed_unread]"


def main() -> None:
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()
    try:
        existing = session.scalars(
            select(Notification).where(Notification.title.like(f"%{TAG}%"))
        ).first()
        if existing is not None:
            print(f"既に投入済みのため何もしません: {existing.id}")
            return

        applicant = session.get(User, DEV_DEFAULT_USER_ID)
        kakaricho = session.scalars(
            select(User).where(User.role == "係長").limit(1)
        ).first()
        kacho = session.scalars(
            select(User).where(User.role == "課長").limit(1)
        ).first()
        bumoncho = session.scalars(
            select(User).where(User.role == "部門長").limit(1)
        ).first()
        if not all([applicant, kakaricho, kacho, bumoncho]):
            print("ユーザー（申太郎/係長/課長/部門長）が揃っていません。")
            return

        # 関連付ける既存の申請（最新の番号付き）
        application = session.scalars(
            select(PointApplication)
            .where(PointApplication.application_number.is_not(None))
            .order_by(PointApplication.application_number.desc())
            .limit(1)
        ).first()
        if application is None:
            print("関連付ける申請がありません。先に seed_sample_application.py を実行してください。")
            return

        now = datetime.now(timezone.utc)

        # (受信者, 送信者, type, title, body) のリスト
        plan: list[tuple[User, User, str, str, str]] = [
            # 申太郎宛 — 自分の申請の進捗
            (
                applicant, kakaricho, "approved",
                "申請承認のお知らせ",
                f"{application.title}が承認されました。",
            ),
            (
                applicant, kacho, "returned",
                "申請が差戻されました",
                f"{application.title}が差戻されました。再編集して再申請してください。",
            ),
            (
                applicant, bumoncho, "approved",
                "申請承認のお知らせ",
                "資格試験合格報告が承認されました。",
            ),
            # 係長宛 — 部下からの承認依頼
            (
                kakaricho, applicant, "approval_request",
                f"承認依頼: {application.title}",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
            (
                kakaricho, applicant, "approval_request",
                "承認依頼: 社内勉強会への登壇",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
            # 課長宛 — 第2承認の依頼
            (
                kacho, kakaricho, "approval_request",
                "承認依頼: 業務改善提案発表会への登壇",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
            (
                kacho, kakaricho, "approval_request",
                "承認依頼: 顧客アンケート分析レポート作成",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
            (
                kacho, kakaricho, "approval_request",
                "承認依頼: 新人研修の講師",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
            # 部門長宛
            (
                bumoncho, kacho, "approval_request",
                "承認依頼: 全社プロジェクト推進",
                (
                    f"{applicant.name}さんよりポイント申請の承認依頼が届きました。"
                    "ポイント承認画面より内容をご確認ください。"
                ),
            ),
        ]

        notes: list[Notification] = []
        for i, (recipient, sender, ntype, title, body) in enumerate(plan):
            notes.append(
                Notification(
                    id=str(uuid4()),
                    recipient_user_id=recipient.id,
                    sender_user_id=sender.id,
                    notification_type=ntype,
                    title=f"{title} {TAG}",
                    body=body,
                    read_at=None,  # ← 未読
                    related_application_id=application.id,
                    # 1 件ずつ少しずつ古くする（一覧で順序がバラけるように）
                    created_at=now - timedelta(minutes=5 * i),
                )
            )

        for n in notes:
            session.add(n)
        session.commit()

        # ロール別の集計を表示
        by_recipient: dict[str, int] = {}
        for n in notes:
            by_recipient[n.recipient_user_id] = by_recipient.get(n.recipient_user_id, 0) + 1
        print(f"OK: 未読通知 {len(notes)} 件を投入しました")
        for uid, cnt in by_recipient.items():
            user = session.get(User, uid)
            print(f"  - {user.name if user else uid}: {cnt} 件")
    finally:
        session.close()


if __name__ == "__main__":
    main()
