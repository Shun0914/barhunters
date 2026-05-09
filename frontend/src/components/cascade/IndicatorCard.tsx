"use client";

import { Search } from "lucide-react";

import type { Reliability } from "@/lib/cascade/types";
import { cn } from "@/lib/utils";

import { useRegisterCard } from "./CascadeContext";

type Props = {
  id: string;
  label: string;
  description?: string | null;
  target?: number | null;
  unit?: string | null;
  emphasis?: "main" | "default";
  selected?: boolean;
  highlighted?: boolean;
  /** 焦点（hover/click）が立っていて、自身がチェーンに含まれない場合 true。 */
  dimmed?: boolean;
  reliability?: Reliability | null;
  onClick?: () => void;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  onOpenDetail?: (id: string) => void;
};

export function formatNum(
  v: number | null | undefined,
  unit?: string | null,
): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "スコア") return v.toFixed(2);
  if (unit === "名") return `${Math.round(v).toLocaleString()}名`;
  if (unit === "件") return `${Math.round(v)}件`;
  if (unit === "万kW") return `${v.toFixed(1)}万kW`;
  if (unit === "万t") return `${v.toFixed(1)}万t`;
  if (unit === "千円/戸") return `${Math.round(v)}千円/戸`;
  if (unit === "年連続") return `${Math.round(v)}年連続`;
  if (unit === "指数") return `${Math.round(v)}指数`;
  if (unit === "億円") return `${v >= 0 ? "+" : ""}${v.toFixed(1)} 億円`;
  return String(v);
}

function ReliabilityStars({ reliability }: { reliability: Reliability }) {
  // ★★★ / ★★ / ★ — 埋まった★と空の☆で 3 段階を表現（色は accent で統一）
  const filled = reliability.length;
  const empty = 3 - filled;
  return (
    <span className="text-[12px] leading-none text-brand-accent">
      {"★".repeat(filled)}
      {"☆".repeat(empty)}
    </span>
  );
}

export function IndicatorCard({
  id,
  label,
  description,
  target,
  unit,
  emphasis = "default",
  selected,
  highlighted,
  dimmed,
  reliability,
  onClick,
  onHoverEnter,
  onHoverLeave,
  onOpenDetail,
}: Props) {
  const isMain = emphasis === "main";
  const setRef = useRegisterCard(id);
  const hasTarget = target !== null && target !== undefined;
  // hover / click を視覚的に統一：いずれもチェーン焦点。
  const isFocused = !!selected;
  const inChain = isFocused || !!highlighted;

  return (
    <button
      ref={setRef}
      data-card-id={id}
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onFocus={onHoverEnter}
      onBlur={onHoverLeave}
      title={description ?? undefined}
      className={cn(
        "group relative w-full rounded-lg border border-transparent bg-card text-left shadow-sm transition-all duration-150",
        "hover:shadow-md",
        isMain ? "p-3" : "p-2",
        isMain && "border-brand-primary/40 bg-brand-bg-light",
        inChain && "ring-2 ring-brand-primary ring-offset-1 bg-brand-bg-light",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span
          className={cn(
            "truncate text-[13px] font-medium leading-tight",
            isMain ? "text-brand-primary" : "text-ink-primary",
          )}
        >
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {reliability ? <ReliabilityStars reliability={reliability} /> : null}
          <span
            role="button"
            tabIndex={0}
            aria-label="詳細を表示"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.(id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpenDetail?.(id);
              }
            }}
            className="inline-flex cursor-pointer items-center rounded p-0.5 text-ink-secondary hover:bg-brand-bg-light hover:text-ink-primary"
          >
            <Search className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="mt-0.5 flex items-baseline gap-1.5">
        {hasTarget ? (
          <>
            <div
              className={cn(
                "font-bold tabular-nums leading-tight text-ink-primary",
                isMain ? "text-3xl text-brand-primary" : "text-[18px]",
              )}
            >
              {formatNum(target, unit)}
            </div>
            <span
              className={cn(
                "text-ink-secondary",
                isMain ? "text-xs" : "text-[11px]",
              )}
            >
              目標
            </span>
          </>
        ) : description ? (
          <div className="line-clamp-2 text-[11px] leading-snug text-ink-secondary">
            {description}
          </div>
        ) : (
          <div className="text-base text-ink-secondary">—</div>
        )}
      </div>

      {isMain && description ? (
        <div className="mt-1 line-clamp-2 text-[10px] text-ink-secondary">
          {description}
        </div>
      ) : null}
    </button>
  );
}
