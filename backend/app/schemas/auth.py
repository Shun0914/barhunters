"""認証 API のリクエスト／レスポンス。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.master import UserBriefOut


class LoginIn(BaseModel):
    """デモログイン: login_id は users.employee_code（または開発用に users.id）。"""

    login_id: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class LoginOut(BaseModel):
    user: UserBriefOut
