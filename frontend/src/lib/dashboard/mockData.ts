// フィルター入力からダッシュボード表示データを合成するモックロジック。
// 本実装では集計バックエンド（人事DB / ポイント DB）と連携する想定 /* TODO: API 連携 */。

import { ALL_DEPARTMENTS } from "./filterDefaults";
import { ROLES } from "./org";
import type { DashboardData, DashboardFilter } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const ANNUAL_TARGET = 6000;

const ALL_COMPANIES_COUNT = 2;
const ALL_HQS_COUNT = 4;

const ZERO_DATA: DashboardData = {
  activeRate: 0,
  activeRateMoM: 0,
  activeRateVsCompany: null,
  oneOnOneTotal: 0,
  oneOnOneBreakdown: {
    seniorToLead: 0,
    leadToChief: 0,
    chiefToGeneral: 0,
    leadToGeneral: 0,
  },
  matrix: {
    daily: { social: 0, safety: 0, future: 0 },
    cross: { social: 0, safety: 0, future: 0 },
    creative: { social: 0, safety: 0, future: 0 },
  },
  totalPoints: 0,
  annualTarget: ANNUAL_TARGET,
};

export function computeDashboardData(filter: DashboardFilter): DashboardData {
  // Excel フィルタ的セマンティクス: いずれかカテゴリが完全空（チェックなし）→ 0 表示。
  // 「フィルタをクリア」（isClearedMode）も同様に 0。
  if (
    filter.isClearedMode ||
    filter.companies.length === 0 ||
    filter.hqs.length === 0 ||
    filter.departments.length === 0 ||
    filter.roles.length === 0
  ) {
    return ZERO_DATA;
  }

  // 各カテゴリの「選択比率」（チェック数 / 総数）。全選択=1.0、半分=0.5。
  // ドライバの内、役職とは特に「減らした分が結果に直接効く」スケール係数として強く効かせる。
  const companyRatio = filter.companies.length / ALL_COMPANIES_COUNT;
  const hqRatio = filter.hqs.length / ALL_HQS_COUNT;
  const deptRatio = filter.departments.length / ALL_DEPARTMENTS.length;
  const roleRatio = filter.roles.length / ROLES.length;

  // 全 4 カテゴリの選択比率の積で f を作る（全選択 → f=1、いずれか減ると比例して減る）。
  const f = companyRatio * hqRatio * deptRatio * roleRatio;

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

  // 1on1 件数（整数）。f=1 で合計 30 件相当。
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

  // 「全部門選択」相当 → 全社平均比は意味を持たないため null。
  const isAllDepartments = filter.departments.length === ALL_DEPARTMENTS.length;

  return {
    activeRate: clamp(Math.round(38 * f), 0, 100),
    activeRateMoM: 2,
    activeRateVsCompany: isAllDepartments ? null : 2,
    oneOnOneTotal,
    oneOnOneBreakdown: breakdown,
    matrix,
    totalPoints,
    annualTarget: ANNUAL_TARGET,
  };
}
