"""デモ用ログイン・ログアウト（Issue #16 / AUTH-01, AUTH-02）。"""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.schemas.auth import LoginIn, LoginOut
from app.schemas.master import UserBriefOut
from app.services.session_tokens import create_session_token
from app.settings import Settings, get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ログイン ID またはパスワードが正しくありません",
    )


def _find_user_by_login_id(db: Session, login_id: str) -> User | None:
    login_id = login_id.strip()
    if not login_id:
        return None
    user = db.scalar(select(User).where(User.employee_code == login_id))
    if user is not None:
        return user
    # 開発用: UUID 形式なら id でも検索可
    if len(login_id) == 36 and login_id.count("-") == 4:
        return db.get(User, login_id)
    return None


def _set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    max_age = settings.JWT_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.session_cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.session_cookie_samesite,
    )


@router.post("/login", response_model=LoginOut)
def login(
    body: LoginIn,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> LoginOut:
    """employee_code + 共通デモ PW で JWT を HttpOnly Cookie に載せる。"""
    if not secrets.compare_digest(body.password, settings.DEMO_PASSWORD):
        raise _invalid_credentials()

    user = _find_user_by_login_id(db, body.login_id)
    if user is None:
        raise _invalid_credentials()

    token = create_session_token(user.id, settings)
    _set_session_cookie(response, token, settings)
    return LoginOut(user=UserBriefOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    settings: Settings = Depends(get_settings),
) -> None:
    _clear_session_cookie(response, settings)


@router.get("/session", response_model=UserBriefOut)
def get_session(current_user: User = Depends(get_current_user)) -> UserBriefOut:
    """Cookie セッションが有効なら現在ユーザーを返す（フロントのゲート用）。"""
    return UserBriefOut.model_validate(current_user)
