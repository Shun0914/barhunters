"""認証: Cookie JWT セッション + 開発用ヘッダ切替（Issue #16）。

current user の解決順:
1. HttpOnly Cookie の JWT（`sub` = users.id）
2. ALLOW_DEV_AUTH_HEADER が true のときのみ `X-Dev-User-Id`
3. ALLOW_DEV_AUTH_HEADER が true のときのみ `DEV_DEFAULT_USER_ID`
4. いずれも無効 → HTTP 401
"""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.services.session_tokens import decode_session_token
from app.settings import Settings, get_settings


def _user_from_id(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="セッションのユーザーが見つかりません",
        )
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    x_dev_user_id: str | None = Header(default=None, alias="X-Dev-User-Id"),
) -> User:
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if token:
        user_id = decode_session_token(token, settings)
        if user_id:
            return _user_from_id(db, user_id)

    if settings.ALLOW_DEV_AUTH_HEADER:
        if x_dev_user_id:
            return _user_from_id(db, x_dev_user_id)
        if settings.DEV_DEFAULT_USER_ID:
            return _user_from_id(db, settings.DEV_DEFAULT_USER_ID)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ログインが必要です",
    )


def get_current_user_id(user: User = Depends(get_current_user)) -> str:
    return user.id
