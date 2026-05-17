"use client";

import { Search } from "lucide-react";

import type { Reliability } from "@/lib/cascade/types";
import { cn } from "@/lib/utils";

import { useRegisterCard } from "./CascadeContext";

type Props = {
  id: string;
  label: string;
  description?: string | null;
  /** 静的な現在値（meta.baselineCurrent or backend の current）。LEFT 側に表示。 */
  current?: number | null;
  /** P 入力後の到達値（backend の projected）。RIGHT 側に表示。 */
  projected?: number | null;
  /** P 入力による改善幅（current → projected の差分）。0 のとき current のみ表示。 */
  improvement?: number | null;
  /** 旧プロップ。current が無いカードのフォールバック用に残す。 */
  value?: number | null;
  target?: number | null;
  unit?: string | null;
  /** 数値で表せない指標の質的な現在値テキスト。 */
  qualitativeCurrent?: string | null;
  /** 数値で表せない指標の質的な目標値テキスト。 */
  qualitativeTarget?: string | null;
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
  // % は ROIC/ROE のような小さい値（<10%）を 2 桁、それ以外（ENG 59.4% など）を 1 桁で表示。
  if (unit === "%") {
    const decimals = Math.abs(v) < 10 ? 2 : 1;
    return `${v.toFixed(decimals)}%`;
  }
  if (unit === "スコア") return v.toFixed(2);
  if (unit === "名") return `${Math.round(v).toLocaleString()}名`;
  if (unit === "件") return `${v.toFixed(1)}件`;
  if (unit === "万kW") return `${v.toFixed(1)}万kW`;
  if (unit === "万t") return `${v.toFixed(1)}万t`;
  if (unit === "万件") return `${v.toFixed(1)}万件`;
  if (unit === "千円/戸") return `${v.toFixed(1)}千円/戸`;
  if (unit === "年連続") return `${v.toFixed(1)}年連続`;
  if (unit === "年連続第1位") return `${v.toFixed(1)}年連続第1位`;
  if (unit === "指数") return `${v.toFixed(1)}指数`;
  if (unit === "日") return `${v.toFixed(2)}日`;
  if (unit === "億円") return `${v >= 0 ? "+" : ""}${v.toFixed(1)} 億円`;
  if (unit === "億kWh") return `${v.toFixed(1)} 億kWh`;
  return String(v);
}

/** 単位ごとのデルタ表示（差分の符号付き）。 */
export function deltaText(delta: number, unit?: string | null): string {
  if (delta === 0) return "±0";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (unit === "%") {
    // ROIC/ROE の +0.176pt のような微小値は 3 桁、それ以外（KPI の +5.6pt 等）は 1 桁。
    const decimals = abs < 1 ? 3 : 1;
    return `${sign}${abs.toFixed(decimals)}pt`;
  }
  if (unit === "スコア") return `${sign}${abs.toFixed(2)}`;
  if (unit === "億円") return `${sign}${abs.toFixed(1)}億円`;
  if (unit === "億kWh") return `${sign}${abs.toFixed(1)}億kWh`;
  if (unit === "万件") return `${sign}${abs.toFixed(1)}万件`;
  if (unit === "万t") return `${sign}${abs.toFixed(1)}万t`;
  if (unit === "万kW") return `${sign}${abs.toFixed(1)}万kW`;
  if (unit === "件") return `${sign}${abs.toFixed(1)}件`;
  if (unit === "名") return `${sign}${Math.round(abs).toLocaleString()}名`;
  if (unit === "年連続" || unit === "年連続第1位") return `${sign}${abs.toFixed(1)}年`;
  if (unit === "千円/戸") return `${sign}${abs.toFixed(1)}千円/戸`;
  if (unit === "指数") return `${sign}${abs.toFixed(1)}`;
  if (unit === "日") return `${sign}${abs.toFixed(2)}日`;
  return `${sign}${abs.toFixed(1)}`;
}

