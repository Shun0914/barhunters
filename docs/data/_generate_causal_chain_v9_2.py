#!/usr/bin/env python3
"""dashboard/remixed-9d8265c3.html と同等のノード・エッジを causal_chain_v9_2.json に出力する。"""
import json
from pathlib import Path

OUT = Path(__file__).parent / "causal_chain_v9_2.json"

# BT: q=定量白, d=測定設計青, ql=定性仮案灰点線
BOX = {"q": "quantitative", "d": "measurement_design", "ql": "qualitative_provisional"}

QL = [
    ("心理的安全性の醸成", "失敗を認め・挑戦を称える組織文化", "Edmondson 1999 / Googleプロジェクト・アリストテレス\n→挑戦指数・ENGの文化的基盤", "d"),
    ("挑戦できる風土", "未来をつなぐエネルギーとしての挑戦文化", "Edmondson 1999：心理的安全性→挑戦行動\n西部ガス ACT2027の精神的基盤", "d"),
    ("自律と対話の文化", "1on1・ストレッチゴール・コーチング文化", "Locke & Latham：目標設定→動機づけ\nSOMPOパーパス事例：自律文化→ENG向上", "d"),
    ("学習・成長の文化", "自発的な学びを称える組織風土", "Garavan et al.2021：学習文化→組織業績\n→変革人財・リスキルの文化的土台", "d"),
    ("デジタル技術活用の文化", "ツール・AI・データ活用に関する文化", "DX推進施策の文化的アウトカム\n→DXコア人財・業務効率化の土台", "d"),
    ("職務への誇り・貢献実感", "日々の業務が組織・社会に貢献しているという実感", "守りの部署・現場職種向けの指標\n→ENG・定着率の文化的基盤", "d"),
    ("多様性を活かす文化", "多様な視点・アイデアが歓迎される雰囲気", "Post & Byron 2015：多様性→意思決定の質\n→女性管理職・育休取得の文化的基盤", "ql"),
    ("健康で安心な職場環境", "心身の健康が挑戦の基盤となる文化", "健康経営施策の文化的アウトカム\n→プレゼン・アブセン改善の土台", "ql"),
    ("脱炭素への挑戦文化", "CN2050に向けた全社的な行動変容", "環境意識・行動変容が事業競争力へ\n→CO2削減・再エネの文化的基盤", "ql"),
]

C1_rows = [
    ("従業員エンゲージメント", "目標：65%以上（2027）", "Gallup：ウェルビーイングとENGの相関r=0.71\n上位企業は収益性23%高・生産性18%向上"),
    ("ワーク・エンゲージメント", "目標：2.8点以上", "仕事への活力・没頭感\nストレスチェック時に測定（ENGの補完指標）"),
    ("挑戦指数", "3.46→3.75（2027）", "高業績志向文化とレコグニション研究\n挑戦・学習意欲・成長実感の向上"),
    ("変革人財の割合", "15%→20%（2027）", "Garavan：研修→スキル向上→変革人財強化"),
    ("リスキル実践者数", "2,000名（3年累計）", "自律的キャリア形成・スキル専門性向上"),
    ("DXコア人財育成", "650名（延べ）", "デジタル変革推進の担い手育成\nACT2027 DX戦略の中核"),
    ("グループ横断配置", "20件（累計）", "多様な経験・視点の付与\n変革人財・イノベーション文化の基盤"),
    ("プレゼンティーイズム", "80%→85%（2027）", "SAP事例：健康文化指数1%改善→営業利益増\n人件費×(1-発揮度%)=損失額（貨幣換算可）"),
    ("アブセンティーイズム", "1.70→1.50日（2027）", "非自発的な欠勤（病気・メンタル不調）による損失\n定着率・組織活力への影響指標　ISO30414準拠"),
    ("従業員定着率", "98.1%維持", "Gallup：高ENG組織は離職率18〜43%低\n定着→熟練技術継承→保安品質向上"),
    ("女性管理職比率", "3.2%→6%(2027)/15%(2030)", "柳モデル実証：7年後PBR+2.4%\n施策から直接制御できる指標（点線接続）"),
    ("男性育休取得率", "90.6%→100%（14日以上）", "Gallup：インクルーシブ文化→多様な働き方促進\n施策から直接制御できる指標（点線接続）"),
    ("障がい者雇用率", "2.5%→2.7%", "ESG（S）評価指標・DE&I成熟度の証左\n施策から直接制御できる指標（点線接続）"),
]

