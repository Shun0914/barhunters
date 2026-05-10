"use client";

import type { DashboardData } from "@/lib/dashboard/types";

type Props = { data: DashboardData };

// 4色 blue ramp（ライトトーンから濃トーンへ）
const SEGMENTS: { key: keyof DashboardData["oneOnOneBreakdown"]; label: string; color: string }[] = [
  { key: "seniorToLead",   label: "部長 ↔ 課長",  color: "#9DC4E5" },
  { key: "leadToChief",    label: "課長 ↔ 係長",  color: "#5B9BD5" },
  { key: "chiefToGeneral", label: "係長 ↔ 一般",  color: "#2F77BC" },
  { key: "leadToGeneral",  label: "課長 ↔ 一般",  color: "#185FA5" },
];

const RING_BG = "#EAF1F8";

function MultiArcDonut({
  segments,
  size = 140,
  stroke = 14,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  // 各セグメントの長さと、その手前までの累積を事前計算（描画中の再代入を避ける）。
  const arcs = segments.reduce<{ len: number; offset: number; color: string }[]>(
    (list, s) => {
      const len = (s.value / total) * c;
      const offset = -list.reduce((a, x) => a + x.len, 0);
      return [...list, { len, offset, color: s.color }];
    },
    [],
  );

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
      {arcs.map((a, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={a.color}
          strokeWidth={stroke}
          strokeDasharray={`${a.len} ${c}`}
          strokeDashoffset={a.offset}
        />
      ))}
    </svg>
  );
}

export function OneOnOneCard({ data }: Props) {
  const segments = SEGMENTS.map((s) => ({
    ...s,
    value: data.oneOnOneBreakdown[s.key],
  }));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
      <h2 className="text-[13px] font-medium text-ink-primary">1on1 実施状況</h2>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <MultiArcDonut segments={segments} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-ink-secondary">合計</span>
            <span className="text-[24px] font-bold tabular-nums text-ink-primary">
              {data.oneOnOneTotal}
              <span className="text-[14px] font-medium text-ink-secondary">件</span>
            </span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-1 text-[12px] text-ink-primary">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: s.color }}
                />
                {s.label}
              </span>
              <span className="font-medium tabular-nums text-ink-secondary">
                {s.value.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
