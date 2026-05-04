from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import dispose_engine, get_engine
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

    return app


app = create_app()
