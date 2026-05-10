// /dashboard v3 のフィルター入力とパネル表示データの型定義。

export type Company = "HD" | "SAIBU";
export type Headquarters = "CORPORATE" | "ENERGY" | "SUPPLY" | "SALES";
export type Role = "役員" | "部長" | "課長" | "係長" | "一般社員";

export interface DashboardFilter {
  company: Company;
  hq: Headquarters | null;       // SAIBU 選択時のみ
  departments: string[];          // 部署名の配列
  roles: Role[];
}

export interface DashboardData {
  activeRate: number;             // 0-100
  activeRateMoM: number;          // 前月比（pt）
  activeRateVsCompany: number;    // 全社平均比（pt）
  oneOnOneTotal: number;
  oneOnOneBreakdown: {
    seniorToLead: number;         // 部長-課長 %
    leadToChief: number;          // 課長-係長 %
    chiefToGeneral: number;       // 係長-一般 %
    leadToGeneral: number;        // 課長-一般 %
  };
  matrix: {
    daily: { social: number; safety: number; future: number };
    cross: { social: number; safety: number; future: number };
    creative: { social: number; safety: number; future: number };
  };
  totalPoints: number;
}
