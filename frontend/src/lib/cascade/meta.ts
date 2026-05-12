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

// 列4: 事業実績・外部評価（10項目）— ENG主導 → 定着主導 → 挑戦/変革主導 → 横断
// v6: poc を region に統合し、presenteeism / absenteeism を追加
export const MID_IDS = [
  "safety_zero",
  "safety_brand",
  "jcsi",
  "ltv",
  "recruit",
  "esg",
  "region",
  "presenteeism",
  "absenteeism",
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
//   本体は backend/data/indicator_meta.json（Issue #28）。
//   フロントは GET /api/cascade/indicator-meta から fetch する。
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
  /** 目標値（数値）。backend の値より優先。 */
  target?: number | null;
  /** 単位（formatNum で解釈）。backend の unit より優先。 */
  unit?: string | null;
  /** 静的な現在値フォールバック。設定すると 9セル入力では動かない（unit 不一致や非対応の指標で使う）。 */
  baselineCurrent?: number | null;
  /** 数値で表せない指標の質的な現在値テキスト。 */
  qualitativeCurrent?: string;
  /** 数値で表せない指標の質的な目標値テキスト。 */
  qualitativeTarget?: string;
};

/** backend/data/indicator_meta.json の型。取得は fetchIndicatorMeta()。 */
export type IndicatorMetaMap = Record<string, IndicatorMeta>;