C3_rows = [
    ("CO2削減貢献量", "87万t(2027)/150万t(2030)", "東京ガス（同業）：Scope1&2削減1%→PBR+1.48%"),
    ("保安事故ゼロ件堅持", "重大トラブル・重大事故ゼロ", "Gallup：高ENG組織は安全事故64%少ない\nエーザイ：品質・安全→市場評価維持"),
    ("共創型PoC進展", "採択率・成功件数で評価", "柳モデル：知的資本投資→PBR+8.2%（10年超）\nACT2027 TOMOSHIBI連動"),
    ("顧客接点の深さ", "SAIBULAND 20万件・マイページ 80万件", "エーザイhhc Hotline：顧客接点→5年後PBR相関\nデジタルLTV向上基盤"),
    ("再エネ取扱量", "13万→20万kW（2030）", "柳モデル：脱炭素投資→PBR向上\n資本コスト低下→PER向上"),
]

C4_rows = [
    ("JCSI継続No.1", "4年連続No.1 継続・深化目標", "Fornell et al.2006/2016：顧客満足1%→市場価値4.6%↑"),
    ("顧客1人あたり売上", "天然ガス・電力販売量を原単位変換", "エーザイhhc Hotline実証・柳モデル推奨手法\n絶対値→原単位化で擬似相関排除"),
    ("地域共創力", "地域LTV・社会的インパクト", "Fornell et al.：顧客満足→将来収益成長\nIWAIで社会的価値の貨幣換算が可能"),
    ("ESG評価スコア", "E・S・G総合評価（CO2削減・CN化率含む）", "Takahashi et al.2025：E評価1点→PER+4.23pt\n日本635社・統計的有意（p<0.01）"),
    ("採用力", "採用競争力の回復・定着モニタリング", "Li et al.2021：離職率1%↑→売上成長率-0.28%\n人材版伊藤レポート2.0"),
    ("保安ブランド評価", "安心・安全・信頼の数値化", "エーザイ：品質・安全→市場評価維持\nインフラ企業の資本コスト低減要因"),
]

C5C_rows = [
    ("売上高（売上ドライバー）", "2,500億円（2030目標）", "JCSI・顧客1人あたり・地域共創力の結実"),
    ("コスト削減・利益改善", "経常利益380億円（3年合計）", "採用力・定着率・プレゼン改善の積み上げ"),
    ("資本効率化・資本コスト低下", "ESG評価向上・投下資本効率化", "ESG評価↑→資本コスト低下"),
]


