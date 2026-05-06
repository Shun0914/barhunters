"""マスタ系・ルックアップ系のレスポンススキーマ。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ActivityGenreOut(BaseModel):
    """spec §4.4 ActivityGenre。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    default_points: int
    sort_order: int


class UserBriefOut(BaseModel):
    """承認者候補のサマリ表示用。frontend `UserBrief` と対応。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str | None = None


class ApprovalRouteOut(BaseModel):
    """spec §2.5 承認ルート自動算出結果。"""

    applicant_user_id: str
    applicant_role: str | None
    approval_total_steps: int
    default_approver_user_ids: list[str | None]
    candidates_per_step: list[list[UserBriefOut]]
