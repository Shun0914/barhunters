// backend/app/schemas/cascade.py の写し。
// 9セル × 3カテゴリ（社会/安全/未来）×3アクション（日常/越境/創造）。

export type Reliability = "★★★" | "★★" | "★";

export type ActionKey = "daily" | "cross" | "creative";
export type CategoryKey = "social" | "safety" | "future";
export type CellKey = `${ActionKey}_${CategoryKey}`;

export const CELL_KEYS: CellKey[] = [
  "daily_social", "daily_safety", "daily_future",
  "cross_social", "cross_safety", "cross_future",
  "creative_social", "creative_safety", "creative_future",
];

export type PointsInput = Record<CellKey, number>;

export const ZERO_POINTS: PointsInput = CELL_KEYS.reduce(
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
