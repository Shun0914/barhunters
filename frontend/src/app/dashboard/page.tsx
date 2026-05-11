"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ActiveRateCard } from "@/components/dashboard/ActiveRateCard";
import { ActivityMatrixCard } from "@/components/dashboard/ActivityMatrixCard";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { OneOnOneCard } from "@/components/dashboard/OneOnOneCard";
import { TotalPointsCard } from "@/components/dashboard/TotalPointsCard";
import { computeDashboardData } from "@/lib/dashboard/mockData";
import type { DashboardFilter } from "@/lib/dashboard/types";

export default function DashboardPage() {
  const [filter, setFilter] = useState<DashboardFilter>({
    company: "SAIBU",
    hq: "SALES",
    departments: ["福岡リビング営業部"],
    roles: ["部長", "課長"],
    fiscalYear: "FY2026",
    month: 5,
  });

  const data = useMemo(() => computeDashboardData(filter), [filter]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="ダッシュボード" />
      <div className="flex-1 min-h-0 overflow-hidden bg-[#faf8f5] px-6 pb-4 pt-2">
        <div className="grid h-full grid-cols-[1fr_220px] gap-2">
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <ActiveRateCard data={data} />
            <OneOnOneCard data={data} />
            <ActivityMatrixCard data={data} />
            <TotalPointsCard
              total={data.totalPoints}
              annualTarget={data.annualTarget}
            />
          </div>
          <FilterPanel filter={filter} onChange={setFilter} />
        </div>
      </div>
    </div>
  );
}
