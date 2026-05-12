// フィルター入力からダッシュボード表示データを合成するモックロジック。
// 本実装では集計バックエンド（人事DB / ポイント DB）と連携する想定 /* TODO: API 連携 */。

import { HD_DEPARTMENTS, SAIBU_HQ } from "./org";
import type { DashboardData, DashboardFilter } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const ANNUAL_TARGET = 6000;

export function computeDashboardData(filter: DashboardFilter): DashboardData {
  const availableDepartments =
    filter.company === "HD"
      ? HD_DEPARTMENTS.length
      : filter.hq
        ? SAIBU_HQ[filter.hq].departments.length
        : Object.values(SAIBU_HQ).reduce((sum, hq) => sum + hq.departments.length, 0);
  // 部署未選択は「全部門」扱いで、比較表示と数値ロジックの意味を揃える。
  const selectedDepartments =
    filter.departments.length === 0 ? availableDepartments : filter.departments.length;
  // 部署数・役職数で揺らす簡易係数（範囲に丸める）
  const deptFactor = clamp(selectedDepartments / 3, 0.3, 1.5);
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

  // 1on1 件数（整数）。フィルター対象規模に合わせて係数で揺らす（f=1 で合計 30 件）。
  const breakdown = {
    seniorToLead: Math.max(0, Math.round(4 * f)),
    leadToChief: Math.max(0, Math.round(7 * f)),
    chiefToGeneral: Math.max(0, Math.round(11 * f)),
    leadToGeneral: Math.max(0, Math.round(8 * f)),
  };
  const oneOnOneTotal =
    breakdown.seniorToLead +
    breakdown.leadToChief +
    breakdown.chiefToGeneral +
    breakdown.leadToGeneral;

  // 「全部門選択」相当（部署フィルタ空 = 全部門 or 全部選択）→ 全社平均比は意味を持たないため null。
  const isAllDepartments = filter.departments.length === 0;

  return {
    // 累積モデル前提：分子は単調増加・分母は固定 → 率も非減少。
    activeRate: clamp(Math.round(38 * f), 0, 100),
    activeRateMoM: 2,                // 累積モデルなので ≥ 0
    activeRateVsCompany: isAllDepartments ? null : 2,
    oneOnOneTotal,
    oneOnOneBreakdown: breakdown,
    matrix,
    totalPoints,
    annualTarget: ANNUAL_TARGET,
  };
}
