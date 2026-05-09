"""計算エンジン v5：9セル → 7風土 → 4 KPI → 中間層 → 売上効果

v4 → v5 変更点：
- 入力を 5フィールド → 9セル（3アクション × 3カテゴリ）
- 9セル × 7風土 接続行列（M9_7）
- 7風土 × 4 KPI 接続行列（M7_4）
- 各KPIごとに均等配分（6,000P）でキャリブ済の scale を保持
- 売上キャリブは日常重視配分で6,000P=売上+6億円になるよう調整

カスケード:
  9セル → 7風土 → 4個3層KPI → 中間層13個 → 売上ドライバー → 売上効果（メイン）
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

NOPAT_M = OP_INCOME_M * (1 - TAX_RATE)
INVESTED_CAP = EQUITY_M + DEBT_M
ROIC_CURRENT = NOPAT_M / INVESTED_CAP
ROE_CURRENT = NOPAT_M / EQUITY_M
LEVERAGE = INVESTED_CAP / EQUITY_M

ROIC_TARGET_2027 = 0.023
ROE_TARGET_2027 = 0.080

# v5: 売上効果メイン目標
SALES_TARGET_M = 600
SALES_TARGET_OKU = 6.0

# ════════════════════════════════════════════════════════════
# シート9：9セル → 7風土 接続行列（v5 合意済）
# ════════════════════════════════════════════════════════════
# 風土の順番: 心理的安全/挑戦/自律/学習/職務誇り/多様性/健康
HUDOS = ["shinri", "chosen", "jiritsu", "gakushu", "shokumu", "tayou", "kenkou"]
HUDO_NAMES = {
    "shinri":  "心理的安全性の醸成",
    "chosen":  "挑戦できる風土",
    "jiritsu": "自律と対話の文化",
    "gakushu": "学習・成長の文化",
    "shokumu": "職務への誇り・貢献実感",
    "tayou":   "多様性を活かす文化",
    "kenkou":  "健康で安心な職場環境",
}

# M9_7[cell][hudo] = 係数
M9_7: dict[str, dict[str, float]] = {
    "daily_social":    {"shinri": 0.3, "chosen": 0.2, "shokumu": 0.5},
    "daily_safety":    {"shinri": 0.3, "shokumu": 0.3, "kenkou": 0.4},
    "daily_future":    {"chosen": 0.3, "jiritsu": 0.3, "gakushu": 0.4},
    "cross_social":    {"chosen": 0.2, "jiritsu": 0.4, "tayou": 0.4},
    "cross_safety":    {"jiritsu": 0.3, "tayou": 0.4, "kenkou": 0.3},
    "cross_future":    {"chosen": 0.4, "jiritsu": 0.3, "tayou": 0.3},
    "creative_social": {"chosen": 0.5, "gakushu": 0.3, "tayou": 0.2},
    "creative_safety": {"shinri": 0.2, "chosen": 0.5, "gakushu": 0.3},
    "creative_future": {"chosen": 0.5, "jiritsu": 0.2, "gakushu": 0.3},
}

# M7_4[hudo][kpi] = 係数
M7_4: dict[str, dict[str, float]] = {
    "shinri":  {"eng": 0.5, "challenge": 0.2, "transform": 0.0, "retention": 0.3},
    "chosen":  {"eng": 0.3, "challenge": 0.4, "transform": 0.3, "retention": 0.0},
    "jiritsu": {"eng": 0.3, "challenge": 0.3, "transform": 0.2, "retention": 0.2},
    "gakushu": {"eng": 0.3, "challenge": 0.2, "transform": 0.4, "retention": 0.1},
    "shokumu": {"eng": 0.5, "challenge": 0.0, "transform": 0.0, "retention": 0.5},
    "tayou":   {"eng": 0.3, "challenge": 0.0, "transform": 0.4, "retention": 0.3},
    "kenkou":  {"eng": 0.4, "challenge": 0.0, "transform": 0.0, "retention": 0.6},
}

# 各KPIごとのキャリブscale（均等配分 666.67P/セル × 9セル = 6,000P で 2026目標達成）
KPI_SCALE: dict[str, float] = {
    "eng":       0.18131,
    "challenge": 0.01519,
    "transform": 0.23596,
    "retention": 0.11707,
}

LAYER3_META: dict[str, tuple[Any, ...]] = {
    "eng":       ("ENG指数",         "%",     59.4, 65.0, ["all", "challenge"], "★",  "従業員エンゲージメント"),
    "challenge": ("挑戦指数",        "スコア", 3.46, 3.75, ["all", "challenge"], "★",  "挑戦・学習意欲"),
    "transform": ("変革人財割合",    "%",     15.0, 20.0, ["all", "challenge"], "★",  "変革人財定義（要確認）"),
    "retention": ("定着率",          "%",     95.8, 98.0, ["all", "safety"],    "★",  "新卒3年定着率"),
}

# ════════════════════════════════════════════════════════════
# 中間層メタ情報
# ════════════════════════════════════════════════════════════
MID_META: dict[str, tuple[Any, ...]] = {
    # サーベイ由来9個
    "safety_zero":   ("保安事故ゼロ継続","件",     0,    0,    ["all", "safety"],    "★★",  "重大事故ゼロ継続"),
    "poc":           ("共創PoC件数",    "件",   10,   15,   ["all", "challenge"], "★★",  "TOMOSHIBI連動"),
    "co2":           ("CO2削減貢献量", "万t",   60,   87,   ["all"],              "★",   "Scope 1+2"),
    "jcsi":          ("JCSI",           "年連続", 4,    5,    ["all"],              "★★★","Fornell 2006"),
    "ltv":           ("顧客LTV",        "千円/戸",240, 280,  ["all"],              "★★★","Gupta&Lehmann"),
    "region":        ("地域共創力",     "件",   10,   15,   ["all"],              "★★★","Ikuta&Fujii 2025"),
    "esg":           ("ESG評価",        "指数",  3,    5,    ["all"],              "★★★","Wilberg 2025"),
    "recruit":       ("採用・定着力",   "%",    95.8, 98.0, ["all", "safety"],    "★★",  "Li et al.2022"),
    "safety_brand":  ("保安ブランド",   "件",    0,    0,    ["all", "safety"],    "★★★","柳・今野2024"),
    # 実カウント型（v5: 仮係数で計算するが、図では「点線関連」として表現）
    "dx_core":       ("DXコア人財数",  "名",   200,  650,  ["all", "challenge"], "★★", "ACT2027目標"),
    "reskill":       ("リスキル実践者数","名", 43,  2000, ["all", "challenge"], "★",   "ACT2027目標"),
    "renewable_mid": ("再エネ取扱量",  "万kW", 9.2, 13.0, ["all"],              "★★★","CN戦略"),
}

# ════════════════════════════════════════════════════════════
# 3層→中間層 行列（サーベイ由来9個）
# ════════════════════════════════════════════════════════════
LAYER3_TO_MID: list[tuple[str, str, float, str, str]] = [
    ("eng",       "safety_zero",  0.30, "★★",  "Gallup 2020"),
    ("retention", "safety_zero",  0.10, "★",   "仮置き"),
    ("eng",       "poc",          0.10, "★",   "仮置き"),
    ("challenge", "poc",          0.20, "★",   "仮置き"),
    ("transform", "poc",          0.25, "★",   "仮置き"),
    ("transform", "co2",          0.15, "★",   "仮置き"),
    ("eng",       "jcsi",         0.08, "★★★","Gallup × Fornell"),
    ("retention", "jcsi",         0.08, "★★★","Park&Shaw × Fornell"),
    ("eng",       "ltv",          0.06, "★★★","Gallup × Gupta&Lehmann"),
    ("retention", "ltv",          0.06, "★★★","Park&Shaw × Gupta&Lehmann"),
    ("eng",       "region",       0.04, "★",   "仮置き"),
    ("transform", "region",       0.10, "★★", "類推"),
    ("eng",       "esg",          0.10, "★★★","Gallup × Wilberg"),
    ("transform", "esg",          0.15, "★",   "仮置き"),
    ("retention", "esg",          0.05, "★",   "仮置き"),
    ("eng",       "recruit",      0.05, "★★", "Gallup類推"),
    ("retention", "recruit",      0.30, "★★★","Li et al.2022"),
    ("eng",       "safety_brand", 0.12, "★★★","Gallup × 柳・今野"),
    ("retention", "safety_brand", 0.04, "★",   "仮置き"),
]

# 3層→実カウント（点線関連、係数は仮置き）
LAYER3_TO_MID_COUNT: list[tuple[str, str, float, str, str]] = [
    ("eng",       "dx_core",       0.5, "★", "学習文化からの関連（仮）"),
    ("transform", "dx_core",       0.3, "★", "変革人財との関連（仮）"),
    ("transform", "reskill",       0.5, "★", "変革人財との関連（仮）"),
    ("eng",       "reskill",       0.3, "★", "学習文化からの関連（仮）"),
    ("transform", "renewable_mid", 0.4, "★", "脱炭素人財との関連（仮）"),
]

# ════════════════════════════════════════════════════════════
# 中間層 → 財務 行列  (revenue, cost, capital)
# ════════════════════════════════════════════════════════════
MID_TO_FIN: dict[str, tuple[float, float, float]] = {
    "safety_zero":   (0.015, 0.012, 0.074),
    "poc":           (0.036, 0.008, 0.028),
    "renewable_mid": (0.035, 0.015, 0.075),
    "co2":           (0.009, 0.004, 0.058),
    "jcsi":          (0.035, 0.025, 0.025),
    "ltv":           (0.030, 0.010, 0.040),
    "region":        (0.063, 0.014, 0.049),
    "esg":           (0.230, 0.100, 0.130),
    "recruit":       (0.060, 0.120, 0.140),
    "safety_brand":  (0.020, 0.030, 0.120),
    "dx_core":       (0.020, 0.040, 0.030),
    "reskill":       (0.040, 0.070, 0.050),
}

FIN_RELIABILITY: dict[str, str] = {
    "safety_zero":   "★★",
    "poc":           "★",
    "renewable_mid": "★★★",
    "co2":           "★",
    "jcsi":          "★★★",
    "ltv":           "★★★",
    "region":        "★★★",
    "esg":           "★★★",
    "recruit":       "★★★",
    "safety_brand":  "★★★",
    "dx_core":       "★",
    "reskill":       "★",
}

# ════════════════════════════════════════════════════════════
# キャリブレーション係数
# ════════════════════════════════════════════════════════════
# v5：日常重視配分で 6,000P → 売上+6億円
SALES_CALIBRATION = 0.01815

# 参考値（ROIC/ROE）
ROE_CALIBRATION = 0.024
ROIC_CALIBRATION = ROE_CALIBRATION / LEVERAGE


# ════════════════════════════════════════════════════════════
# 内部構造体
# ════════════════════════════════════════════════════════════

class KpiResult:
    __slots__ = ("calc_id", "name", "unit", "current", "target", "projected",
                 "improvement", "achievement", "reliability", "tabs", "description")

    def __init__(self, calc_id, name, unit, current, target, projected,
                 improvement, achievement, reliability, tabs, description):
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
    """v5: メインは売上効果。"""

    def __init__(self, points, layer3, mid, drivers,
                 sales_effect_m, sales_effect_oku,
                 roic_delta, roe_delta, yearly, connections):
        self.points = points
        self.layer3 = layer3
        self.mid = mid
        self.drivers = drivers
        self.sales_effect_m = sales_effect_m
        self.sales_effect_oku = sales_effect_oku
        self.roic_delta = roic_delta
        self.roe_delta = roe_delta
        self.yearly = yearly
        self.connections = connections
        self.updated_at = datetime.now().isoformat()


# ════════════════════════════════════════════════════════════
# 計算ロジック（v5）
# ════════════════════════════════════════════════════════════

def _calc_layer3(points: PointsInput) -> dict[str, KpiResult]:
    """9セル × M9_7 × M7_4 × scale → 4個3層KPI改善量"""
    out = {}
    p_dict = points.as_dict()

    for kpi_id in ["eng", "challenge", "transform", "retention"]:
        improvement = 0.0
        for cell, hudo_w in M9_7.items():
            p = p_dict.get(cell, 0)
            if p == 0:
                continue
            # raw_coef_for_kpi = sum_h(M9_7[cell, h] * M7_4[h, kpi])
            raw_coef = sum(hw * M7_4[h][kpi_id] for h, hw in hudo_w.items())
            improvement += (p / 100) * raw_coef * KPI_SCALE[kpi_id]

        name, unit, current, target, tabs, rel, desc = LAYER3_META[kpi_id]
        projected = current + improvement
        diff = target - current
        achievement = improvement / diff if diff != 0 else 0.0
        out[kpi_id] = KpiResult(kpi_id, name, unit, current, target, projected,
                                improvement, achievement, rel, tabs, desc)
    return out


def _calc_mid(layer3: dict[str, KpiResult]) -> dict[str, KpiResult]:
    """3層 × LAYER3_TO_MID = 中間層13個（達成率）"""
    boosts = {}
    # サーベイ由来9個
    survey_ids = {"safety_zero", "poc", "co2", "jcsi", "ltv", "region",
                  "esg", "recruit", "safety_brand"}
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
        out[mid_id] = KpiResult(mid_id, name, unit, current, target, projected,
                                improvement, boost, rel, tabs, desc)
    return out


def _calc_financial(mid: dict[str, KpiResult]) -> tuple[dict[str, float], float, float, float, float]:
    """中間層 → 財務ドライバー → 売上効果 + ROIC/ROE"""
    revenue = cost = capital = 0.0
    for mid_id, node in mid.items():
        if mid_id not in MID_TO_FIN:
            continue
        rc, cc, kc = MID_TO_FIN[mid_id]
        revenue += node.achievement * rc
        cost += node.achievement * cc
        capital += node.achievement * kc

    drivers = {"revenue": revenue, "cost": cost, "capital": capital}

    # メイン：売上効果
    sales_effect_m = revenue * REVENUE_M * SALES_CALIBRATION
    sales_effect_oku = sales_effect_m / 100

    # 参考：ROIC/ROE
    fin_total = revenue + cost + capital
    roic_delta = fin_total * ROIC_CALIBRATION
    roe_delta = roic_delta * LEVERAGE

    return drivers, sales_effect_m, sales_effect_oku, roic_delta, roe_delta


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
    # 9セル → 7風土
    for cell, hudo_w in M9_7.items():
        for h, w in hudo_w.items():
            edges.append(Edge(from_id=cell, to_id=h,
                              coefficient=w, reliability="★", citation="接続行列9×7（仮）"))
    # 7風土 → 4 KPI
    for h, kpi_w in M7_4.items():
        for k, w in kpi_w.items():
            if w > 0:
                edges.append(Edge(from_id=h, to_id=k,
                                  coefficient=w, reliability="★", citation="接続行列7×4（仮）"))
    # 3層 → 中間層
    for from_id, to_id, coef, rel, citation in LAYER3_TO_MID:
        edges.append(Edge(from_id=from_id, to_id=to_id,
                          coefficient=coef, reliability=rel, citation=citation))
    # 3層 → 実カウント中間層（点線関連）
    for from_id, to_id, coef, rel, citation in LAYER3_TO_MID_COUNT:
        edges.append(Edge(from_id=from_id, to_id=to_id,
                          coefficient=coef, reliability=rel, citation=citation))
    # 中間層 → 財務ドライバー
    for mid_id, (rc, cc, kc) in MID_TO_FIN.items():
        rel = FIN_RELIABILITY[mid_id]
        if rc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="revenue", coefficient=rc, reliability=rel))
        if cc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="cost", coefficient=cc, reliability=rel))
        if kc > 0.01:
            edges.append(Edge(from_id=mid_id, to_id="capital", coefficient=kc, reliability=rel))
    # 売上ドライバー → 売上効果（メイン）
    edges.append(Edge(from_id="revenue", to_id="sales_effect",
                      coefficient=SALES_CALIBRATION, reliability="★",
                      citation="売上キャリブ（仮置き）"))
    # 参考：財務ドライバー → ROIC/ROE
    for driver in ("revenue", "cost", "capital"):
        edges.append(Edge(from_id=driver, to_id="roic",
                          coefficient=ROIC_CALIBRATION, reliability="★",
                          citation="ROICキャリブ（参考）"))
    edges.append(Edge(from_id="roic", to_id="roe",
                      coefficient=LEVERAGE, reliability="★★★",
                      citation="レバレッジ（FY2025）"))
    return edges


def calculate(points: PointsInput) -> CascadeResult:
    """v5: 9セル → 売上効果（メイン）+ ROIC/ROE（参考）"""
    layer3 = _calc_layer3(points)
    mid = _calc_mid(layer3)
    drivers, sales_m, sales_oku, roic_delta, roe_delta = _calc_financial(mid)
    yearly = _build_yearly(roic_delta, roe_delta)
    connections = _build_connections()
    return CascadeResult(
        points=points, layer3=layer3, mid=mid, drivers=drivers,
        sales_effect_m=sales_m, sales_effect_oku=sales_oku,
        roic_delta=roic_delta, roe_delta=roe_delta,
        yearly=yearly, connections=connections,
    )
