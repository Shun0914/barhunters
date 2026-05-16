"""PointApplication のリクエスト／レスポンススキーマ。spec §4.2。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PointApplicationStatus = Literal["draft", "submitted", "approved", "returned"]


class PointApplicationDraftIn(BaseModel):
    """下書き作成・更新用の入力。spec §2.6 — 下書き時は何もかも nullable。"""

    title: str | None = Field(default=None, max_length=50)
    activity_genre_id: int | None = None
    # 明示的に指定された場合は default_points より優先する（申請者の手動調整を許容）。
    points: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=500)
    approver_1_user_id: str | None = None
    approver_2_user_id: str | None = None
    approver_3_user_id: str | None = None


class PointApplicationOut(BaseModel):
    """frontend `PointApplication` と対応。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    application_number: str | None
    applicant_user_id: str
    applicant_name: str | None = None
    title: str | None
    activity_genre_id: int | None
    activity_genre_name: str | None = None
    points: int | None
    description: str | None
    approver_1_user_id: str | None
    approver_2_user_id: str | None
    approver_3_user_id: str | None
    approver_1_name: str | None = None
    approver_2_name: str | None = None
    approver_3_name: str | None = None
    approval_total_steps: int | None
    current_approval_step: int | None
    status: PointApplicationStatus
    submitted_at: datetime | None
    decided_at: datetime | None
    returned_at: datetime | None
    returned_by: str | None
    created_at: datetime
    updated_at: datetime
