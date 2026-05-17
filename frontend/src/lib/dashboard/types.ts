// /dashboard v3 のフィルター入力とパネル表示データの型定義。

export type Company = "HD" | "SAIBU";
export type Headquarters = "CORPORATE" | "ENERGY" | "SUPPLY" | "SALES";
export type Role = "役員" | "部長" | "課長" | "係長" | "一般社員";

export type FiscalYear = "FY2026" | "FY2025" | "FY2024";
/** 月（1-12）。会計月ではなく暦月。 */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface DashboardFilter {
  /** 会社（複数選択可）。空配列 = フィルタなし（全件対象）。 */
  companies: Company[];
  /** 本部（複数選択可）。空配列 = フィルタなし（全件対象）。 */
  hqs: Headquarters[];
  /** 部署名（複数選択可）。空配列 = フィルタなし（全件対象）。 */
  departments: string[];
  /** 役職（複数選択可）。空配列 = フィルタなし（全件対象）。 */
  roles: Role[];
  /** 期間フィルター（PR-A では UI のみ・データ非連動）。 */
  fiscalYear: FiscalYear;
  month: Month;
  /**
   * クリアモード。true のとき全ダッシュボード数値を 0 で表示する。
   * 「フィルタをクリア」ボタンで true、「全社で見る」やカテゴリ初回選択で false に戻す。
   * 4 カテゴリすべて空配列でも false（=「全件対象」表示）と「0 件対象」を区別する。
   */
  isClearedMode: boolean;
}

export interface DashboardData {
  activeRate: number;             // 0-100（累積モデルで非減少）
  activeRateMoM: number;          // 前月比（pt、≥ 0 前提）
  /** 全社平均比（pt）。全部門選択時は null（"ー" 表示）。 */
  activeRateVsCompany: number | null;
  oneOnOneTotal: number;          // 合計件数
  oneOnOneBreakdown: {
    seniorToLead: number;         // 部長-課長（件数）
    leadToChief: number;          // 課長-係長（件数）
    chiefToGeneral: number;       // 係長-一般（件数）
    leadToGeneral: number;        // 課長-一般（件数）
  };
  matrix: {
    daily: { social: number; safety: number; future: number };
    cross: { social: number; safety: number; future: number };
    creative: { social: number; safety: number; future: number };
  };
  totalPoints: number;            // 集計値
  annualTarget: number;           // 年間目標値（ダミー固定）
}
