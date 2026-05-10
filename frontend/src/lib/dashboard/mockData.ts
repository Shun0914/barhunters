// フィルター入力からダッシュボード表示データを合成するモックロジック。
// 本実装では集計バックエンド（人事DB / ポイント DB）と連携する想定 /* TODO: API 連携 */。

import type { DashboardData, DashboardFilter } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeDashboardData(filter: DashboardFilter): DashboardData {
  // 部署数・役職数で揺らす簡易係数（範囲に丸める）
  const deptFactor = clamp(filter.departments.length / 3, 0.3, 1.5);
  const roleFactor = clamp(filter.roles.length / 3, 0.3, 1.2);
  const f = deptFactor * roleFactor;

  const matrix = {
    daily: {
      social: Math.round(200 * f),
      safety: Math.round(150 * f),
      future: Math.round(100 * f),
    },
    cross: {
      social: Math.round(180 * f),
      safety: Math.round(220 * f),
      future: Math.round(90 * f),
    },
    creative: {
      social: Math.round(110 * f),
      safety: Math.round(140 * f),
      future: Math.round(263 * f),
    },
  };

  const totalPoints =
    matrix.daily.social +
    matrix.daily.safety +
    matrix.daily.future +
    matrix.cross.social +
    matrix.cross.safety +
    matrix.cross.future +
    matrix.creative.social +
    matrix.creative.safety +
    matrix.creative.future;

  return {
    activeRate: clamp(Math.round(38 * f), 0, 100),
    activeRateMoM: -2,
    activeRateVsCompany: 2,
    oneOnOneTotal: Math.round(30 * f),
    oneOnOneBreakdown: {
      seniorToLead: 12.7,
      leadToChief: 21.4,
      chiefToGeneral: 35.7,
      leadToGeneral: 30.2,
    },
    matrix,
    totalPoints,
  };
}
