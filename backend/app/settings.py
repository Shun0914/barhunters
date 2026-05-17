from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ALLOW_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "sqlite:///./local.db"
    MYSQL_SSL_CA: str | None = None

    # ── デモ認証（Issue #16）────────────────────────────────────────────
    DEMO_PASSWORD: str = "demo"
    JWT_SECRET: str = "dev-change-me-in-production"
    JWT_EXPIRE_MINUTES: int = 480
    SESSION_COOKIE_NAME: str = "barhunters_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    # 開発・デモ: X-Dev-User-Id / DEV_DEFAULT_USER_ID による切替を許可
    ALLOW_DEV_AUTH_HEADER: bool = True

    # MVP レガシー（ALLOW_DEV_AUTH_HEADER 時のみ auth.py が参照）
    DEV_DEFAULT_USER_ID: str | None = None

    POINT_AGGREGATE_STATUSES: str = "approved"

    @property
    def origin_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOW_ORIGINS.split(",") if o.strip()]

    @property
    def aggregate_statuses(self) -> list[str]:
        return [s.strip() for s in self.POINT_AGGREGATE_STATUSES.split(",") if s.strip()]

    @property
    def session_cookie_samesite(self) -> Literal["lax", "strict", "none"]:
        return self.SESSION_COOKIE_SAMESITE


@lru_cache
def get_settings() -> Settings:
    return Settings()
