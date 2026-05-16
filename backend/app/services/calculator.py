"""計算エンジン v7：3カテゴリ → 7風土 → 4 KPI → 中間層 → 売上効果

v5 → v7 変更点：
- 入力を 9セル → 3カテゴリに集約（social/safety/future）
- 9セル × 7風土 接続行列 M9_7 を 3カテゴリ × 7風土 M3_7 に平均化（option A）
- KPI_SCALE は維持（6,000P 投入時に 2026目標達成の感度）
- 6,000P を「3カテゴリに 2,000P ずつ」入れた場合、旧 9セルに 666P ずつ入れたときと
  数学的に等価（M3_7 が平均で、3 倍された P に 1/3 の係数を掛けるため打ち消し合う）

カスケード:
  3カテゴリ → 7風土 → 4個3層KPI → 中間層13個 → 売上ドライバー → 売上効果（メイン）
                                                                → ROIC/ROE（参考）
"""

from datetime import datetime
from typing import Any

from app.schemas.cascade import Edge, PointsInput, YearlyResult

# ════════════════════════════════════════════════════════════
# 西部ガスHD 財務基準値（FY2025 有報）
# ════════════════════════════════════════════════════════════
REVENUE_M = 254_442
OP_INCOME_M = 10_593
TAX_RATE = 0.325
EQUITY_M = 85_909
DEBT_M = 196_967
NET_INCOME_M = 5_400  # 純利益（FY2025 実績）

NOPAT_M = OP_INCOME_M * (1 - TAX_RATE)
INVESTED_CAP = EQUITY_M + DEBT_M

# ROIC: NOPAT / 投下資本（標準定義）
ROIC_CURRENT = NOPAT_M / INVESTED_CAP   # ≒ 2.53%

# ROE: Net Income / Equity（標準定義、NOPAT ではない）
ROE_CURRENT = NET_INCOME_M / EQUITY_M   # ≒ 6.3%

LEVERAGE = INVESTED_CAP / EQUITY_M       # ≒ 3.29

# ACT2027 公式目標
ROIC_TARGET_2027 = 0.023  # 2.3%
ROE_TARGET_2027 = 0.080   # 8.0%

# 営業利益率（売上→NOPAT 換算用）
OP_MARGIN = OP_INCOME_M / REVENUE_M     # ≒ 4.16%

# 売上効果メイン目標（v7: Excel 整合、Phase 1 = 6,000P 投入時のフルポテンシャル）
SALES_TARGET_M = 970
SALES_TARGET_OKU = 9.7
# 参考: Phase 別目標 (docs/calculation_logic.md §7 参照)
#   Phase 1 (1年, 6,000P)   : 売上 +9.7億 / ROIC +0.20pt / ROE +0.70pt
#   Phase 2 (3年, 20,000P)  : 売上 +32億  / ROIC +0.67pt / ROE +2.3pt
#   Phase 3 (10年, 40,000P) : 売上 +65億  / ROIC +1.34pt / ROE +4.7pt

# ════════════════════════════════════════════════════════════
# シート9：9セル → 7風土 接続行列（v5 合意済）
# ════════════════════════════════════════════════════════════
# 風土の順番: 心理的安全/挑戦/自律/学習/職務誇り/多様性/健康
HUDOS = ["shinri", "chosen", "jiritsu", "gakushu", "shokumu", "tayou", "kenkou"]
HUDO_NAMES = {
    "shinri": "心理的安全性の醸成",
    "chosen": "挑戦できる風土",
    "jiritsu": "自律と対話の文化",
    "gakushu": "学習・成長の文化",
    "shokumu": "職務への誇り・貢献実感",
    "tayou": "多様性を活かす文化",
    "kenkou": "健康で安心な職場環境",
}

