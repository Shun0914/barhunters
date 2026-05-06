from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ALLOW_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "sqlite:///./local.db"
    # MVP は他チーム提供のダミーセッションを前提（spec §5.0 / Q-50）。
    # 未設定なら DB の先頭ユーザーを current user として返す。`X-Dev-User-Id` ヘッダで上書き可。
    DEV_DEFAULT_USER_ID: str | None = None

    @property
    def origin_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOW_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
