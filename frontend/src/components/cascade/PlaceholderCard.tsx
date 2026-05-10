"use client";

import { cn } from "@/lib/utils";

export function PlaceholderCard({ label, hint }: { label: string; hint?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-ink-secondary/30 bg-brand-bg-light/40 p-2 text-left",
      )}
    >
      <div className="truncate text-[13px] font-medium text-ink-secondary">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <div className="text-base font-semibold text-ink-secondary">—</div>
        {hint ? (
          <span className="text-[11px] text-ink-secondary/80">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
