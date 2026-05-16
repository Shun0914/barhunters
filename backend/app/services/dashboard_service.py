"""ダッシュボード集計サービス（PR-B）。

3 つのカード分の集計関数を提供する：
  - aggregate_active_rate   : アクティブ率（累積モデル）
  - aggregate_one_on_one    : 1on1 件数（pair_type 別）
  - aggregate_points_summary: 合計ポイント + 年間目標

設計メモ：
- 期間は「FY 頭（4/1）〜 選択月末」の累積。前月比は同 FY 内の前月との差。
- アクティブ率の分子: 期間内に decided_at が入る status='approved' の distinct 申請者数
- アクティブ率の分母: 対象 org_id に所属する users の総数
- vs_company（全社平均比）: 対象が全 org と一致する場合は None
- MVP: company / hq クエリは API で受けるが DB レベルでは無視し、departments[]
  （= Organization.name）でのみ絞り込む。本格的な組織ツリー反映は後続 PR。
"""

from __future__ import annotations

import re
from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models import OneOnOne, Organization, PointApplication, User

# 部署別の年間目標値（P）。未登録の部署は "default" を使う。
ANNUAL_TARGETS: dict[str, int] = {
    "default": 6000,
}

_FY_RE = re.compile(r"^FY\d{4}$")


def normalize_fy(fy: str) -> str:
    """クエリ fy を正規化し、形式チェックする。不正時は ValueError。"""
    s = fy.strip()
    if _FY_RE.fullmatch(s) is None:
        raise ValueError("fy は FY2026 の形式で指定してください（FY に続けて4桁の年）")
    y = int(s[2:])
    if not 2000 <= y <= 2100:
        raise ValueError("fy の年は 2000〜2100 の範囲で指定してください")
    return s


# ════════════════════════════════════════════════════════════
# 期間ヘルパ
# ════════════════════════════════════════════════════════════


def period_from_fy_month(fy: str, month: int) -> tuple[date, date]:
    """FY と月 から累積期間 (start, end) を返す。

    FY 表記は "FY2026" 等。日本会計年度（4 月始まり）。
    例: FY2026, month=5 → (2026-04-01, 2026-05-31)
        FY2026, month=2 → (2026-04-01, 2027-02-28)
    """
    fy_year = int(normalize_fy(fy)[2:])
    start = date(fy_year, 4, 1)
    end_year = fy_year if month >= 4 else fy_year + 1
    last_day = monthrange(end_year, month)[1]
    end = date(end_year, month, last_day)
    return start, end


def prev_period(fy: str, month: int) -> tuple[str, int] | None:
    """選択月の前月。FY 頭（4 月）には前月が無いので None を返す。"""
    if month == 4:
        return None
    prev_month = month - 1 if month > 1 else 12
    return (fy, prev_month)


# ════════════════════════════════════════════════════════════
# 組織解決
# ════════════════════════════════════════════════════════════


def resolve_org_ids(
    session: Session,
    *,
    departments: list[str] | None = None,
) -> list[str]:
    """MVP の組織絞り込み：departments[] が空なら全 org_id、非空なら name 一致のみ。

    company / hq は API では受けるが DB レベルでは未対応（本格対応は後続 PR）。
    """
    if departments:
        return list(
            session.scalars(
                select(Organization.id).where(Organization.name.in_(departments))
            ).all()
        )
    return list(session.scalars(select(Organization.id)).all())


def _all_org_ids(session: Session) -> list[str]:
    return list(session.scalars(select(Organization.id)).all())


# ════════════════════════════════════════════════════════════
# アクティブ率
# ════════════════════════════════════════════════════════════