# M9_7[cell][hudo] = 係数（旧 v5 接続行列、M3_7 の派生元として保持）
M9_7: dict[str, dict[str, float]] = {
    "daily_social": {"shinri": 0.3, "chosen": 0.2, "shokumu": 0.5},
    "daily_safety": {"shinri": 0.3, "shokumu": 0.3, "kenkou": 0.4},
    "daily_future": {"chosen": 0.3, "jiritsu": 0.3, "gakushu": 0.4},
    "cross_social": {"chosen": 0.2, "jiritsu": 0.4, "tayou": 0.4},
    "cross_safety": {"jiritsu": 0.3, "tayou": 0.4, "kenkou": 0.3},
    "cross_future": {"chosen": 0.4, "jiritsu": 0.3, "tayou": 0.3},
    "creative_social": {"chosen": 0.5, "gakushu": 0.3, "tayou": 0.2},
    "creative_safety": {"shinri": 0.2, "chosen": 0.5, "gakushu": 0.3},
    "creative_future": {"chosen": 0.5, "jiritsu": 0.2, "gakushu": 0.3},
}

CATEGORIES: tuple[str, ...] = ("social", "safety", "future")


def _derive_m3_7() -> dict[str, dict[str, float]]:
    """M9_7 を 3 カテゴリに平均集約。
    M3_7[cat][hudo] = mean_level(M9_7[f"{level}_{cat}"][hudo])。
    cat 毎に 3 セル（daily/cross/creative）の係数を単純平均する（option A）。
    """
    out: dict[str, dict[str, float]] = {}
    for cat in CATEGORIES:
        agg: dict[str, float] = {h: 0.0 for h in HUDOS}
        for level in ("daily", "cross", "creative"):
            cell = f"{level}_{cat}"
            for hudo, w in M9_7[cell].items():
                agg[hudo] += w
        out[cat] = {h: round(w / 3.0, 6) for h, w in agg.items() if w > 0}
    return out


# M3_7[category][hudo] = 係数（v7 — M9_7 の平均集約）
M3_7: dict[str, dict[str, float]] = _derive_m3_7()

# M7_4[hudo][kpi] = 係数
M7_4: dict[str, dict[str, float]] = {
    "shinri": {"eng": 0.5, "challenge": 0.2, "transform": 0.0, "retention": 0.3},
    "chosen": {"eng": 0.3, "challenge": 0.4, "transform": 0.3, "retention": 0.0},
    "jiritsu": {"eng": 0.3, "challenge": 0.3, "transform": 0.2, "retention": 0.2},
    "gakushu": {"eng": 0.3, "challenge": 0.2, "transform": 0.4, "retention": 0.1},
    "shokumu": {"eng": 0.5, "challenge": 0.0, "transform": 0.0, "retention": 0.5},
    "tayou": {"eng": 0.3, "challenge": 0.0, "transform": 0.4, "retention": 0.3},
    "kenkou": {"eng": 0.4, "challenge": 0.0, "transform": 0.0, "retention": 0.6},
}

# 各KPIごとのキャリブscale（均等配分 666.67P/セル × 9セル = 6,000P で 2026目標達成）
KPI_SCALE: dict[str, float] = {
    "eng": 0.18131,
    "challenge": 0.01519,
    "transform": 0.23596,
    "retention": 0.11707,
}

LAYER3_META: dict[str, tuple[Any, ...]] = {
    "eng": ("ENG指数", "%", 59.4, 65.0, ["all", "challenge"], "★", "従業員エンゲージメント"),
    "challenge": ("挑戦指数", "スコア", 3.46, 3.75, ["all", "challenge"], "★", "挑戦・学習意欲"),
    "transform": (
        "変革人財割合",
        "%",
        15.0,
        20.0,
        ["all", "challenge"],
        "★",
        "変革人財定義（要確認）",
    ),
    "retention": ("定着率", "%", 95.8, 98.0, ["all", "safety"], "★", "新卒3年定着率"),
}

