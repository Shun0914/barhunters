"""マスタ参照エンドポイント。spec §5.1。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ActivityGenre
from app.schemas.master import ActivityGenreOut

router = APIRouter(prefix="/api/masters", tags=["masters"])


@router.get("/activity-genres", response_model=list[ActivityGenreOut])
def list_activity_genres(db: Session = Depends(get_db)) -> list[ActivityGenre]:
    stmt = (
        select(ActivityGenre)
        .where(ActivityGenre.is_active.is_(True))
        .order_by(ActivityGenre.sort_order, ActivityGenre.id)
    )
    return list(db.scalars(stmt))
