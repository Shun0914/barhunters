"use client";

import { useEffect, useMemo, useState } from "react";

import { ActiveRateCard } from "@/components/dashboard/ActiveRateCard";
import { ActivityMatrixCard } from "@/components/dashboard/ActivityMatrixCard";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { MemberPointsByGenreSection } from "@/components/dashboard/MemberPointsByGenreSection";
import { OneOnOneCard } from "@/components/dashboard/OneOnOneCard";
import { TotalPointsCard } from "@/components/dashboard/TotalPointsCard";
import { PageHeader } from "@/components/PageHeader";
import { apiFetch } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";
import { computeDashboardData } from "@/lib/dashboard/mockData";
import type { DashboardFilter } from "@/lib/dashboard/types";

function isManagerLikeRole(role: string | null | undefined): boolean {
  return role === "課長" || role === "部長";
}

export function DashboardPageClient() {
  const [filter, setFilter] = useState<DashboardFilter>({
    company: "SAIBU",
    hq: "SALES",
    departments: ["福岡リビング営業部"],
    roles: ["部長", "課長"],
    fiscalYear: "FY2026",
    month: 5,
  });

  const [me, setMe] = useState<UserBrief | null>(null);

  useEffect(() => {
    apiFetch<UserBrief>("/api/users/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const data = useMemo(() => computeDashboardData(filter), [filter]);
  const showMemberPoints = isManagerLikeRole(me?.role);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="ダッシュボード" />
      <div className="min-h-0 flex-1 overflow-hidden bg-[#faf8f5] px-6 pb-4 pt-2">
        <div className="grid h-full min-h-0 grid-cols-[1fr_220px] gap-2">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div className="grid min-h-0 shrink-0 grid-cols-2 grid-rows-2 gap-2">
              <ActiveRateCard data={data} />
              <OneOnOneCard data={data} />
              <ActivityMatrixCard data={data} />
              <TotalPointsCard total={data.totalPoints} annualTarget={data.annualTarget} />
            </div>
            {showMemberPoints ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <MemberPointsByGenreSection fyLabel={filter.fiscalYear} month={filter.month} />
              </div>
            ) : null}
          </div>
          <FilterPanel filter={filter} onChange={setFilter} />
        </div>
      </div>
    </div>
  );
}