# ════════════════════════════════════════════════════════════
# 中間層メタ情報
# ════════════════════════════════════════════════════════════
MID_META: dict[str, tuple[Any, ...]] = {
    # サーベイ由来10個（v6: poc を region に統合し、プレゼン/アブセンを追加）
    "safety_zero": ("保安事故ゼロ継続", "件", 0, 0, ["all", "safety"], "★★", "重大事故ゼロ継続"),
    "co2": ("CO2削減貢献量", "万t", 60, 87, ["all"], "★", "Scope 1+2"),
    "jcsi": ("JCSI", "年連続", 4, 5, ["all"], "★★★", "Fornell 2006"),
    "ltv": ("顧客LTV", "千円/戸", 240, 280, ["all"], "★★★", "Gupta&Lehmann"),
    "region": ("地域共創力", "件", 10, 15, ["all"], "★★★", "Ikuta&Fujii 2025（PoC を統合）"),
    "esg": ("ESG評価", "指数", 3, 5, ["all"], "★★★", "Wilberg 2025"),
    "recruit": ("採用・定着力", "%", 95.8, 98.0, ["all", "safety"], "★★", "Li et al.2022"),
    "safety_brand": ("保安ブランド", "件", 0, 0, ["all", "safety"], "★★★", "柳・今野2024"),
    "presenteeism": (
        "プレゼンティーイズム",
        "%",
        80.0,
        85.0,
        ["all", "safety"],
        "★★",
        "発揮度。経産省・SAP事例",
    ),
    "absenteeism": (
        "アブセンティーイズム",
        "日",
        1.70,
        1.50,
        ["all", "safety"],
        "★★",
        "年間欠勤日数。ISO30414準拠",
    ),
    # 実カウント型（v5: 仮係数で計算するが、図では「点線関連」として表現）
    "dx_core": ("DXコア人財数", "名", 200, 650, ["all", "challenge"], "★★", "ACT2027目標"),
    "reskill": ("リスキル実践者数", "名", 43, 2000, ["all", "challenge"], "★", "ACT2027目標"),
    "renewable_mid": ("再エネ取扱量", "万kW", 9.2, 13.0, ["all"], "★★★", "CN戦略"),
}

# ════════════════════════════════════════════════════════════
# 3層→中間層 行列（サーベイ由来9個）
# ════════════════════════════════════════════════════════════
LAYER3_TO_MID: list[tuple[str, str, float, str, str]] = [
    ("eng", "safety_zero", 0.30, "★★", "Gallup 2020"),
    ("retention", "safety_zero", 0.10, "★", "仮置き"),
    ("transform", "co2", 0.15, "★", "仮置き"),
    ("eng", "jcsi", 0.08, "★★★", "Gallup × Fornell"),
    ("retention", "jcsi", 0.08, "★★★", "Park&Shaw × Fornell"),
    ("eng", "ltv", 0.06, "★★★", "Gallup × Gupta&Lehmann"),
    ("retention", "ltv", 0.06, "★★★", "Park&Shaw × Gupta&Lehmann"),
    ("eng", "region", 0.04, "★", "仮置き"),
    ("transform", "region", 0.10, "★★", "類推"),
    ("eng", "esg", 0.10, "★★★", "Gallup × Wilberg"),
    ("transform", "esg", 0.15, "★", "仮置き"),
    ("retention", "esg", 0.05, "★", "仮置き"),
    ("eng", "recruit", 0.05, "★★", "Gallup類推"),
    ("retention", "recruit", 0.30, "★★★", "Li et al.2022"),
    ("eng", "safety_brand", 0.12, "★★★", "Gallup × 柳・今野"),
    ("retention", "safety_brand", 0.04, "★", "仮置き"),
    # v6: プレゼンティーイズム経路（ENG・定着が主因）
    ("eng", "presenteeism", 0.20, "★★", "Gallup × SAP事例（健康文化指数→営業利益）"),
    ("retention", "presenteeism", 0.10, "★", "仮置き"),
    # v6: アブセンティーイズム経路（定着率が主因）
    ("retention", "absenteeism", 0.30, "★★", "ISO30414準拠"),
    ("eng", "absenteeism", 0.10, "★", "仮置き"),
]

# 3層→実カウント（点線関連、係数は仮置き）
LAYER3_TO_MID_COUNT: list[tuple[str, str, float, str, str]] = [
    ("eng", "dx_core", 0.5, "★", "学習文化からの関連（仮）"),
    ("transform", "dx_core", 0.3, "★", "変革人財との関連（仮）"),
    ("transform", "reskill", 0.5, "★", "変革人財との関連（仮）"),
    ("eng", "reskill", 0.3, "★", "学習文化からの関連（仮）"),
    ("transform", "renewable_mid", 0.4, "★", "脱炭素人財との関連（仮）"),
]

