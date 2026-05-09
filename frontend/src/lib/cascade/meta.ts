// 画面メタ。バックエンド calc_id と表示位置（5列のどこか）の対応表。
// 列1=入力9セル / 列2=風土7 / 列3=会社への効果7 / 列4=中間9 / 列5=財務.

import type { ActionKey, CategoryKey, CellKey } from "./types";

export const CATEGORIES: { key: CategoryKey; label: string; color: string; soft: string }[] = [
  { key: "social", label: "社会貢献", color: "bg-cat-social",  soft: "bg-cat-social-soft"  },
  { key: "safety", label: "安心安全", color: "bg-cat-safety",  soft: "bg-cat-safety-soft"  },
  { key: "future", label: "未来共創", color: "bg-cat-future",  soft: "bg-cat-future-soft"  },
];

export const ACTIONS: { key: ActionKey; label: string; multiplier: number }[] = [
  { key: "daily",    label: "日常×",  multiplier: 1 },
  { key: "cross",    label: "越境×",  multiplier: 3 },
  { key: "creative", label: "創造×",  multiplier: 5 },
];

export const CELL_LABEL: Record<CellKey, string> = {
  daily_social:    "日常×社会貢献",
  daily_safety:    "日常×安心安全",
  daily_future:    "日常×未来共創",
  cross_social:    "越境×社会貢献",
  cross_safety:    "越境×安心安全",
  cross_future:    "越境×未来共創",
  creative_social: "創造×社会貢献",
  creative_safety: "創造×安心安全",
  creative_future: "創造×未来共創",
};

// 列2: 風土・組織文化（7項目）— 日常系 → 越境系 → 創造系
export const HUDO_LIST: { id: string; label: string; desc: string }[] = [
  { id: "shokumu", label: "職務への誇り",   desc: "やりがいの源泉" },
  { id: "shinri",  label: "心理的安全性",   desc: "失敗を許容する組織文化" },
  { id: "kenkou",  label: "健康な職場",     desc: "心身の健康が挑戦の基盤" },
  { id: "tayou",   label: "多様性",         desc: "多様な視点を歓迎" },
  { id: "jiritsu", label: "自律と対話",     desc: "自分で考え対話する" },
  { id: "gakushu", label: "学習・成長",     desc: "自発的な学びを称える" },
  { id: "chosen",  label: "挑戦できる風土", desc: "未来をつなぐエネルギー" },
];

// 列3: 会社への効果（KPI 4個）— 日常寄り → 創造寄り
export const COMPANY_EFFECT_IDS = [
  "eng",
  "retention",
  "challenge",
  "transform",
] as const;

// 列4: 事業実績・外部評価（9項目）— ENG主導 → 定着主導 → 挑戦/変革主導 → 横断
export const MID_IDS = [
  "safety_zero",
  "safety_brand",
  "jcsi",
  "ltv",
  "recruit",
  "esg",
  "region",
  "poc",
  "co2",
] as const;

// 列5: 財務評価
export const FINANCE_IDS = [
  "sales_effect", // メイン
  "revenue",
  "cost",
  "capital",
  "roic",
  "roe",
] as const;

export type CompanyEffectId = (typeof COMPANY_EFFECT_IDS)[number];
export type MidId = (typeof MID_IDS)[number];
export type FinanceId = (typeof FINANCE_IDS)[number];

// ────────────────────────────────────────────────
// 指標の構造化説明（詳細ポップアップ表示用）
//   `/* TODO: ... */` のインラインマーカーは仮置き値の grep 用。
//   チームレビュー後に確定する想定。係数情報・上下流の関係は別紙仕様書（PDF）で扱う。
// ────────────────────────────────────────────────
export type IndicatorDescription = {
  /** 何を測る指標か */
  measures: string;
  /** 測定方法 */
  measurement: string;
  /** 目標値の根拠 */
  targetRationale: string;
};

export type IndicatorMeta = {
  description: IndicatorDescription;
  /** 参考文献（あれば） */
  reference?: string;
};