def main():
    nodes = []

    actions = [
        ("①日常の一歩", "1点", "日常業務の中での小さな行動\n助け合い・報告・改善提案\n毎日の積み重ねが文化をつくる"),
        ("②越境の一歩", "3点", "部門・会社をまたいだ行動\nグループ横断・社外連携\n多様な視点が変革を生む"),
        ("③創造の一歩", "5点", "新しい価値を生み出す行動\n新規提案・PoC・新事業創出\nイノベーションの起点となる"),
    ]
    pillars = [
        ("社会貢献", "#fef3c7", "#92400e"),
        ("安心安全", "#dbeafe", "#1e3a8a"),
        ("未来共創", "#d1fae5", "#065f46"),
    ]
    for i, (title, pts, desc) in enumerate(actions):
        nodes.append(
            {
                "id": f"ac-{i}",
                "layer": "action",
                "index": i,
                "boxType": "action",
                "title": title,
                "pointsLabel": pts,
                "description": desc,
                "pillarTags": [{"label": a, "bg": b, "fg": c} for a, b, c in pillars],
            }
        )

    for i, (t, k, e, bt) in enumerate(QL):
        nodes.append(
            {
                "id": f"ql-{i}",
                "layer": "qualitative",
                "index": i,
                "boxType": BOX[bt],
                "title": t,
                "kpi": k,
                "evidence": e,
            }
        )

    for i, (t, k, e) in enumerate(C1_rows):
        nodes.append(
            {
                "id": f"c1-{i}",
                "layer": "quantitative_primary",
                "index": i,
                "boxType": BOX["q"],
                "title": t,
                "kpi": k,
                "evidence": e,
            }
        )

    for i, (t, k, e) in enumerate(C3_rows):
        nodes.append(
            {
                "id": f"c3-{i}",
                "layer": "competitiveness",
                "index": i,
                "boxType": BOX["q"],
                "title": t,
                "kpi": k,
                "evidence": e,
            }
        )

    for i, (t, k, e) in enumerate(C4_rows):
        nodes.append(
            {
                "id": f"c4-{i}",
                "layer": "external_value",
                "index": i,
                "boxType": BOX["q"],
                "title": t,
                "kpi": k,
                "evidence": e,
            }
        )

    for i, (t, k, e) in enumerate(C5C_rows):
        nodes.append(
            {
                "id": f"c5c-{i}",
                "layer": "roic_driver",
                "index": i,
                "boxType": BOX["q"],
                "title": t,
                "kpi": k,
                "evidence": e,
            }
        )

    nodes += [
        {
            "id": "c5b-0",
            "layer": "roic_intermediate",
            "index": 0,
            "boxType": BOX["q"],
            "title": "売上高利益率の向上",
            "kpi": "売上↑ かつ コスト削減↓",
            "evidence": None,
        },
        {
            "id": "c5b-1",
            "layer": "roic_intermediate",
            "index": 1,
            "boxType": BOX["q"],
            "title": "投下資本回転率の向上",
            "kpi": "資本効率化・生産性向上",
            "evidence": None,
        },
        {
            "id": "c5a-0",
            "layer": "roic_outcome",
            "index": 0,
            "boxType": BOX["q"],
            "title": "ROIC【主目標】",
            "kpi": "実績2.1%→目標2.3%(2027)→3.0%(2030年代)",
            "evidence": "JCSI・ESG・定着率が\n売上高利益率と投下資本回転率を押し上げる\n遅延浸透効果5〜10年（柳モデル）",
        },
        {
            "id": "c5a-1",
            "layer": "roic_outcome",
            "index": 1,
            "boxType": BOX["q"],
            "title": "ROE",
            "kpi": "実績6.3%→目標8.0%（2027）",
            "evidence": "ESG評価↑→PBR・PER向上経路\n※ROEをコントロール変数として使用",
        },
        {
            "id": "c5a-2",
            "layer": "roic_outcome",
            "index": 2,
            "boxType": BOX["q"],
            "title": "企業価値（PBR）の向上",
            "kpi": "現状0.61倍→1倍超を目指す",
            "evidence": "人件費1割増→7年後PBR+2.6%（TOPIX100・柳モデル）",
        },
    ]

    def e(
        fr,
        to,
        *,
        kind="bezier_across",
        stroke="solid",
        color=None,
        marker=None,
        label=None,
    ):
        out = {"from": fr, "to": to, "kind": kind, "stroke": stroke}
        if color:
            out["color"] = color
        if marker:
            out["marker"] = marker
        if label:
            out["label"] = label
        return out

    edges = []
    # アクション→定性
    edges += [
        e("ac-0", "ql-0"),
        e("ac-0", "ql-1"),
        e("ac-0", "ql-5"),
        e("ac-1", "ql-1"),
        e("ac-1", "ql-2"),
        e("ac-1", "ql-6"),
        e("ac-2", "ql-3"),
        e("ac-2", "ql-4"),
        e("ac-2", "ql-8", stroke="dashed"),
        e("ac-0", "ql-7"),
    ]
    # 定性→定量①
    edges += [
        e("ql-0", "c1-2"),
        e("ql-0", "c1-0"),
        e("ql-1", "c1-2"),
        e("ql-1", "c1-3"),
        e("ql-2", "c1-0"),
        e("ql-2", "c1-1"),
        e("ql-3", "c1-4"),
        e("ql-3", "c1-3"),
        e("ql-4", "c1-5"),
        e("ql-4", "c1-6"),
        e("ql-5", "c1-0"),
        e("ql-5", "c1-9"),
        e("ql-7", "c1-7"),
        e("ql-7", "c1-8"),
        e("ql-8", "c1-0", stroke="dashed"),
    ]
    # 定量① 列内
    edges += [
        e("c1-1", "c1-0", kind="vertical_same_column", color="#555"),
        e("c1-2", "c1-3", kind="vertical_same_column", color="#555"),
        e("c1-0", "c1-9", kind="vertical_same_column", stroke="dashed", color="#aaa"),
    ]
    # 定量①→事業競争力
    edges += [
        e("c1-0", "c3-1"),
        e("c1-0", "c3-3"),
        e("c1-2", "c3-2"),
        e("c1-3", "c3-2"),
        e("c1-3", "c3-4"),
        e("c1-5", "c3-2"),
        e("c1-9", "c3-1"),
        e("c1-9", "c3-3"),
    ]
    # DE&I → ESG
    edges += [
        e("c1-10", "c4-3", stroke="dashed", color="#a855f7", marker="dei_to_esg"),
        e("c1-11", "c4-3", stroke="dashed", color="#a855f7", marker="dei_to_esg"),
        e("c1-12", "c4-3", stroke="dashed", color="#a855f7", marker="dei_to_esg"),
    ]
    # 事業競争力→外部価値
    edges += [
        e("c3-1", "c4-0"),
        e("c3-1", "c4-3"),
        e("c3-1", "c4-5"),
        e("c3-2", "c4-2"),
        e("c3-2", "c4-3", stroke="dashed"),
        e("c3-3", "c4-0"),
        e("c3-3", "c4-1"),
        e("c3-0", "c4-3"),
        e("c3-4", "c4-3"),
    ]
    # 外部価値→ROIC ドライバー
    edges += [
        e("c4-0", "c5c-0"),
        e("c4-1", "c5c-0"),
        e("c4-2", "c5c-0"),
        e("c4-4", "c5c-1"),
        e("c4-3", "c5c-2"),
        e("c4-5", "c5c-2"),
    ]
    # ROIC ツリー内部（HTML の treeFork / treeConn / vca に相当）
    edges += [
        e("c5c-0", "c5b-0", kind="tree_merge"),
        e("c5c-1", "c5b-0", kind="tree_merge"),
        e("c5c-2", "c5b-1", kind="tree_conn"),
        e("c5b-0", "c5a-0", kind="tree_merge"),
        e("c5b-1", "c5a-0", kind="tree_merge"),
        e("c5a-0", "c5a-1", kind="vertical_same_column"),
        e("c5a-1", "c5a-2", kind="vertical_same_column"),
    ]
    # クロスレイヤー遅延（太矢印＋ラベル）
    edges += [
        e(
            "c1-0",
            "c4-0",
            kind="delayed_cross_layer",
            stroke="dash_dot_dark_red",
            label="Gallup実証 ENG→顧客満足",
        ),
        e(
            "c1-9",
            "c5c-1",
            kind="delayed_cross_layer",
            stroke="dash_dot_dark_red",
            label="採用コスト減・熟練継承",
        ),
        e(
            "c1-7",
            "c5c-1",
            kind="delayed_cross_layer",
            stroke="dash_dot_dark_red",
            label="発揮度×人件費＝損失額",
        ),
        e(
            "c1-8",
            "c5c-1",
            kind="delayed_cross_layer",
            stroke="dash_dot_dark_red",
            label="欠勤・代替要員費削減",
        ),
    ]

    doc = {
        "meta": {
            "version": "9.2",
            "title": "人的資本 因果チェーン v9.2",
            "subtitle": "DE&I→ESG接続／保安ブランド→資本コスト低下／クロスレイヤー横ずらし＋ラベル／定量層ボックス拡大",
            "sourceMock": "dashboard/remixed-9d8265c3.html",
            "notes": [
                "ノード id は layer-index または固定 id（ROIC 下部）。API v1 の契約・シードのたたき台として利用する。",
                "座標・SVG は含まない。描画はクライアントがレイアウトエンジンで再現する。",
            ],
        },
        "boxTypes": {
            "quantitative": "定量指標（白枠）",
            "measurement_design": "測定設計中（文献根拠あり・青）",
            "qualitative_provisional": "定性指標（仮案・灰点線）",
            "action": "アクション（3ステップ・ポイント付き）",
        },
        "nodes": nodes,
        "edges": edges,
    }

    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