# ════════════════════════════════════════════════════════════
# 中間層 → 財務 行列  (revenue, cost, capital)
# ════════════════════════════════════════════════════════════
MID_TO_FIN: dict[str, tuple[float, float, float]] = {
    "safety_zero": (0.015, 0.012, 0.074),
    "renewable_mid": (0.035, 0.015, 0.075),
    "co2": (0.009, 0.004, 0.058),
    "jcsi": (0.035, 0.025, 0.025),
    "ltv": (0.030, 0.010, 0.040),
    # v6: PoC を統合した分、地域共創力の重みを微増
    "region": (0.080, 0.020, 0.060),
    "esg": (0.230, 0.100, 0.130),
    "recruit": (0.060, 0.120, 0.140),
    "safety_brand": (0.020, 0.030, 0.120),
    # v6: プレゼンティーイズム — 3,500人 × 75万損失/年 = 26億/年 → 5%改善で 1.3億/年（売上換算 0.5%）
    "presenteeism": (0.030, 0.080, 0.000),
    # v6: アブセンティーイズム — 欠勤・代替要員費の直接削減
    "absenteeism": (0.005, 0.040, 0.000),
    "dx_core": (0.020, 0.040, 0.030),
    "reskill": (0.040, 0.070, 0.050),
}

FIN_RELIABILITY: dict[str, str] = {
    "safety_zero": "★★",
    "renewable_mid": "★★★",
    "co2": "★",
    "jcsi": "★★★",
    "ltv": "★★★",
    "region": "★★★",
    "esg": "★★★",
    "recruit": "★★★",
    "safety_brand": "★★★",
    "presenteeism": "★★",
    "absenteeism": "★★",
    "dx_core": "★",
    "reskill": "★",
}

# ════════════════════════════════════════════════════════════
# Excel ベース校正係数（v7）
# ════════════════════════════════════════════════════════════
# 6,000P 投入時の cascade 出力（revenue, cost, capital ドライバー）を、
# Excel Sheet 10「財務ドライバー寄与率」と整合させるための変換係数。
# 出典: 西部ガス_計算ロジック_ポイント.xlsx Sheet 10
#
# Excel 値（6,000P 投入時）:
#   売上効果       : +9.7  億円 (revenue 寄与  0.384% × 2,544 億)
#   コスト削減     : +5.4  億円 (cost    寄与  0.214% × 2,544 億)
#   資本効率化     : +59.4 億円 (capital 寄与  2.10%  × 2,829 億)
#
# 実装の cascade 出力（6,000P 投入時、2025-05-16 計測）:
#   revenue: 0.1294
#   cost   : 0.1495
#   capital: 0.1712
#
# 校正ファクタ = Excel 値 / (driver × ベース)
#   EXCEL_REVENUE_FACTOR = 970 M / (0.1294 × 254,442 M) = 0.02948
#   EXCEL_COST_FACTOR    = 540 M / (0.1495 × 254,442 M) = 0.01420
#   EXCEL_CAPITAL_FACTOR = 5,940 M / (0.1712 × 282,876 M) = 0.12264
EXCEL_REVENUE_FACTOR = 0.02948
EXCEL_COST_FACTOR = 0.01420
EXCEL_CAPITAL_FACTOR = 0.12264


# ════════════════════════════════════════════════════════════
# 内部構造体
# ════════════════════════════════════════════════════════════


class KpiResult:
    __slots__ = (
        "calc_id",
        "name",
        "unit",
        "current",
        "target",
        "projected",
        "improvement",
        "achievement",
        "reliability",
        "tabs",
        "description",
    )

    def __init__(
        self,
        calc_id,
        name,
        unit,
        current,
        target,
        projected,
        improvement,
        achievement,
        reliability,
        tabs,
        description,
    ):
        self.calc_id = calc_id
        self.name = name
        self.unit = unit
        self.current = current
        self.target = target
        self.projected = projected
        self.improvement = improvement
        self.achievement = achievement
        self.reliability = reliability
        self.tabs = tabs
        self.description = description


