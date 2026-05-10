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
  });

  const data = useMemo(() => computeDashboardData(filter), [filter]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="ダッシュボード" />
      <div className="flex-1 overflow-auto bg-[#faf8f5] px-8 pb-8">
        <div className="grid grid-cols-[1fr_1fr_220px] grid-rows-[auto_auto] gap-3">
          <ActiveRateCard data={data} />
          <OneOnOneCard data={data} />
          <FilterPanel
            filter={filter}
            onChange={setFilter}
            className="row-span-2"
          />
          <ActivityMatrixCard data={data} />
          <TotalPointsCard total={data.totalPoints} />
        </div>
      </div>
    </div>
  );
}
