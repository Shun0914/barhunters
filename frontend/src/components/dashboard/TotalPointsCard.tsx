"use client";

type Props = { total: number };

export function TotalPointsCard({ total }: Props) {
  return (
    <section className="flex flex-col items-center justify-center rounded-lg border border-black/5 bg-white p-4 text-center shadow-sm">
      <div className="text-[12px] text-ink-secondary">合計ポイント</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[18px] font-medium text-ink-secondary">=</span>
        <span className="text-[34px] font-bold leading-none tabular-nums text-brand-primary">
          {total.toLocaleString()}
        </span>
        <span className="text-[18px] font-medium text-brand-primary">P</span>
      </div>
    </section>
  );
}
