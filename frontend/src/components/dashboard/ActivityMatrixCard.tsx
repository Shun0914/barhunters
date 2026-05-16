"use client";

import type { DashboardData } from "@/lib/dashboard/types";

type Props = { data: DashboardData };

const ACTIONS = [
  { key: "daily", label: "日常×" },
  { key: "cross", label: "越境×" },
  { key: "creative", label: "創造×" },
] as const;

const CATEGORIES = [
  { key: "social", label: "社会貢献" },
  { key: "safety", label: "安心安全" },
  { key: "future", label: "未来共創" },
] as const;

// blue ramp: 90 → #E6F1FB（薄）, 263 → #185FA5（濃）
function rampColor(value: number, min: number, max: number): { bg: string; fg: string } {
  const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  // sRGB lerp between 230,241,251 and 24,95,165
  const r = Math.round(230 + (24 - 230) * t);
  const g = Math.round(241 + (95 - 241) * t);
  const b = Math.round(251 + (165 - 251) * t);
  const fg = t > 0.55 ? "#FFFFFF" : "#185FA5";
  return { bg: `rgb(${r}, ${g}, ${b})`, fg };
}

export function ActivityMatrixCard({ data }: Props) {
  const allValues = ACTIONS.flatMap((a) =>
    CATEGORIES.map((c) => data.matrix[a.key][c.key]),
  );
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <h2 className="text-[14px] font-semibold text-ink-primary">活動マトリクス（合計P）</h2>

      <div className="flex flex-1 flex-col justify-center">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5 text-[12px]">
          <div />
          {CATEGORIES.map((c) => (
            <div
              key={c.key}
              className="flex items-end justify-center pb-0.5 text-ink-secondary"
            >
              {c.label}
            </div>
          ))}

          {ACTIONS.map((a) => (
            <div key={a.key} className="contents">
              <div className="flex items-center pr-2 text-ink-secondary">
                {a.label}
              </div>
              {CATEGORIES.map((c) => {
                const v = data.matrix[a.key][c.key];
                const { bg, fg } = rampColor(v, min, max);
                return (
                  <div
                    key={c.key}
                    className="flex h-10 items-center justify-center rounded-md font-bold tabular-nums"
                    style={{ background: bg, color: fg }}
                  >
                    {v.toLocaleString()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
