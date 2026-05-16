"""ポイントジャンル内訳 API のレスポンススキーマ。"""

from __future__ import annotations

from pydantic import BaseModel


class GenrePointsRowOut(BaseModel):
    activity_genre_id: int
    activity_genre_name: str
    sort_order: int
    points: int


class MyPointsByGenreOut(BaseModel):
    fy: str
    month: int
    rows: list[GenrePointsRowOut]
    total_points: int


class OrgMemberGenrePointsRowOut(BaseModel):
    applicant_user_id: str
    applicant_name: str
    activity_genre_id: int
    activity_genre_name: str
    genre_sort_order: int
    points: int


class OrgMemberPointsByGenreOut(BaseModel):
    fy: str
    month: int
    rows: list[OrgMemberGenrePointsRowOut]
