"""指標メタ（説明文・目標値）の JSON 配信サービス。

業務オーナーが文言を更新する際にフロントを触らずに済むよう、
`backend/data/indicator_meta.json` を単一の正として配信する。

プロセス内 lru_cache（サイズ 1）で 1 回だけ読み込み、以降はメモリから返す。
再読込が必要な場合はプロセス再起動。
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException, status

# backend/data/indicator_meta.json の絶対パス。
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "indicator_meta.json"


@lru_cache(maxsize=1)
def load_indicator_meta() -> dict:
    """JSON を読んで dict を返す。プロセス内キャッシュ。"""
    if not DATA_PATH.is_file():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"indicator meta file not found: {DATA_PATH}",
        )
    try:
        with open(DATA_PATH, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"invalid indicator meta JSON: {e}",
        ) from e
