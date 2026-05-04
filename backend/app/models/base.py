from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy モデルの基底。Alembic の target_metadata に使用する。"""
