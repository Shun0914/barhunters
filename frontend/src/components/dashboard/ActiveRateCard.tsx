"use client";

import type { DashboardData } from "@/lib/dashboard/types";

type Props = { data: DashboardData };

const BLUE = "#185FA5";
const BLUE_BG = "#E6F1FB";

// 半円アーク（r=80）の弧長 = π × r ≈ 251.327。
const ARC_LENGTH = Math.PI * 80;

function SemiCircleGauge({ percent }: { percent: number }) {
  const v = Math.max(0, Math.min(100, percent));
  const offset = ARC_LENGTH * (1 - v / 100);
  // viewBox を 10..107 にクロップして縦余白を削減。max-w も小さめにして高さを抑える。
  return (
    <svg viewBox="0 10 200 97" className="w-full max-w-[180px]">
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke={BLUE_BG}
        strokeWidth={16}
        strokeLinecap="round"
      />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke={BLUE}
        strokeWidth={16}
        strokeLinecap="round"
        strokeDasharray={ARC_LENGTH}
        strokeDashoffset={offset}
      />
      <text
        x="100"
        y="92"
        textAnchor="middle"
        fontSize="34"
        fontWeight="600"
        fill={BLUE}
      >
        {Math.round(v)}
        <tspan fontSize="20" fontWeight="500">
          %
        </tspan>
      </text>
    </svg>
  );
}

function StatBlock({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <span className="mt-0.5 text-[18px] font-semibold tabular-nums text-ink-primary">
        {value}
        {unit ? <span className="ml-0.5 text-[12px] font-medium">{unit}</span> : null}
      </span>
    </div>
  );
}

export function ActiveRateCard({ data }: Props) {
  // 累積モデル前提：前月比は ≥ 0、マイナス表示は出ない（仕様）。
  const momText = `+${Math.max(0, data.activeRateMoM).toFixed(1)}`;

  // 全部門選択時は全社平均比が意味を持たないため「ー」表示。
  const vs = data.activeRateVsCompany;
  const vsText =
    vs === null ? "ー" : `${vs >= 0 ? "+" : ""}${vs.toFixed(1)}`;

  return (
    <section className="flex flex-col gap-1 rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <div>
        <h2 className="text-[14px] font-semibold text-ink-primary">アクティブ率</h2>
        <p className="mt-0.5 text-[11px] text-ink-secondary">
          アクティブ率：ポイント獲得数 / 部門総員
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        <div className="flex justify-center">
          <SemiCircleGauge percent={data.activeRate} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBlock label="前月比" value={momText} unit="pt" />
          <StatBlock
            label="全社平均比"
            value={vsText}
            unit={vs === null ? undefined : "pt"}
          />
        </div>
      </div>
    </section>
  );
}
