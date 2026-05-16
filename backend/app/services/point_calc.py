"""2値ポイント体系の計算ユーティリティ（v7）。

- level (daily/creative) と category (social/safety/future) から
  ベースポイント・役職傾斜・最終ポイント・派生 activity_genre 名を導出する。
- dashboard / mypage の「ジャンル別内訳」が pivot するための旧
  activity_genres マスタ（6 ジャンル版）との橋渡しもここで行う。

参考: docs/calculation_logic.md
"""

from __future__ import annotations

from decimal import Decimal

# ベースポイント — 5/14 チーム合意
BASE_POINT_BY_LEVEL: dict[str, Decimal] = {
    "daily": Decimal("0.1"),
    "creative": Decimal("5"),
}

# 管理職判定: 課長以上を管理職とみなす（5/16 確定）
MANAGER_ROLES: frozenset[str] = frozenset({"課長", "部長", "役員"})

MANAGER_MULTIPLIER: Decimal = Decimal("3.0")
GENERAL_MULTIPLIER: Decimal = Decimal("1.0")

LEVELS: tuple[str, ...] = ("daily", "creative")
CATEGORIES: tuple[str, ...] = ("social", "safety", "future")

# {level}_{category} → 旧 activity_genres.name（6 ジャンル版）
CATEGORY_JA: dict[str, str] = {
    "social": "社会貢献",
    "safety": "安心安全",
    "future": "未来共創",
}
LEVEL_JA: dict[str, str] = {
    "daily": "日常",
    "creative": "創造",
}


def role_multiplier(role: str | None) -> Decimal:
    """役職から倍率を返す。管理職 3.0x / それ以外 1.0x。"""
    if role and role in MANAGER_ROLES:
        return MANAGER_MULTIPLIER
    return GENERAL_MULTIPLIER


def base_point(level: str | None) -> Decimal:
    if level is None:
        return Decimal("0")
    return BASE_POINT_BY_LEVEL.get(level, Decimal("0"))


def compute_final_point(level: str | None, role: str | None) -> Decimal:
    """最終ポイント = base_point(level) × role_multiplier(role)。"""
    return base_point(level) * role_multiplier(role)


def derived_genre_name(level: str | None, category: str | None) -> str | None:
    """新スキーマ (level, category) から旧 activity_genres.name を導出する。
    例: daily + social → "日常×社会貢献"。
    """
    if level not in LEVEL_JA or category not in CATEGORY_JA:
        return None
    return f"{LEVEL_JA[level]}×{CATEGORY_JA[category]}"


def parse_legacy_genre_name(name: str) -> tuple[str | None, str | None]:
    """旧 activity_genres.name を (level, category) に逆引き。
    越境×〜 は本スキーマに存在しないため (None, None) を返す（マイグレーションで削除対象）。
    """
    if "×" not in name:
        return None, None
    left, right = name.split("×", 1)
    level = {v: k for k, v in LEVEL_JA.items()}.get(left)
    category = {v: k for k, v in CATEGORY_JA.items()}.get(right)
    if left == "越境":
        return None, None
    return level, category
