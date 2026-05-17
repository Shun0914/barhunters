"use client";

import type { DashboardData } from "@/lib/dashboard/types";

type Props = { data: DashboardData };

type SegmentKey = keyof DashboardData["oneOnOneBreakdown"];

// 4 色 blue ramp（濃 → 薄）。棒と凡例で共通。
const BARS: { key: SegmentKey; label: string; color: string }[] = [
  { key: "seniorToLead", label: "部長↔課長", color: "#185FA5" },
  { key: "leadToChief", label: "課長↔係長", color: "#3D86C7" },
  { key: "chiefToGeneral", label: "係長↔一般", color: "#6FA9DD" },
  { key: "leadToGeneral", label: "課長↔一般", color: "#A3CAE9" },
];

// SVG viewBox（縦軸ラベルなし・X軸ラベルなし、値テキスト + バーのみで縦を詰める）。
const VB_W = 100;
const VB_H = 80;
const BAR_AREA_TOP = 12;
const BAR_AREA_BOTTOM = 72;
const BAR_AREA_HEIGHT = BAR_AREA_BOTTOM - BAR_AREA_TOP;
const BAR_WIDTH = 14;
const SLOT_WIDTH = 22;
const GROUP_X0 =
  (VB_W - SLOT_WIDTH * BARS.length) / 2 + (SLOT_WIDTH - BAR_WIDTH) / 2;

/** 棒グラフの表示幅（px）。凡例は w-fit のためグラフ側を大きくしてカード内バランスを取る。 */
const CHART_WIDTH_PX = 220;

export function OneOnOneCard({ data }: Props) {
  const bars = BARS.map((b) => ({ ...b, value: data.oneOnOneBreakdown[b.key] }));
  const maxValue = Math.max(1, ...bars.map((b) => b.value));

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <h2 className="text-[14px] font-semibold text-ink-primary">1on1 実施状況</h2>

      <div className="flex flex-1 flex-col justify-center gap-3">
        <div className="flex items-end justify-center gap-4">
          {/* 左: 縦棒グラフ（幅を拡大して凡例とのバランスを改善） */}
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="shrink-0"
            style={{ width: CHART_WIDTH_PX, height: "auto" }}
            aria-hidden
          >
            {bars.map((bar, i) => {
              const h = (bar.value / maxValue) * BAR_AREA_HEIGHT;
              const x = GROUP_X0 + i * SLOT_WIDTH;
              const y = BAR_AREA_BOTTOM - h;
              const centerX = x + BAR_WIDTH / 2;
              return (
                <g key={bar.key}>
                  <text
                    x={centerX}
                    y={Math.max(y - 2, 8)}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="600"
                    fill="#185FA5"
                  >
                    {bar.value}
                  </text>
                  <rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={h}
                    fill={bar.color}
                    rx={1}
                  />
                </g>
              );
            })}
          </svg>

          {/* 右: 凡例（flex-1 禁止・行幅は内容にフィット） */}
          <ul className="flex w-max shrink-0 flex-col gap-1 pb-1 text-[11px] text-ink-primary">
            {bars.map((bar) => (
              <li key={bar.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: bar.color }}
                  aria-hidden
                />
                <span className="whitespace-nowrap">{bar.label}</span>
                <span className="min-w-[1.25rem] text-right font-semibold tabular-nums">
                  {bar.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center text-[12px] text-ink-secondary">
          合計{" "}
          <span className="text-[16px] font-bold tabular-nums text-ink-primary">
            {data.oneOnOneTotal}
          </span>{" "}
          件
        </div>
      </div>
    </section>
  );
}