class CascadeResult:
    """v7: 売上効果 / コスト削減 / 資本効率化 を Excel 整合の 億円 で持つ。"""

    def __init__(
        self,
        points,
        layer3,
        mid,
        drivers,
        sales_effect_m,
        sales_effect_oku,
        cost_savings_m,
        cost_savings_oku,
        capital_savings_m,
        capital_savings_oku,
        roic_delta,
        roe_delta,
        yearly,
        connections,
    ):
        self.points = points
        self.layer3 = layer3
        self.mid = mid
        self.drivers = drivers
        self.sales_effect_m = sales_effect_m
        self.sales_effect_oku = sales_effect_oku
        self.cost_savings_m = cost_savings_m
        self.cost_savings_oku = cost_savings_oku
        self.capital_savings_m = capital_savings_m
        self.capital_savings_oku = capital_savings_oku
        self.roic_delta = roic_delta
        self.roe_delta = roe_delta
        self.yearly = yearly
        self.connections = connections
        self.updated_at = datetime.now().isoformat()


# ════════════════════════════════════════════════════════════
# 計算ロジック（v5）
# ════════════════════════════════════════════════════════════


def _calc_layer3(points: PointsInput) -> dict[str, KpiResult]:
    """3カテゴリ × M3_7 × M7_4 × scale → 4個3層KPI改善量。

    旧 9 セル時代との互換: 同じ 6,000P 投入なら M3_7 が M9_7 の平均なので結果は等価。
    """
    out: dict[str, KpiResult] = {}
    p_dict = points.as_dict()

    for kpi_id in ["eng", "challenge", "transform", "retention"]:
        improvement = 0.0
        for cat, hudo_w in M3_7.items():
            p = float(p_dict.get(cat, 0))
            if p == 0:
                continue
            # raw_coef_for_kpi = sum_h(M3_7[cat, h] * M7_4[h, kpi])
            raw_coef = sum(hw * M7_4[h][kpi_id] for h, hw in hudo_w.items())
            improvement += (p / 100) * raw_coef * KPI_SCALE[kpi_id]

        name, unit, current, target, tabs, rel, desc = LAYER3_META[kpi_id]
        projected = current + improvement
        diff = target - current
        achievement = improvement / diff if diff != 0 else 0.0
        out[kpi_id] = KpiResult(
            kpi_id,
            name,
            unit,
            current,
            target,
            projected,
            improvement,
            achievement,
            rel,
            tabs,
            desc,
        )
    return out


def _calc_mid(layer3: dict[str, KpiResult]) -> dict[str, KpiResult]:
    """3層 × LAYER3_TO_MID = 中間層13個（達成率）"""
    boosts = {}
    # サーベイ由来10個（v6: poc を region に統合し、プレゼン/アブセンを追加）
    survey_ids = {
        "safety_zero",
        "co2",
        "jcsi",
        "ltv",
        "region",
        "esg",
        "recruit",
        "safety_brand",
        "presenteeism",
        "absenteeism",
    }
    for mid_id in survey_ids:
        boosts[mid_id] = 0.0
    for from_id, to_id, coef, _, _ in LAYER3_TO_MID:
        if from_id in layer3 and to_id in survey_ids:
            boosts[to_id] += layer3[from_id].achievement * coef

    # 実カウント3個（点線関連）
    count_ids = {"dx_core", "reskill", "renewable_mid"}
    for mid_id in count_ids:
        boosts[mid_id] = 0.0
    for from_id, to_id, coef, _, _ in LAYER3_TO_MID_COUNT:
        if from_id in layer3 and to_id in count_ids:
            boosts[to_id] += layer3[from_id].achievement * coef

    out = {}
    for mid_id, boost in boosts.items():
        name, unit, current, target, tabs, rel, desc = MID_META[mid_id]
        diff = target - current
        improvement = diff * boost if diff != 0 else 0.0
        projected = current + improvement
        out[mid_id] = KpiResult(
            mid_id, name, unit, current, target, projected, improvement, boost, rel, tabs, desc
        )
    return out


