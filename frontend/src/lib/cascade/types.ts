// backend/app/schemas/cascade.py の写し（v7: 2値ポイント + 3カテゴリ集約）。

export type Reliability = "★★★" | "★★" | "★";

// 申請レベル（base_point 算出元）
export type LevelKey = "daily" | "creative";
// cascade 上流の 3 カテゴリ
export type CategoryKey = "social" | "safety" | "future";

export const CATEGORY_KEYS: CategoryKey[] = ["social", "safety", "future"];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  social: "社会貢献",
  safety: "安心安全",
  future: "未来共創",
};

export const LEVEL_LABEL: Record<LevelKey, string> = {
  daily: "日常",
  creative: "創造",
};

// 1pt 単位の細かい変化を扱うため float（PointsInput は累積最終ポイント）。
export type PointsInput = Record<CategoryKey, number>;

export const ZERO_POINTS: PointsInput = CATEGORY_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: 0 }),
  {} as PointsInput,
);

export interface CardData {
  indicator_id: number | null;
  calc_id: string | null;
  label: string;
  tab_key: string;
  column_key: string;
  sort_order: number;
  link_url: string | null;
  value_display: string;
  current: number | null;
  target: number | null;
  projected: number | null;
  achievement: number | null;
  improvement: number | null;
  reliability: Reliability | null;
  description: string | null;
  unit: string | null;
}

export interface Edge {
  from_id: string;
  to_id: string;
  coefficient: number;
  reliability: Reliability;
  citation: string;
}

export interface YearlyResult {
  year: number;
  roic: number;
  roe: number;
  roic_delta: number;
  roe_delta: number;
}

export interface FinancialSummary {
  sales_effect_m: number;
  sales_effect_oku: number;
  sales_target_oku: number;
  roic_current: number;
  roic_delta: number;
  roic_target: number;
  roe_current: number;
  roe_delta: number;
  roe_target: number;
}

export interface CascadeResponse {
  points: PointsInput;
  points_total: number;
  cards: CardData[];
  connections: Edge[];
  summary: FinancialSummary;
  yearly: YearlyResult[];
  updated_at: string;
}

export interface SimulateRequest {
  points: PointsInput;
}