def _raw_active_rate(
    session: Session, org_ids: list[str], start: date, end: date
) -> float:
    """期間 [start, end] の累積アクティブ率（%）。再帰呼び出し対策の内部関数。"""
    if not org_ids:
        return 0.0
    end_exclusive = end + timedelta(days=1)
    numerator = session.scalar(
        select(func.count(distinct(PointApplication.applicant_user_id)))
        .join(User, User.id == PointApplication.applicant_user_id)
        .where(
            PointApplication.status == "approved",
            PointApplication.decided_at >= start,
            PointApplication.decided_at < end_exclusive,
            User.org_id.in_(org_ids),
        )
    ) or 0
    denominator = (
        session.scalar(
            select(func.count()).select_from(User).where(User.org_id.in_(org_ids))
        )
        or 0
    )
    if denominator == 0:
        return 0.0
    return (numerator / denominator) * 100


def aggregate_active_rate(
    session: Session, org_ids: list[str], fy: str, month: int
) -> dict:
    """アクティブ率カードの集計。返り値の mom/vs_company は None あり。"""
    start, end = period_from_fy_month(fy, month)
    rate = _raw_active_rate(session, org_ids, start, end)

    # 前月比（FY 頭は None）
    prev = prev_period(fy, month)
    if prev is None:
        mom: float | None = None
    else:
        prev_start, prev_end = period_from_fy_month(prev[0], prev[1])
        prev_rate = _raw_active_rate(session, org_ids, prev_start, prev_end)
        mom = rate - prev_rate

    # 全社平均比（対象が全 org と一致する場合は None）
    all_ids = _all_org_ids(session)
    vs_company: float | None
    if set(org_ids) == set(all_ids):
        vs_company = None
    else:
        company_rate = _raw_active_rate(session, all_ids, start, end)
        vs_company = rate - company_rate

    return {"rate": rate, "mom": mom, "vs_company": vs_company}


# ════════════════════════════════════════════════════════════
# 1on1 件数
# ════════════════════════════════════════════════════════════

_ONE_ON_ONE_KEYS = ("seniorToLead", "leadToChief", "leadToGeneral", "chiefToGeneral")


def aggregate_one_on_one(
    session: Session, org_ids: list[str], fy: str, month: int
) -> dict:
    """1on1 カードの集計。pair_type 別件数 + 合計。"""
    breakdown: dict[str, int] = {k: 0 for k in _ONE_ON_ONE_KEYS}
    if not org_ids:
        return {"breakdown": breakdown, "total": 0}

    start, end = period_from_fy_month(fy, month)
    end_exclusive = end + timedelta(days=1)

    rows = session.execute(
        select(OneOnOne.pair_type, func.count(OneOnOne.id))
        .join(User, User.id == OneOnOne.recorder_id)
        .where(
            OneOnOne.conducted_at >= start,
            OneOnOne.conducted_at < end_exclusive,
            User.org_id.in_(org_ids),
        )
        .group_by(OneOnOne.pair_type)
    ).all()
    total_all = sum(int(c) for _pt, c in rows)
    for pair_type, count in rows:
        if pair_type in breakdown:
            breakdown[pair_type] = int(count)

    # 凡例外の pair_type も DB 実件として total に反映（breakdown には載せない）
    return {"breakdown": breakdown, "total": total_all}


# ════════════════════════════════════════════════════════════
# 合計ポイント
# ════════════════════════════════════════════════════════════


def aggregate_points_summary(
    session: Session,
    org_ids: list[str],
    fy: str,
    month: int,
    *,
    dept_name: str | None = None,
) -> dict:
    """合計ポイントカードの集計。期間累積合計 + 年間目標値。"""
    annual_target = ANNUAL_TARGETS.get(dept_name or "default", ANNUAL_TARGETS["default"])
    if not org_ids:
        return {"total": 0, "annual_target": annual_target}

    start, end = period_from_fy_month(fy, month)
    end_exclusive = end + timedelta(days=1)
    total = (
        session.scalar(
            select(func.coalesce(func.sum(PointApplication.points), 0))
            .join(User, User.id == PointApplication.applicant_user_id)
            .where(
                PointApplication.status == "approved",
                PointApplication.decided_at >= start,
                PointApplication.decided_at < end_exclusive,
                User.org_id.in_(org_ids),
            )
        )
        or 0
    )

    return {"total": int(total), "annual_target": annual_target}
