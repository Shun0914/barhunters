"""1on1 実施報告エンドポイント（PR-C）。

- POST /api/one-on-ones                  : 1on1 記録を新規作成
- GET  /api/one-on-ones/subordinate-roles: 自分が記録対象にできる役職リスト

仕様:
- 記録者はログインユーザー（自動取得）
- 相手として選べる役職は、ダッシュボードの pair_type（凡例）と `scripts/seed_one_on_ones.py` と同じ一覧に限定する
  （それ以外は pair_type が other のみとなるため）。
- 個人名は出さず役職のみ（実施相手の個別 user は記録しない）
- 一般社員は記録不可（選択可能リストが空 → API / UI でガード）
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import OneOnOne, User

router = APIRouter(prefix="/api/one-on-ones", tags=["one-on-ones"])

# 記録者の役職 → 1on1 相手として UI で選べる役職（seed_one_on_ones.SUBORDINATE_ROLES と同一）。
RECORDABLE_PARTNER_ROLES: dict[str, list[str]] = {
    "部長": ["課長"],
    "課長": ["係長", "一般社員"],
    "係長": ["一般社員"],
}

# (recorder_role, partner_role) → ダッシュボード 1on1 カード凡例キー。
# scripts/seed_one_on_ones.PAIR_TYPE_MAP と同一であること。
PAIR_TYPE_MAP: dict[tuple[str, str], str] = {
    ("部長", "課長"): "seniorToLead",
    ("課長", "係長"): "leadToChief",
    ("課長", "一般社員"): "leadToGeneral",
    ("係長", "一般社員"): "chiefToGeneral",
}


def get_subordinate_roles(role: str | None) -> list[str]:
    """記録用途で相手として選べる役職のリスト。未対応・一般社員等は空。"""
    if role is None:
        return []
    return list(RECORDABLE_PARTNER_ROLES.get(role, []))


def compute_pair_type(recorder_role: str, partner_role: str) -> str:
    """ダッシュボード表示用の pair_type を算出。該当なしは 'other'。"""
    return PAIR_TYPE_MAP.get((recorder_role, partner_role), "other")


class OneOnOneCreate(BaseModel):
    partner_role: str = Field(..., description="相手の役職")
    conducted_at: date = Field(..., description="実施日")
    note: str | None = None


class OneOnOneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recorder_id: str
    partner_role: str
    pair_type: str
    conducted_at: date
    note: str | None


class SubordinateRolesOut(BaseModel):
    roles: list[str]


@router.post("", response_model=OneOnOneOut, status_code=status.HTTP_201_CREATED)
def create_one_on_one(
    body: OneOnOneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OneOnOneOut:
    subordinate_roles = get_subordinate_roles(current_user.role)
    if not subordinate_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="現在の役職では 1on1 を記録できません",
        )
    if body.partner_role not in subordinate_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"相手の役職は {subordinate_roles} のいずれかである必要があります",
        )

    record = OneOnOne(
        recorder_id=current_user.id,
        partner_role=body.partner_role,
        pair_type=compute_pair_type(current_user.role or "", body.partner_role),
        conducted_at=body.conducted_at,
        note=body.note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return OneOnOneOut.model_validate(record)


@router.get("/subordinate-roles", response_model=SubordinateRolesOut)
def list_subordinate_roles(
    current_user: User = Depends(get_current_user),
) -> SubordinateRolesOut:
    """現在ユーザーが 1on1 相手として選択可能な役職リスト。"""
    return SubordinateRolesOut(roles=get_subordinate_roles(current_user.role))
