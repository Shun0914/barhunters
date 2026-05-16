import { apiFetch } from "@/lib/api";

import type {
  MyPointsByGenreResponse,
  OrgMemberPointsByGenreResponse,
} from "@/lib/api/types";

function fyMonthQuery(fy: string, month: number): string {
  const p = new URLSearchParams({ fy, month: String(month) });
  return `?${p.toString()}`;
}

/** 自分のジャンル別ポイント（FY 頭〜選択月末の累積、承認済のみ）。 */
export function fetchMyPointsByGenre(fy: string, month: number) {
  return apiFetch<MyPointsByGenreResponse>(
    `/api/users/me/points-by-genre${fyMonthQuery(fy, month)}`,
  );
}

/** 自分の所属 org メンバー×ジャンル（課長・部長のみ。403 は呼び出し側で処理）。 */
export function fetchOrgMemberPointsByGenre(fy: string, month: number) {
  return apiFetch<OrgMemberPointsByGenreResponse>(
    `/api/dashboard/member-points-by-genre${fyMonthQuery(fy, month)}`,
  );
}