def _calc_financial(
    mid: dict[str, KpiResult],
) -> tuple[dict[str, float], float, float, float, float, float, float, float, float]:
    """中間層 → 売上効果 / コスト削減 / 資本効率化 → ΔROIC / ΔROE（v7: Excel 整合）

    - 売上効果       = revenue × REVENUE_M × EXCEL_REVENUE_FACTOR
    - コスト削減     = cost    × REVENUE_M × EXCEL_COST_FACTOR
    - 資本効率化     = capital × INVESTED_CAP × EXCEL_CAPITAL_FACTOR
    - ROIC_new       = (NOPAT + 売上NOPAT寄与 + コストNOPAT寄与) / (INVESTED_CAP - 資本効率改善)
        ・売上NOPAT寄与 = sales_effect_m × OP_MARGIN × (1 - TAX_RATE)
        ・コストNOPAT寄与 = cost_savings_m × (1 - TAX_RATE)
    - ROE_new        = ROIC_new × LEVERAGE
    """
    revenue = cost = capital = 0.0
    for mid_id, node in mid.items():
        if mid_id not in MID_TO_FIN:
            continue
        rc, cc, kc = MID_TO_FIN[mid_id]
        revenue += node.achievement * rc
        cost += node.achievement * cc
        capital += node.achievement * kc

    drivers = {"revenue": revenue, "cost": cost, "capital": capital}

    # 3 経路の財務効果（Excel Sheet 10 整合）
    sales_effect_m = revenue * REVENUE_M * EXCEL_REVENUE_FACTOR
    sales_effect_oku = sales_effect_m / 100
    cost_savings_m = cost * REVENUE_M * EXCEL_COST_FACTOR
    cost_savings_oku = cost_savings_m / 100
    capital_savings_m = capital * INVESTED_CAP * EXCEL_CAPITAL_FACTOR
    capital_savings_oku = capital_savings_m / 100

    # ROIC: 売上 → NOPAT, コスト → NOPAT, 資本効率 → 投下資本減
    nopat_from_sales = sales_effect_m * OP_MARGIN * (1 - TAX_RATE)
    nopat_from_cost = cost_savings_m * (1 - TAX_RATE)
    new_nopat = NOPAT_M + nopat_from_sales + nopat_from_cost
    new_invested_cap = INVESTED_CAP - capital_savings_m
    new_roic = new_nopat / new_invested_cap if new_invested_cap > 0 else ROIC_CURRENT
    roic_delta = new_roic - ROIC_CURRENT

    # ROE: ROIC × レバレッジ（Excel 整合）
    new_roe = new_roic * LEVERAGE
    roe_current_proxy = ROIC_CURRENT * LEVERAGE
    roe_delta = new_roe - roe_current_proxy

    return (
        drivers,
        sales_effect_m,
        sales_effect_oku,
        cost_savings_m,
        cost_savings_oku,
        capital_savings_m,
        capital_savings_oku,
        roic_delta,
        roe_delta,
    )


def _build_yearly(roic_delta: float, roe_delta: float) -> list[YearlyResult]:
    base = 2024
    return [
        YearlyResult(
            year=year,
            roic=ROIC_CURRENT + roic_delta * (year - base) / 5,
            roe=ROE_CURRENT + roe_delta * (year - base) / 5,
            roic_delta=roic_delta * (year - base) / 5,
            roe_delta=roe_delta * (year - base) / 5,
        )
        for year in range(2025, 2031)
    ]


