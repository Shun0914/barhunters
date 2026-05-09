from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ALLOW_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "sqlite:///./local.db"

    # ── ポイント集計対象のステータス（カンマ区切り） ─────────────────
    # 04_データ要件.md §2.2 で実装で確定とされている値の暫定。
    # 例: "承認済"  → 承認済のみ集計
    #     "提出済,承認済" → 申請中以降を全部含める
    POINT_AGGREGATE_STATUSES: str = "承認済"

    @property
    def origin_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOW_ORIGINS.split(",") if o.strip()]

    @property
    def aggregate_statuses(self) -> list[str]:
        return [s.strip() for s in self.POINT_AGGREGATE_STATUSES.split(",") if s.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
