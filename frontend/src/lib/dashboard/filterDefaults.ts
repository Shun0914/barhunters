// フィルター初期値・「全社で見る」ボタンで使う全選択状態のヘルパ。
// pageClient と FilterPanel で共有する。

import { HD_DEPARTMENTS, ROLES, SAIBU_HQ } from "./org";
import type {
  Company,
  DashboardFilter,
  FiscalYear,
  Headquarters,
  Month,
} from "./types";

const ALL_COMPANIES: Company[] = ["HD", "SAIBU"];
const ALL_HQS: Headquarters[] = ["CORPORATE", "ENERGY", "SUPPLY", "SALES"];

/** HD + SAIBU 全本部の和集合（重複除外）。「全社で見る」「部署プルダウン」で共通使用。 */
export const ALL_DEPARTMENTS: string[] = Array.from(
  new Set([
    ...HD_DEPARTMENTS,
    ...ALL_HQS.flatMap((h) => SAIBU_HQ[h].departments),
  ]),
);

/** 全 4 カテゴリを全選択状態にしたフィルター。期間（fy / month）は引数で指定。 */
export function createFullFilter(fy: FiscalYear, month: Month): DashboardFilter {
  return {
    companies: [...ALL_COMPANIES],
    hqs: [...ALL_HQS],
    departments: [...ALL_DEPARTMENTS],
    roles: [...ROLES],
    fiscalYear: fy,
    month,
    isClearedMode: false,
  };
}
