"""ORM モデル（Alembic の target_metadata 用にすべて import）。"""

from app.models.activity_genre import ActivityGenre
from app.models.base import Base
from app.models.indicator import Indicator
from app.models.notification import Notification
from app.models.point_application import PointApplication
from app.models.user import User

__all__ = [
    "Base",
    "User",
    "ActivityGenre",
    "Indicator",
    "PointApplication",
    "Notification",
]
