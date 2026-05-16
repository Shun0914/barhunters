"""ポイントジャンル内訳 API のレスポンススキーマ。

v7: 2値ポイント体系で daily=0.1P が発生するため、points は float に変更。
"""

from __future__ import annotations

from pydantic import BaseModel


class GenrePointsRowOut(BaseModel):
    activity_genre_id: int
    activity_genre_name: str
    sort_order: int
    points: float


class MyPointsByGenreOut(BaseModel):
    fy: str
    month: int
    rows: list[GenrePointsRowOut]
    total_points: float


class OrgMemberGenrePointsRowOut(BaseModel):
    applicant_user_id: str
    applicant_name: str
    activity_genre_id: int
    activity_genre_name: str
    genre_sort_order: int
    points: float


class OrgMemberPointsByGenreOut(BaseModel):
    fy: str
    month: int
    rows: list[OrgMemberGenrePointsRowOut]
