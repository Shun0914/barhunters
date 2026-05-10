"""PointApplication の DTO 変換ヘルパー。

ID のみのモデルに対して、ユーザー氏名・活動ジャンル名を埋めて
`PointApplicationOut` を組み立てる。S-02 / S-04 の両方から利用する。
"""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ActivityGenre, PointApplication, User
from app.schemas.point_application import PointApplicationOut


def load_users_map(db: Session, user_ids: Iterable[str | None]) -> dict[str, User]:
    ids = {uid for uid in user_ids if uid}
    if not ids:
        return {}
    users = db.scalars(select(User).where(User.id.in_(ids))).all()
    return {u.id: u for u in users}


def load_genres_map(db: Session, genre_ids: Iterable[int | None]) -> dict[int, ActivityGenre]:
    ids = {gid for gid in genre_ids if gid is not None}
    if not ids:
        return {}
    genres = db.scalars(select(ActivityGenre).where(ActivityGenre.id.in_(ids))).all()
    return {g.id: g for g in genres}


def enrich_with_maps(
    app: PointApplication,
    users_map: dict[str, User],
    genres_map: dict[int, ActivityGenre],
) -> PointApplicationOut:
    out = PointApplicationOut.model_validate(app)
    applicant = users_map.get(app.applicant_user_id)
    out.applicant_name = applicant.name if applicant else None
    if app.activity_genre_id is not None:
        genre = genres_map.get(app.activity_genre_id)
        out.activity_genre_name = genre.name if genre else None
    for i in (1, 2, 3):
        approver_id = getattr(app, f"approver_{i}_user_id")
        if approver_id is not None:
            user = users_map.get(approver_id)
            setattr(out, f"approver_{i}_name", user.name if user else None)
    return out


def enrich_application(application: PointApplication, db: Session) -> PointApplicationOut:
    users_map = load_users_map(
        db,
        [
            application.applicant_user_id,
            application.approver_1_user_id,
            application.approver_2_user_id,
            application.approver_3_user_id,
        ],
    )
    genres_map = load_genres_map(db, [application.activity_genre_id])
    return enrich_with_maps(application, users_map, genres_map)


def enrich_applications(
    applications: list[PointApplication], db: Session
) -> list[PointApplicationOut]:
    user_ids: list[str | None] = []
    genre_ids: list[int | None] = []
    for a in applications:
        user_ids.extend(
            [
                a.applicant_user_id,
                a.approver_1_user_id,
                a.approver_2_user_id,
                a.approver_3_user_id,
            ]
        )
        genre_ids.append(a.activity_genre_id)
    users_map = load_users_map(db, user_ids)
    genres_map = load_genres_map(db, genre_ids)
    return [enrich_with_maps(a, users_map, genres_map) for a in applications]
