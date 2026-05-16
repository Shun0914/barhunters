"use client";

type Props = { total: number; annualTarget: number };

const BLUE = "#185FA5";
const BLUE_BG = "#E6F1FB";

export function TotalPointsCard({ total, annualTarget }: Props) {
  const ratio =
    annualTarget > 0 ? Math.max(0, Math.min(1, total / annualTarget)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-ink-primary">合計ポイント</h2>
        <span className="text-[11px] text-ink-secondary">フィルター対象</span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-medium text-ink-secondary">=</span>
          <span
            className="text-[30px] font-bold leading-none tabular-nums"
            style={{ color: BLUE }}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-[14px] font-medium" style={{ color: BLUE }}>
            P
          </span>
        </div>

        <div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: BLUE_BG }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, background: BLUE }}
            />
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[12px] tabular-nums">
            <span className="text-ink-secondary">
              {total.toLocaleString()} / {annualTarget.toLocaleString()} P
            </span>
            <span className="font-semibold" style={{ color: BLUE }}>
              {percent}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
