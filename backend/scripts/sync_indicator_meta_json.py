#!/usr/bin/env python3
"""indicator_meta.json を main の INDICATOR_META（v6）と同期する。"""

from __future__ import annotations

import json
from pathlib import Path

REFINE = " 運用データを継続的に蓄積し、5年スパンで再校正予定。"

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "backend" / "data" / "indicator_meta.json"

# main frontend/src/lib/cascade/meta.ts の INDICATOR_META から export（TODO 除去済み）
META: dict = {
    "shokumu": {
        "description": {
            "measures": "自社・自部署・自分の仕事に対する誇りや帰属意識の強さ",
            "measurement": "年次エンゲージメントサーベイの「職務への誇り」関連設問のスコア（5段階評価の平均）",
            "targetRationale": "業界平均より高い水準を維持。職務誇りは退職意向と強く負相関する研究知見に基づく。" + REFINE,
        }
    },
    "shinri": {
        "description": {
            "measures": "チーム内で率直な意見表明・失敗共有・挑戦提案ができる風土の度合い",
            "measurement": "Edmondsonの心理的安全性7項目尺度をベースとしたサーベイ（年次実施）",
            "targetRationale": "Google「Project Aristotle」が「効果的なチームの最重要因子」と特定。業界平均を上回る水準を目標。" + REFINE,
        }
    },
    "kenkou": {
        "description": {
            "measures": "心身の健康を維持できる就業環境（労働時間・有給取得・メンタル支援等）の整備状況",
            "measurement": "健康経営優良法人ホワイト500の評価項目をベースとした内部評価",
            "targetRationale": "健康経営優良法人ホワイト500の上位基準。生産性研究に基づく水準。" + REFINE,
        }
    },
    "tayou": {
        "description": {
            "measures": "性別・年齢・職歴・国籍など、組織内の多様性受容度と機会均等の実現度",
            "measurement": "女性管理職比率・キャリア採用比率・育休取得率・障害者雇用率等の総合スコア",
            "targetRationale": "経産省「人材版伊藤レポート2.0」の推奨基準。多様性が革新と業績に寄与する研究知見。" + REFINE,
        }
    },
    "jiritsu": {
        "description": {
            "measures": "社員の自律的な意思決定権限と、上司・同僚との建設的対話の頻度・質",
            "measurement": "1on1実施率・自律性に関するサーベイ設問・360度評価の対話関連項目を集約",
            "targetRationale": "自己決定理論（Deci & Ryan）の自律性が内発的動機の核。業界平均超えを目指す。" + REFINE,
        }
    },
    "gakushu": {
        "description": {
            "measures": "個人の学習機会と成長実感、組織として学び続ける文化の度合い",
            "measurement": "一人当たり研修時間・自己啓発支援利用率・成長実感サーベイスコアの総合",
            "targetRationale": "ESG関連開示の人的資本投資指標。学習組織研究（Senge）の知見に基づく。" + REFINE,
        }
    },
    "chosen": {
        "description": {
            "measures": "失敗を許容し新しい取り組みを奨励する風土の度合い、実際の挑戦行動量",
            "measurement": "新規プロジェクト立ち上げ数・社内公募応募率・挑戦経験に関するサーベイ項目",
            "targetRationale": "心理的安全性とセットで革新を生む要素。Edmondson研究に基づく。" + REFINE,
        }
    },
    "eng": {
        "description": {
            "measures": "全社員のエンゲージメントスコア。仕事への熱意・没頭・活力を統合",
            "measurement": "Utrecht Work Engagement Scale（UWES）または社内サーベイ（年1〜2回実施）",
            "targetRationale": "業界平均（約55%）を10pt上回る水準。退職率・生産性との相関研究に基づく。" + REFINE,
        },
        "target": 65.0,
        "unit": "%",
    },
    "retention": {
        "description": {
            "measures": "入社3年以内の社員が継続して在籍している比率",
            "measurement": "各年度の入社者数 vs 3年経過時点での在籍者数",
            "targetRationale": "ACT2027 の中計目標は 95% 維持・向上。離職コスト（年収の30〜100%）の最小化と人材定着を両立。" + REFINE,
        },
        "target": 95.0,
        "unit": "%",
    },
    "challenge": {
        "description": {
            "measures": "新規事業・新規プロジェクト・社内公募・越境経験の実施・参加度合い",
            "measurement": "社員一人当たり挑戦行動数を5段階で評価し平均化",
            "targetRationale": "2022年度 3.46 → 2027年度 3.75 を中計目標として設定。変革人財輩出の前提条件。" + REFINE,
        },
        "target": 3.75,
        "unit": "スコア",
    },
    "transform": {
        "description": {
            "measures": "既存事業を超えて新規価値を創出できる人財（管理職候補者）の組織内比率",
            "measurement": "360度評価・上長評価・実績評価を統合した変革人財認定制度",
            "targetRationale": "管理職候補者比率 15% → 20% を中計目標として設定。経産省「人的資本投資指針」参照。" + REFINE,
        },
        "target": 20.0,
        "unit": "%",
    },
    "safety_zero": {
        "description": {
            "measures": "ガス供給に関わる保安事故（人身・設備・公衆）の連続無発生年数",
            "measurement": "経産省ガス事業法に基づく保安事故報告。連続ゼロを継続している年数を集計（2022〜2024年度で3年連続）",
            "targetRationale": "2027年度末まで継続堅持で 5年連続を達成。ガス事業者として絶対遵守すべき基本要件、人命・社会インフラへの責任。" + REFINE,
        },
        "target": 5,
        "unit": "年連続",
        "baselineCurrent": 3,
    },
    "safety_brand": {
        "description": {
            "measures": "保安・安全に関する社会的信頼度。重大事故・是正命令等の連続無発生年数",
            "measurement": "行政処分・重大インシデント・大規模苦情の連続ゼロ年数を集計（2022〜2024年度で3年連続）",
            "targetRationale": "2027年度末まで継続堅持で 5年連続を達成。100年企業として築いた保安ブランドの維持、一度の失墜は10年で取り戻せない。" + REFINE,
        },
        "target": 5,
        "unit": "年連続",
        "baselineCurrent": 3,
    },
    "jcsi": {
        "description": {
            "measures": "日本版顧客満足度指数（SPRING調査）の電気・ガス業界における連続第1位年数",
            "measurement": "SPRINGの年次JCSI調査における電気・ガス業界での順位（連続第1位の年数）",
            "targetRationale": "現在 4年連続第1位 → 2027年度末までに 6年連続第1位を維持。顧客LTVとの強い相関。" + REFINE,
        },
        "target": 6,
        "unit": "年連続第1位",
        "baselineCurrent": 4,
    },
    "ltv": {
        "description": {
            "measures": "顧客接点プラットフォーム（マイページ）の会員数。LTV 向上の代理指標",
            "measurement": "マイページ会員数（推定 60万件）+ SAIBULAND 会員数（推定 8万件）の合算をベースに、マイページ会員数を主指標として表示",
            "targetRationale": "ACT2027 で マイページ 73.3万件 / SAIBULAND 13.3万件 を目標。解約率低減と単価向上、電気事業者との競争激化を踏まえた水準。" + REFINE,
        },
        "target": 73.3,
        "unit": "万件",
        "baselineCurrent": 60,
    },
    "recruit": {
        "description": {
            "measures": "採用後 3年経過時点の定着率",
            "measurement": "各年度の入社者に対する 3年後在籍率を算出",
            "targetRationale": "現状 95.8% を維持・向上し 95% 以上をターゲット。インフラ事業の継続性を担保する人財確保、労働市場の競争激化に対応。" + REFINE,
        },
        "target": 95,
        "unit": "%",
        "baselineCurrent": 95.8,
    },
    "region": {
        "description": {
            "measures": "地域社会との共創プロジェクト（自治体・住民・地元企業・スタートアップ等との協働事業・PoC を含む）の年間実施件数",
            "measurement": "地域貢献活動・包括連携協定・地域課題解決事業・社外パートナーとの共創PoC の実施件数を集計（v6: 旧 PoC 指標を統合）",
            "targetRationale": "ACT2027 では 2027年度に 15件を目標。中間マイルストーンとして 2026年度末で 10件を案分目標に設定。" + REFINE,
        },
        "target": 15,
        "unit": "件",
        "baselineCurrent": 10,
    },
    "esg": {
        "description": {
            "measures": "主要ESG評価機関の指数組入状況（MSCI ESG・FTSE Russell 等）",
            "measurement": "MSCI ESG・Sustainalytics・FTSE 等、主要評価機関のレーティングおよび指数組入実績を集約",
            "targetRationale": "現在は主要指数組入実績あり。2027年度も主要ESG指数組入を維持し、投資家のESG重視傾向に対応。" + REFINE,
        },
        "reference": "Wilberg 2025",
        "qualitativeCurrent": "主要指数組入実績あり",
        "qualitativeTarget": "主要ESG指数組入維持",
    },
    "presenteeism": {
        "description": {
            "measures": "出社しているが心身の不調により本来の能力を発揮できていない状態の少なさ（発揮度=100%-損失率）",
            "measurement": "WHO-HPQ や東大1項目版を用いた自己申告サーベイで「100%発揮度」を集計。経産省「健康経営度調査」準拠",
            "targetRationale": "現在 80% → 2027年度末 85% を中間目標。経産省の調査で日本企業平均は84.4%、SAP事例では発揮度1pt改善で営業利益+1%。" + REFINE,
        },
        "target": 85,
        "unit": "%",
    },
    "absenteeism": {
        "description": {
            "measures": "心身の不調による年間欠勤日数（一人当たり）。少ないほど健康度が高い",
            "measurement": "従業員一人当たりの病欠・心身不調による休業日数の年間合計。ISO30414 の人的資本開示項目に準拠",
            "targetRationale": "現在 1.70日/年 → 2027年度末 1.50日/年 を目標。日本平均は約2日/年、健康経営優良法人ホワイト500の上位企業水準。" + REFINE,
        },
        "target": 1.5,
        "unit": "日",
    },
    "co2": {
        "description": {
            "measures": "自社事業活動および提供サービスによる年間のCO2削減貢献量（Scope3含む）",
            "measurement": "高効率機器販売・再エネ供給・カーボンクレジット等の削減効果を算出",
            "targetRationale": "2024年度 46万t → 2027年度 87万t の中間値として 2026年度末 73.3万t を案分目標。2050年カーボンニュートラル目標から逆算、SBT認定基準に整合。" + REFINE,
        },
        "target": 73.3,
        "unit": "万t",
        "baselineCurrent": 46,
    },
    "sales_effect": {
        "description": {
            "measures": "人的資本投資（60,000P）による年間売上増加効果",
            "measurement": "各KPI改善が売上に与える影響を NotebookLM 39 係数 × cascade × 期間内発現率 1/3 で算出",
            "targetRationale": "60,000P × 1万円/P = 11.12億円（v2.6 道 2、Phase 1 達成時のフルポテンシャル）。" + REFINE,
        },
        "target": 11.12,
        "unit": "億円",
    },
    "revenue": {
        "description": {
            "measures": "売上構成要素の代表として、電力販売量（億kWh）を主指標に置く",
            "measurement": "主要事業セグメントの電力販売量（前年同期比）",
            "targetRationale": "ACT2027 で 6.4億kWh → 9.0億kWh（2027年度）を中計目標。インフラ事業の安定性を維持しつつ新規領域の成長を組み込む。" + REFINE,
        },
        "target": 9.0,
        "unit": "億kWh",
        "baselineCurrent": 6.4,
    },
    "cost": {
        "description": {
            "measures": "人的資本投資による業務効率化・離職コスト低減等のコスト削減効果",
            "measurement": "業務時間削減・採用コスト削減・離職コスト削減の合算",
            "targetRationale": "現時点では数値目標は未確定。「業務集約・電力原価低減」を質的目標として設定。" + REFINE,
        },
        "qualitativeTarget": "業務集約・電力原価低減",
    },
    "capital": {
        "description": {
            "measures": "政策保有株式の縮減度合い（2023年度水準を100とした相対値）",
            "measurement": "2023年度末の政策保有株式残高を100とし、各時点の残高比率で表示",
            "targetRationale": "ACT2027 で 2028年度までに 50%（2023年度比 半減）を目標。中期経営計画の資本効率目標に整合。" + REFINE,
        },
        "target": 50,
        "unit": "%",
        "baselineCurrent": 100,
    },
    "roic": {
        "description": {
            "measures": "投下資本利益率。事業に投じた資本がどれだけ利益を生んだか",
            "measurement": "NOPAT（税引後営業利益） ÷ 投下資本（有利子負債 + 自己資本）",
            "targetRationale": "ACT2027 で 1.8% → 2.3%（2027年度）。WACC を上回る水準、エクイティスプレッドの観点。" + REFINE,
        },
        "target": 2.3,
        "unit": "%",
    },
    "roe": {
        "description": {
            "measures": "自己資本利益率。株主資本がどれだけ効率的に利益を生んだか",
            "measurement": "当期純利益 ÷ 自己資本",
            "targetRationale": "ACT2027 で 6.0% → 8.0%（2027年度）。株主資本コスト（CAPM算出）を上回る水準、柳モデルでの企業価値創出。" + REFINE,
        },
        "target": 8.0,
        "unit": "%",
    },
}


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(META, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {len(META)} indicators → {OUT_PATH}")


if __name__ == "__main__":
    main()
