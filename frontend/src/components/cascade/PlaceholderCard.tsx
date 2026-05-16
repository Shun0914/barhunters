"use client";

import { cn } from "@/lib/utils";

export function PlaceholderCard({ label, hint }: { label: string; hint?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-ink-secondary/30 bg-brand-bg-light/40 p-1.5 text-left",
      )}
    >
      <div className="truncate text-[11px] font-medium text-ink-secondary">{label}</div>
      <div className="mt-px flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-ink-secondary">—</div>
        {hint ? (
          <span className="text-[10px] text-ink-secondary/80">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