export const INDICATOR_META: Record<string, IndicatorMeta> = {
  // ─── 列2: 風土・組織文化 ───
  shokumu: {
    description: {
      measures: "自社・自部署・自分の仕事に対する誇りや帰属意識の強さ",
      measurement:
        "年次エンゲージメントサーベイの「職務への誇り」関連設問のスコア（5段階評価の平均） /* TODO: 実測方法確認 */",
      targetRationale:
        "業界平均より高い水準を維持。職務誇りは退職意向と強く負相関する研究知見に基づく /* TODO: 業界基準値確認 */",
    },
  },
  shinri: {
    description: {
      measures: "チーム内で率直な意見表明・失敗共有・挑戦提案ができる風土の度合い",
      measurement:
        "Edmondsonの心理的安全性7項目尺度をベースとしたサーベイ（年次実施） /* TODO: 実測方法確認 */",
      targetRationale:
        "Google「Project Aristotle」が「効果的なチームの最重要因子」と特定。業界平均を上回る水準を目標 /* TODO: 業界基準値確認 */",
    },
  },
  kenkou: {
    description: {
      measures: "心身の健康を維持できる就業環境（労働時間・有給取得・メンタル支援等）の整備状況",
      measurement:
        "健康経営優良法人ホワイト500の評価項目をベースとした内部評価 /* TODO: 実測方法確認 */",
      targetRationale:
        "健康経営優良法人ホワイト500の上位基準。生産性研究に基づく水準 /* TODO: 西部ガスの認定状況確認 */",
    },
  },
  tayou: {
    description: {
      measures: "性別・年齢・職歴・国籍など、組織内の多様性受容度と機会均等の実現度",
      measurement:
        "女性管理職比率・キャリア採用比率・育休取得率・障害者雇用率等の総合スコア /* TODO: 実測方法確認 */",
      targetRationale:
        "経産省「人材版伊藤レポート2.0」の推奨基準。多様性が革新と業績に寄与する研究知見",
    },
  },
  jiritsu: {
    description: {
      measures: "社員の自律的な意思決定権限と、上司・同僚との建設的対話の頻度・質",
      measurement:
        "1on1実施率・自律性に関するサーベイ設問・360度評価の対話関連項目を集約 /* TODO: 実測方法確認 */",
      targetRationale:
        "自己決定理論（Deci & Ryan）の自律性が内発的動機の核。業界平均超えを目指す /* TODO: 業界基準値確認 */",
    },
  },
  gakushu: {
    description: {
      measures: "個人の学習機会と成長実感、組織として学び続ける文化の度合い",
      measurement:
        "一人当たり研修時間・自己啓発支援利用率・成長実感サーベイスコアの総合 /* TODO: 実測方法確認 */",
      targetRationale: "ESG関連開示の人的資本投資指標。学習組織研究（Senge）の知見に基づく",
    },
  },
  chosen: {
    description: {
      measures: "失敗を許容し新しい取り組みを奨励する風土の度合い、実際の挑戦行動量",
      measurement:
        "新規プロジェクト立ち上げ数・社内公募応募率・挑戦経験に関するサーベイ項目 /* TODO: 実測方法確認 */",
      targetRationale: "心理的安全性とセットで革新を生む要素。Edmondson研究に基づく",
    },
  },

  // ─── 列3: 会社への効果（KPI） ───
  eng: {
    description: {
      measures: "全社員のエンゲージメントスコア。仕事への熱意・没頭・活力を統合",
      measurement:
        "Utrecht Work Engagement Scale（UWES）または社内サーベイ（年1〜2回実施） /* TODO: 西部ガスでの実測方法確認 */",
      targetRationale:
        "業界平均（約55%）を10pt上回る水準。退職率・生産性との相関研究に基づく /* TODO: 中期計画との整合確認 */",
    },
  },
  retention: {
    description: {
      measures: "入社3年以内の社員が継続して在籍している比率",
      measurement: "各年度の入社者数 vs 3年経過時点での在籍者数",
      targetRationale:
        "インフラ業界の安定性を活かす目標。離職コスト（年収の30〜100%）の最小化",
    },
  },
  challenge: {
    description: {
      measures: "新規事業・新規プロジェクト・社内公募・越境経験の実施・参加度合い",
      measurement: "社員一人当たり挑戦行動数を5段階で評価し平均化 /* TODO: 認定方法確認 */",
      targetRationale:
        "業界平均3.0を上回り、変革人財輩出の前提条件として設定 /* TODO: 業界基準値確認 */",
    },
  },
  transform: {
    description: {
      measures: "既存事業を超えて新規価値を創出できる人財の組織内比率",
      measurement:
        "360度評価・上長評価・実績評価を統合した変革人財認定制度 /* TODO: 認定方法確認 */",
      targetRationale:
        "経営戦略上必要な変革リーダー数を逆算。経産省「人的資本投資指針」参照 /* TODO: 中期計画との整合確認 */",
    },
  },

  // ─── 列4: 事業実績・外部評価 ───
  safety_zero: {
    description: {
      measures: "ガス供給に関わる保安事故（人身・設備・公衆）の発生件数",
      measurement: "経産省ガス事業法に基づく保安事故報告件数を年次集計",
      targetRationale: "ガス事業者として絶対遵守すべき基本要件。人命・社会インフラへの責任",
    },
  },
  safety_brand: {
    description: {
      measures: "保安・安全に関する社会的信頼度。重大事故・是正命令等の発生件数",
      measurement:
        "行政処分・重大インシデント・大規模苦情の発生件数を集計 /* TODO: 計測対象の定義確認 */",
      targetRationale:
        "100年企業として築いた保安ブランドの維持。一度の失墜は10年で取り戻せない",
    },
  },
  jcsi: {
    description: {
      measures:
        "日本版顧客満足度指数。サービス産業生産性協議会の業界別CS調査スコア",
      measurement: "SPRINGの年次JCSI調査における電気・ガス業界での評価",
      targetRationale:
        "業界トップクラス（上位5社以内）を5年連続維持。顧客LTVとの強い相関 /* TODO: 西部ガスの現在の順位確認 */",
    },
  },
  ltv: {
    description: {
      measures: "1顧客（戸）あたりの生涯価値。契約期間 × 年間取引額",
      measurement:
        "顧客データから契約継続年数と平均年商を算出（新規・既存別に集計） /* TODO: 算出方法確認 */",
      targetRationale:
        "解約率低減と単価向上による試算。電気事業者との競争激化を踏まえた水準 /* TODO: 中期計画との整合確認 */",
    },
  },
  recruit: {
    description: {
      measures: "採用目標達成率と早期離職率を統合した採用力指標",
      measurement:
        "採用計画に対する実績充足率 × 入社1年以内の定着率 /* TODO: 算出方法確認 */",
      targetRationale: "インフラ事業の継続性を担保する人財確保。労働市場の競争激化に対応",
    },
  },
  region: {
    description: {
      measures:
        "地域社会との共創プロジェクト（自治体・住民・地元企業との協働事業）の年間実施件数",
      measurement: "地域貢献活動・包括連携協定・地域課題解決事業の実施件数を集計",
      targetRationale:
        "ガス事業の地域密着性を活かした事業拡大の基盤。中期経営計画の地域戦略に整合 /* TODO: 中期計画との整合確認 */",
    },
  },
  esg: {
    description: {
      measures: "主要ESG評価機関による外部評価のスコア",
      measurement:
        "MSCI ESG・Sustainalytics・FTSE等、主要評価機関のレーティングを集約 /* TODO: 参照する評価機関確認 */",
      targetRationale: "業界トップ層の評価獲得。投資家のESG重視傾向に対応",
    },
    reference: "Wilberg 2025",
  },
  poc: {
    description: {
      measures:
        "社外パートナー（スタートアップ・大学・他社）との共創型実証実験の年間実施数",
      measurement:
        "共創プロジェクト管理台帳に登録されたPoC実施件数 /* TODO: カウント対象の定義確認 */",
      targetRationale: "新規事業創出の前段階としてのPoC量。革新的事業開発のリードタイム逆算",
    },
  },
  co2: {
    description: {
      measures:
        "自社事業活動および提供サービスによる年間のCO2削減貢献量（Scope3含む）",
      measurement:
        "高効率機器販売・再エネ供給・カーボンクレジット等の削減効果を算出",
      targetRationale:
        "2050年カーボンニュートラル目標から逆算した中間目標。SBT認定基準に整合",
    },
  },

  // ─── 列5: 財務評価・企業価値 ───
  sales_effect: {
    description: {
      measures: "人的資本投資（6,000P）による年間売上増加効果",
      measurement: "各KPI改善が売上に与える影響を回帰モデルで試算",
      targetRationale: "投資ポイント1Pあたり10万円換算（柳モデル）からの逆算",
    },
  },
  // backend ID は revenue。仕様書上の表記名は「売上ドライバー」(sales_driver)
  revenue: {
    description: {
      measures: "売上構成要素（顧客数 × 単価 × 継続率）の総合的な伸び率",
      measurement: "主要事業セグメントの売上分解と前年同期比",
      targetRationale:
        "インフラ事業の安定性を維持しつつ新規領域での成長を組み込む /* TODO: 目標値（%）確定 */",
    },
  },
  // backend ID は cost。仕様書上の表記名は「コスト削減」(cost_reduction)
  cost: {
    description: {
      measures: "人的資本投資による業務効率化・離職コスト低減等のコスト削減効果",
      measurement: "業務時間削減・採用コスト削減・離職コスト削減の合算",
      targetRationale: "過去5年の人事施策効果実績からの推定値 /* TODO: 目標値（%）確定 */",
    },
  },
  // backend ID は capital。仕様書上の表記名は「資本効率化」(capital_efficiency)
  capital: {
    description: {
      measures: "投下資本に対するリターン効率の改善度合い",
      measurement: "ROA・資本回転率等の効率指標の前年比改善",
      targetRationale: "中期経営計画の資本効率目標に整合 /* TODO: 目標値（%）確定 */",
    },
  },
  roic: {
    description: {
      measures: "投下資本利益率。事業に投じた資本がどれだけ利益を生んだか",
      measurement: "NOPAT（税引後営業利益） ÷ 投下資本（有利子負債 + 自己資本）",
      targetRationale:
        "WACC（加重平均資本コスト）を上回る水準。エクイティスプレッドの観点",
    },
  },
  roe: {
    description: {
      measures: "自己資本利益率。株主資本がどれだけ効率的に利益を生んだか",
      measurement: "当期純利益 ÷ 自己資本",
      targetRationale: "株主資本コスト（CAPM算出）を上回る水準。柳モデルでの企業価値創出",
    },
  },
};