export function IndicatorCard({
  id,
  label,
  description,
  current,
  projected,
  improvement,
  value,
  target,
  unit,
  qualitativeCurrent,
  qualitativeTarget,
  emphasis = "default",
  selected,
  highlighted,
  dimmed,
  onClick,
  onHoverEnter,
  onHoverLeave,
  onOpenDetail,
}: Props) {
  const isMain = emphasis === "main";
  const setRef = useRegisterCard(id);
  // v2.6: current + projected が来ているカードは「現状 → 達成時」を描画。
  // 後方互換のため、来ていなければ旧 value → target の挙動にフォールバック。
  const hasCurrentProjected =
    current !== null && current !== undefined && projected !== null && projected !== undefined;
  const hasNumericProgress =
    !hasCurrentProjected &&
    value !== null &&
    value !== undefined &&
    target !== null &&
    target !== undefined;
  const hasQualitative = !!qualitativeTarget;
  const hasNumericTarget = target !== null && target !== undefined;
  const isFocused = !!selected;
  const inChain = isFocused || !!highlighted;
  // 改善幅 0（または projected===current）→ 横棒のみで現状値を強調表示。
  const effectiveImprovement = improvement ?? (
    hasCurrentProjected ? (projected as number) - (current as number) : null
  );
  const hasImprovement =
    effectiveImprovement !== null &&
    effectiveImprovement !== undefined &&
    Math.abs(effectiveImprovement) > 1e-9;
  const delta = hasNumericProgress ? (target as number) - (value as number) : null;

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
        isMain ? "p-2" : "p-1.5",
        isMain && "border-brand-primary/40 bg-brand-bg-light",
        inChain && "ring-2 ring-brand-primary ring-offset-1 bg-brand-bg-light",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span
          className={cn(
            "truncate text-[12px] font-medium leading-tight",
            isMain ? "text-brand-primary" : "text-ink-primary",
          )}
        >
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
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
            <Search className="h-3 w-3" />
          </span>
        </div>
      </div>

      <div className="mt-0.5">
        {hasQualitative ? (
          <div
            className={cn(
              "leading-tight text-ink-primary",
              isMain ? "text-[13px]" : "text-[11px]",
            )}
          >
            {qualitativeCurrent ? (
              <>
                <span className="text-ink-secondary">{qualitativeCurrent}</span>
                <span className="mx-1 text-ink-secondary">→</span>
              </>
            ) : null}
            <span className="font-semibold">{qualitativeTarget}</span>
          </div>
        ) : hasCurrentProjected ? (
          <>
            <div
              className={cn(
                "font-bold tabular-nums leading-tight",
                isMain ? "text-xl text-brand-primary" : "text-[15px] text-ink-primary",
              )}
            >
              <span className="transition-all duration-300 ease-out">
                {formatNum(current, unit)}
              </span>
              {hasImprovement ? (
                <>
                  <span className="mx-1 text-xs font-normal text-ink-secondary">
                    →
                  </span>
                  <span>{formatNum(projected, unit)}</span>
                </>
              ) : null}
            </div>
            {hasImprovement ? (
              <div
                className={cn(
                  "mt-0 text-[10px] tabular-nums",
                  (effectiveImprovement as number) > 0
                    ? "text-status-ok-fg"
                    : "text-status-ng-fg",
                )}
              >
                {deltaText(effectiveImprovement as number, unit)}
              </div>
            ) : (
              <div className="mt-0 text-[10px] tabular-nums text-ink-secondary">
                −
              </div>
            )}
          </>
        ) : hasNumericProgress ? (
          <>
            <div
              className={cn(
                "font-bold tabular-nums leading-tight",
                isMain ? "text-xl text-brand-primary" : "text-[15px] text-ink-primary",
              )}
            >
              <span className="transition-all duration-300 ease-out">
                {formatNum(value, unit)}
              </span>
              <span className="mx-1 text-xs font-normal text-ink-secondary">
                →
              </span>
              <span>{formatNum(target, unit)}</span>
            </div>
            {delta !== null && delta !== 0 ? (
              <div
                className={cn(
                  "mt-0 text-[10px] tabular-nums",
                  delta > 0 ? "text-status-ok-fg" : "text-status-ng-fg",
                )}
              >
                {deltaText(delta, unit)}
              </div>
            ) : delta === 0 ? (
              <div className="mt-0 text-[10px] tabular-nums text-ink-secondary">
                目標達成
              </div>
            ) : null}
          </>
        ) : hasNumericTarget ? (
          <div className="flex items-baseline gap-1.5">
            <div
              className={cn(
                "font-bold tabular-nums leading-tight",
                isMain ? "text-xl text-brand-primary" : "text-[15px] text-ink-primary",
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
          </div>
        ) : description ? (
          <div className="line-clamp-1 text-[10px] leading-snug text-ink-secondary">
            {description}
          </div>
        ) : (
          <div className="text-sm text-ink-secondary">—</div>
        )}
      </div>

      {isMain && description ? (
        <div className="mt-0.5 line-clamp-1 text-[9px] text-ink-secondary">
          {description}
        </div>
      ) : null}
    </button>
  );
}
