"""ローカル開発用の最小 DB 接続（SQLite 既定）。"""

import ssl
from collections.abc import Iterator

from sqlalchemy import create_engine, event, pool, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.settings import get_settings

_engine: Engine | None = None
_bound_url: str | None = None
_SessionLocal: sessionmaker[Session] | None = None


def _connect_args_for_azure_mysql(mysql_ssl_ca: str | None) -> dict:
    """Azure MySQL は require_secure_transport のため TLS 必須（PyMySQL は既定で平文）。"""
    if mysql_ssl_ca:
        return {"ssl": {"ca": mysql_ssl_ca}}
    return {"ssl": ssl.create_default_context()}


def connect_args_for_url(database_url: str, mysql_ssl_ca: str | None = None) -> dict:
    connect_args: dict = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif database_url.startswith("mysql") and "database.azure.com" in database_url:
        connect_args.update(_connect_args_for_azure_mysql(mysql_ssl_ca))
    return connect_args


def make_migration_engine(database_url: str, mysql_ssl_ca: str | None = None) -> Engine:
    """Alembic 用（NullPool）。"""
    return create_engine(
        database_url,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
        connect_args=connect_args_for_url(database_url, mysql_ssl_ca),
    )


def get_engine(database_url: str) -> Engine:
    """単一 Engine を再利用（URL が変わった場合は作り直す）。"""
    global _engine, _bound_url
    if _engine is not None and _bound_url == database_url:
        return _engine
    if _engine is not None:
        _engine.dispose()
    ca = get_settings().MYSQL_SSL_CA
    connect_args = connect_args_for_url(database_url, ca)

    _engine = create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)

    if database_url.startswith("sqlite"):

        @event.listens_for(_engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record):  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    _bound_url = database_url
    return _engine


def dispose_engine() -> None:
    global _engine, _bound_url, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _bound_url = None
    _SessionLocal = None


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        eng = get_engine(get_settings().DATABASE_URL)
        _SessionLocal = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)
    return _SessionLocal


def get_db() -> Iterator[Session]:
    """FastAPI 依存関係: 1 リクエスト 1 セッション。"""
    factory = get_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()


def db_ping(database_url: str) -> bool:
    try:
        eng = get_engine(database_url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
