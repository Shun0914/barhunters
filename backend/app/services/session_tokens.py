"""デモ用 JWT セッション（HttpOnly Cookie）の発行・検証。"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from jwt.exceptions import PyJWTError

from app.settings import Settings


def create_session_token(user_id: str, settings: Settings) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "iat": now, "exp": exp},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def decode_session_token(token: str, settings: Settings) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except PyJWTError:
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None