def _build_connections() -> list[Edge]:
    edges = []
    # 3カテゴリ → 7風土（M9_7 を平均集約した M3_7）
    for cat, hudo_w in M3_7.items():
        for h, w in hudo_w.items():
            edges.append(
                Edge(
                    from_id=cat,
                    to_id=h,
                    coefficient=w,
                    reliability="★",
                    citation="接続行列3×7（M9_7 平均、仮）",
                )
            )
    # 7風土 → 4 KPI
    for h, kpi_w in M7_4.items():
        for k, w in kpi_w.items():
            if w > 0:
                edges.append(
                    Edge(
                        from_id=h,
                        to_id=k,
                        coefficient=w,
                        reliability="★",
                        citation="接続行列7×4（仮）",
                    )
                )
    # 3層 → 中間層
    for from_id, to_id, coef, rel, citation in LAYER3_TO_MID:
        edges.append(
            Edge(from_id=from_id, to_id=to_id, coefficient=coef, reliability=rel, citation=citation)
        )
    # 3層 → 実カウント中間層（点線関連）
    for from_id, to_id, coef, rel, citation in LAYER3_TO_MID_COUNT:
        edges.append(
            Edge(from_id=from_id, to_id=to_id, coefficient=coef, reliability=rel, citation=citation)
        )
    # 中間層 → 財務ドライバー
    for mid_id, (rc, cc, kc) in MID_TO_FIN.items():
        rel = FIN_RELIABILITY[mid_id]
        if rc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="revenue", coefficient=rc, reliability=rel))
        if cc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="cost", coefficient=cc, reliability=rel))
        if kc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="capital", coefficient=kc, reliability=rel))
    # v7: 売上ドライバー → 売上効果 / コスト → コスト削減 / 資本 → 資本効率化
    # 係数は Excel ベースの校正ファクタ × 該当ベース（売上 or 投下資本）。
    edges.append(
        Edge(
            from_id="revenue",
            to_id="sales_effect",
            coefficient=EXCEL_REVENUE_FACTOR * REVENUE_M / 100,
            reliability="★★",
            citation="Excel Sheet 10: 売上効果 = revenue × 売上 × 0.02948",
        )
    )
    edges.append(
        Edge(
            from_id="cost",
            to_id="cost_savings",
            coefficient=EXCEL_COST_FACTOR * REVENUE_M / 100,
            reliability="★★",
            citation="Excel Sheet 10: コスト削減 = cost × 売上 × 0.01420",
        )
    )
    edges.append(
        Edge(
            from_id="capital",
            to_id="capital_savings",
            coefficient=EXCEL_CAPITAL_FACTOR * INVESTED_CAP / 100,
            reliability="★★",
            citation="Excel Sheet 10: 資本効率化 = capital × 投下資本 × 0.12264",
        )
    )
    # v7: 売上効果 → ROIC（NOPAT 寄与）
    edges.append(
        Edge(
            from_id="sales_effect",
            to_id="roic",
            coefficient=OP_MARGIN * (1 - TAX_RATE) / INVESTED_CAP * REVENUE_M,
            reliability="★★★",
            citation="ΔROIC ⊃ ΔSales × OP_MARGIN × (1-TaxRate) / 投下資本",
        )
    )
    # v7: コスト削減 → ROIC（NOPAT 寄与）
    edges.append(
        Edge(
            from_id="cost_savings",
            to_id="roic",
            coefficient=(1 - TAX_RATE) / INVESTED_CAP * REVENUE_M,
            reliability="★★★",
            citation="ΔROIC ⊃ ΔCost × (1-TaxRate) / 投下資本",
        )
    )
    # v7: 資本効率化 → ROIC（投下資本減）
    edges.append(
        Edge(
            from_id="capital_savings",
            to_id="roic",
            coefficient=1.0,
            reliability="★★★",
            citation="ΔROIC ⊃ NOPAT × ΔCapital / (投下資本 × 投下資本_new)",
        )
    )
    # v7: ROIC → ROE = ROIC × レバレッジ
    edges.append(
        Edge(
            from_id="roic",
            to_id="roe",
            coefficient=LEVERAGE,
            reliability="★★★",
            citation="ROE = ROIC × レバレッジ (3.29)",
        )
    )
    return edges


def calculate(points: PointsInput) -> CascadeResult:
    """v7: 3カテゴリ → 売上効果 / コスト削減 / 資本効率化 → ROIC/ROE（Excel 整合）"""
    layer3 = _calc_layer3(points)
    mid = _calc_mid(layer3)
    (
        drivers,
        sales_m,
        sales_oku,
        cost_m,
        cost_oku,
        capital_m,
        capital_oku,
        roic_delta,
        roe_delta,
    ) = _calc_financial(mid)
    yearly = _build_yearly(roic_delta, roe_delta)
    connections = _build_connections()
    return CascadeResult(
        points=points,
        layer3=layer3,
        mid=mid,
        drivers=drivers,
        sales_effect_m=sales_m,
        sales_effect_oku=sales_oku,
        cost_savings_m=cost_m,
        cost_savings_oku=cost_oku,
        capital_savings_m=capital_m,
        capital_savings_oku=capital_oku,
        roic_delta=roic_delta,
        roe_delta=roe_delta,
        yearly=yearly,
        connections=connections,
    )
