#!/usr/bin/env python3
"""Azure / レビュー環境の画面確認用 seed。

- 3x3 の activity_genres を先に投入
- 2 組織 + ユーザー群を作成
- `/applications` 用に既定ユーザーを固定 ID で投入
- `/approvals` 用に submitted 申請を 1 件投入
- `/cascade` 用に approved 申請を複数組織へ投入

複数回実行しても同じ ID の行を更新するだけの idempotent な構成。

実行方法:
    cd backend
    python -m scripts.seed_azure_demo_data
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from app.db import get_engine
from app.models import (
    ActivityGenre,
    ApplicationNumberCounter,
    Organization,
    PointApplication,
    User,
)
from app.services.point_calc import (
    compute_final_point,
    derived_genre_name,
    parse_legacy_genre_name,
)
from app.settings import get_settings
from scripts.seed_activity_genres import seed as seed_activity_genres

DEV_DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111"
WAITING_APPROVER_USER_ID = "22222222-2222-2222-2222-222222222222"

ORG_FUKUOKA_ID = "10000000-0000-0000-0000-000000000001"
ORG_KITAKYUSHU_ID = "10000000-0000-0000-0000-000000000002"


@dataclass(frozen=True)
class SeedUser:
    id: str
    name: str
    org_id: str
    role: str
    employee_code: str


@dataclass(frozen=True)
class SeedApplication:
    id: str
    title: str
    applicant_user_id: str
    genre_name: str
    status: str
    approval_total_steps: int
    current_approval_step: int | None
    approver_1_user_id: str | None
    approver_2_user_id: str | None
    approver_3_user_id: str | None
    submitted_days_ago: int
    decided_days_ago: int | None
    description: str


USERS = [
    SeedUser(
        id="22222222-2222-2222-2222-222222222223",
        name="福岡 部長",
        org_id=ORG_FUKUOKA_ID,
        role="部長",
        employee_code="FUK-BM-001",
    ),
    SeedUser(
        id="22222222-2222-2222-2222-222222222222",
        name="福岡 課長",
        org_id=ORG_FUKUOKA_ID,
        role="課長",
        employee_code="FUK-KC-001",
    ),
    SeedUser(
        id="22222222-2222-2222-2222-222222222221",
        name="福岡 係長",
        org_id=ORG_FUKUOKA_ID,
        role="係長",
        employee_code="FUK-KG-001",
    ),
    SeedUser(
        id=DEV_DEFAULT_USER_ID,
        name="福岡 一般社員 申太郎",
        org_id=ORG_FUKUOKA_ID,
        role="一般社員",
        employee_code="FUK-IP-001",
    ),
    SeedUser(
        id="22222222-2222-2222-2222-222222222224",
        name="福岡 一般社員 確認子",
        org_id=ORG_FUKUOKA_ID,
        role="一般社員",
        employee_code="FUK-IP-002",
    ),
    SeedUser(
        id="33333333-3333-3333-3333-333333333333",
        name="北九州 部長",
        org_id=ORG_KITAKYUSHU_ID,
        role="部長",
        employee_code="KIT-BM-001",
    ),
    SeedUser(
        id="33333333-3333-3333-3333-333333333332",
        name="北九州 課長",
        org_id=ORG_KITAKYUSHU_ID,
        role="課長",
        employee_code="KIT-KC-001",
    ),
    SeedUser(
        id="33333333-3333-3333-3333-333333333331",
        name="北九州 係長",
        org_id=ORG_KITAKYUSHU_ID,
        role="係長",
        employee_code="KIT-KG-001",
    ),
    SeedUser(
        id="33333333-3333-3333-3333-333333333334",
        name="北九州 一般社員 連携子",
        org_id=ORG_KITAKYUSHU_ID,
        role="一般社員",
        employee_code="KIT-IP-001",
    ),
]

APPLICATIONS = [
    SeedApplication(
        id="44444444-4444-4444-4444-444444444441",
        title="全社アイデアソンの企画運営",
        applicant_user_id=DEV_DEFAULT_USER_ID,
        genre_name="創造×未来共創",
        status="approved",
        approval_total_steps=3,
        current_approval_step=None,
        approver_1_user_id="22222222-2222-2222-2222-222222222221",
        approver_2_user_id="22222222-2222-2222-2222-222222222222",
        approver_3_user_id="22222222-2222-2222-2222-222222222223",
        submitted_days_ago=12,
        decided_days_ago=10,
        description=(
            "部門横断のアイデアソンを立ち上げ、企画運営と参加者サポートを担当しました。"
        ),
    ),
    SeedApplication(
        id="44444444-4444-4444-4444-444444444442",
        title="安全手順の見直しと勉強会開催",
        applicant_user_id=DEV_DEFAULT_USER_ID,
        # v7: 「越境×安心安全」を廃止したため「創造×安心安全」に変更
        genre_name="創造×安心安全",
        status="submitted",
        approval_total_steps=3,
        current_approval_step=2,
        approver_1_user_id="22222222-2222-2222-2222-222222222221",
        approver_2_user_id=WAITING_APPROVER_USER_ID,
        approver_3_user_id="22222222-2222-2222-2222-222222222223",
        submitted_days_ago=2,
        decided_days_ago=None,
        description=(
            "他部署の改善事例を取り込み、現場向けの安全手順書を更新して勉強会を実施しました。"
        ),
    ),
    SeedApplication(
        id="44444444-4444-4444-4444-444444444443",
        title="地域イベントでの業務紹介ブース出展",
        applicant_user_id="33333333-3333-3333-3333-333333333334",
        genre_name="日常×社会貢献",
        status="approved",
        approval_total_steps=3,
        current_approval_step=None,
        approver_1_user_id="33333333-3333-3333-3333-333333333331",
        approver_2_user_id="33333333-3333-3333-3333-333333333332",
        approver_3_user_id="33333333-3333-3333-3333-333333333333",
        submitted_days_ago=8,
        decided_days_ago=7,
        description=(
            "地域イベントで会社の取り組みを紹介し、来場者からの問い合わせ対応を行いました。"
        ),
    ),
]


def _ensure_organization(session: Session, org_id: str, name: str) -> bool:
    organization = session.get(Organization, org_id)
    created = organization is None
    if organization is None:
        organization = Organization(id=org_id, name=name)
        session.add(organization)
    else:
        organization.name = name
    return created


def _ensure_user(session: Session, seed_user: SeedUser) -> bool:
    user = session.get(User, seed_user.id)
    created = user is None
    if user is None:
        user = User(
            id=seed_user.id,
            name=seed_user.name,
            employee_code=seed_user.employee_code,
            org_id=seed_user.org_id,
            role=seed_user.role,
        )
        session.add(user)
    else:
        user.name = seed_user.name
        user.employee_code = seed_user.employee_code
        user.org_id = seed_user.org_id
        user.role = seed_user.role
    return created


def _ensure_counter(session: Session) -> ApplicationNumberCounter:
    counter = session.get(ApplicationNumberCounter, 1)
    if counter is None:
        counter = ApplicationNumberCounter(id=1, next_number=1)
        session.add(counter)
        session.flush()

    max_number = session.scalar(select(func.max(PointApplication.application_number)))
    if max_number and max_number.isdigit():
        counter.next_number = max(counter.next_number, int(max_number) + 1)
    else:
        counter.next_number = max(counter.next_number, 1)
    session.flush()
    return counter


def _allocate_application_number(counter: ApplicationNumberCounter) -> str:
    number = f"{counter.next_number:06d}"
    counter.next_number += 1
    return number


def _genre_by_name(session: Session, name: str) -> ActivityGenre:
    genre = session.scalar(select(ActivityGenre).where(ActivityGenre.name == name))
    if genre is None:
        raise RuntimeError(
            f"ActivityGenre name={name!r} が見つかりません。"
            " 先に scripts.seed_activity_genres を流してください。"
        )
    return genre


def _ensure_application(
    session: Session,
    counter: ApplicationNumberCounter,
    seed_application: SeedApplication,
) -> bool:
    application = session.get(PointApplication, seed_application.id)
    created = application is None
    genre = _genre_by_name(session, seed_application.genre_name)
    # v7: ジャンル名から level/category を逆引きし、final_point を申請者の役職で算出
    level, category = parse_legacy_genre_name(genre.name)
    # 万一不一致なら一度回り回って derived_genre_name で正規化（タイポ防止）
    if level and category:
        canonical = derived_genre_name(level, category)
        assert canonical == genre.name, (canonical, genre.name)
    applicant = session.get(User, seed_application.applicant_user_id)
    role = applicant.role if applicant else None
    final_point = compute_final_point(level, role) if level else None

    if application is None:
        application = PointApplication(
            id=seed_application.id,
            application_number=_allocate_application_number(counter),
            applicant_user_id=seed_application.applicant_user_id,
            title=seed_application.title,
            level=level,
            category=category,
            final_point=final_point,
            points=final_point,
            activity_genre_id=genre.id,
            description=seed_application.description,
            approver_1_user_id=seed_application.approver_1_user_id,
            approver_2_user_id=seed_application.approver_2_user_id,
            approver_3_user_id=seed_application.approver_3_user_id,
            approval_total_steps=seed_application.approval_total_steps,
            current_approval_step=seed_application.current_approval_step,
            status=seed_application.status,
        )
        session.add(application)
    else:
        if application.application_number is None:
            application.application_number = _allocate_application_number(counter)
        application.applicant_user_id = seed_application.applicant_user_id
        application.title = seed_application.title
        application.level = level
        application.category = category
        application.final_point = final_point
        application.points = final_point
        application.activity_genre_id = genre.id
        application.description = seed_application.description
        application.approver_1_user_id = seed_application.approver_1_user_id
        application.approver_2_user_id = seed_application.approver_2_user_id
        application.approver_3_user_id = seed_application.approver_3_user_id
        application.approval_total_steps = seed_application.approval_total_steps
        application.current_approval_step = seed_application.current_approval_step
        application.status = seed_application.status

    submitted_at = datetime.now(timezone.utc) - timedelta(days=seed_application.submitted_days_ago)
    application.submitted_at = submitted_at
    application.decided_at = (
        datetime.now(timezone.utc) - timedelta(days=seed_application.decided_days_ago)
        if seed_application.decided_days_ago is not None
        else None
    )
    application.returned_at = None
    application.returned_by = None
    return created


def main() -> None:
    seed_activity_genres()

    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    session_local = sessionmaker(bind=engine)
    session: Session = session_local()

    org_created = 0
    user_created = 0
    app_created = 0

    try:
        org_created += int(
            _ensure_organization(session, ORG_FUKUOKA_ID, "営業本部 福岡リビング営業部")
        )
        org_created += int(
            _ensure_organization(session, ORG_KITAKYUSHU_ID, "営業本部 北九州リビング営業部")
        )

        for seed_user in USERS:
            user_created += int(_ensure_user(session, seed_user))

        counter = _ensure_counter(session)

        for seed_application in APPLICATIONS:
            app_created += int(_ensure_application(session, counter, seed_application))

        session.commit()
    finally:
        session.close()

    print("Seeded Azure demo data")
    print(f"  organizations: total={2}, created={org_created}, updated={2 - org_created}")
    print(f"  users: total={len(USERS)}, created={user_created}, updated={len(USERS) - user_created}")
    print(
        "  point_applications: "
        f"total={len(APPLICATIONS)}, created={app_created}, updated={len(APPLICATIONS) - app_created}"
    )
    print(f"  DEV_DEFAULT_USER_ID={DEV_DEFAULT_USER_ID} (既定の申請者)")
    print(f"  WAITING_APPROVER_USER_ID={WAITING_APPROVER_USER_ID} (/approvals 確認用の課長)")


if __name__ == "__main__":
    main()
