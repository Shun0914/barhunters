from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select, table, text
from sqlalchemy.exc import SQLAlchemyError

from app.db import dispose_engine, get_engine
from app.routers import (
    approvals,
    auth,
    dashboard,
    masters,
    notifications,
    one_on_ones,
    point_applications,
    roadmap,
    users,
)
from app.routers import (
    cascade as cascade_router,
)
from app.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    get_engine(settings.DATABASE_URL)
    yield
    dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="barhunters API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(masters.router)
    app.include_router(users.router)
    app.include_router(point_applications.router)
    app.include_router(approvals.router)
    app.include_router(notifications.router)
    app.include_router(cascade_router.router)
    app.include_router(dashboard.router)
    app.include_router(one_on_ones.router)
    app.include_router(roadmap.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/hello")
    def hello() -> dict[str, str]:
        s = get_settings()
        eng = get_engine(s.DATABASE_URL)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"message": "ok", "database": "ok"}

    @app.get("/api/db/meta")
    def db_meta() -> dict[str, object]:
        """Alembic 適用状況と主要テーブル件数（開発用）。"""
        s = get_settings()
        eng = get_engine(s.DATABASE_URL)
        try:
            with eng.connect() as conn:
                version = conn.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).scalar_one_or_none()
                counts: dict[str, int] = {}
                for tbl in (
                    "users",
                    "activity_genres",
                    "indicators",
                    "point_applications",
                    "notifications",
                ):
                    t = table(tbl)
                    q = select(func.count()).select_from(t)
                    counts[tbl] = int(conn.execute(q).scalar_one())
                return {"alembic_version": version, "tables": counts}
        except SQLAlchemyError as e:
            return {
                "error": str(e),
                "hint": "cd backend && pip install -e '.[dev]' && alembic upgrade head",
            }

    return app


app = create_app()
