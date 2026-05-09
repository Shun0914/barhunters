import type { Edge, Reliability } from "./types";

export type Relation = {
  id: string;
  label: string;
  coef: number;
  reliability: Reliability;
};

/** to_id が指定 id の辺を、係数の絶対値が大きい順に並べて返す。 */
export function getUpstream(
  id: string,
  edges: Edge[],
  labelOf: (id: string) => string,
): Relation[] {
  return edges
    .filter((e) => e.to_id === id)
    .map((e) => ({
      id: e.from_id,
      label: labelOf(e.from_id),
      coef: e.coefficient,
      reliability: e.reliability,
    }))
    .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
}

/** from_id が指定 id の辺を、係数の絶対値が大きい順に並べて返す。 */
export function getDownstream(
  id: string,
  edges: Edge[],
  labelOf: (id: string) => string,
): Relation[] {
  return edges
    .filter((e) => e.from_id === id)
    .map((e) => ({
      id: e.to_id,
      label: labelOf(e.to_id),
      coef: e.coefficient,
      reliability: e.reliability,
    }))
    .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
}

export const RELIABILITY_NOTE: Record<Reliability, string> = {
  "★★★": "公知データ・社内実績に基づく強い根拠（年次レポート・採択事例など）",
  "★★": "標準的な係数推定。一般化可能だが個別補正が望ましい",
  "★": "暫定値・要検証。他社事例や仮定からの初期推定",
};
