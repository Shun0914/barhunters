"""ダミー認証。spec §5.0 / Q-50 — MVP は他チーム提供のダミーセッションを前提とする。

current user の解決順:
1. リクエストヘッダ `X-Dev-User-Id`
2. 環境変数 `DEV_DEFAULT_USER_ID`
3. DB の先頭ユーザー（`users.id` 昇順 1 件目）

いずれも見つからなければ HTTP 401 を返す。本物の認証導入時にこのモジュールごと差し替える前提。
"""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.settings import get_settings


def get_current_user(
    db: Session = Depends(get_db),
    x_dev_user_id: str | None = Header(default=None, alias="X-Dev-User-Id"),
) -> User:
    candidate_id: str | None = x_dev_user_id or get_settings().DEV_DEFAULT_USER_ID

    if candidate_id is not None:
        user = db.get(User, candidate_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"指定された開発用ユーザー id={candidate_id} が見つかりません",
            )
        return user

    user = db.scalars(select(User).order_by(User.id).limit(1)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが 1 件も登録されていません。seed を実行してください。",
        )
    return user


def get_current_user_id(user: User = Depends(get_current_user)) -> str:
    return user.id
