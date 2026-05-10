"use client";

import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard/types";

type Props = { data: DashboardData };

const TEAL = "#1D9E75";
const RING_BG = "#E5EFEC";

function Donut({ percent, size = 140, stroke = 14 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={RING_BG}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={TEAL}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

function DeltaPill({ label, delta }: { label: string; delta: number }) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const tone =
    delta > 0
      ? "text-status-ok-fg bg-status-ok-bg"
      : delta < 0
        ? "text-status-ng-fg bg-status-ng-bg"
        : "text-ink-secondary bg-status-inactive-bg";
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-ink-secondary">{label}</span>
      <span className={cn("rounded px-1.5 py-0.5 font-medium tabular-nums", tone)}>
        {sign}
        {Math.abs(delta).toFixed(1)}pt
      </span>
    </div>
  );
}

export function ActiveRateCard({ data }: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
      <h2 className="text-[13px] font-medium text-ink-primary">アクティブ率</h2>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <Donut percent={data.activeRate} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold tabular-nums text-ink-primary">
              {data.activeRate}
              <span className="text-[16px] font-medium text-ink-secondary">%</span>
            </span>
            <span className="text-[10px] text-ink-secondary">過去30日</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <DeltaPill label="前月比" delta={data.activeRateMoM} />
          <DeltaPill label="全社平均比" delta={data.activeRateVsCompany} />
        </div>
      </div>
    </section>
  );
}
