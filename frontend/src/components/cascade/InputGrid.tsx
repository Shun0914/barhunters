"use client";

import { Input } from "@/components/ui/input";
import { CELL_KEYS, type CategoryKey, type CellKey, type PointsInput } from "@/lib/cascade/types";
import { CELL_LABEL } from "@/lib/cascade/meta";
import { cn } from "@/lib/utils";

import { useRegisterCard } from "./CascadeContext";

type Props = {
  values: PointsInput;
  onChange: (key: CellKey, value: number) => void;
  highlighted: Set<string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
};

const CAT_DOT: Record<CategoryKey, string> = {
  social: "bg-cat-social",
  safety: "bg-cat-safety",
  future: "bg-cat-future",
};

function categoryOf(key: CellKey): CategoryKey {
  return key.split("_")[1] as CategoryKey;
}

export function InputGrid({
  values,
  onChange,
  highlighted,
  activeId,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      {CELL_KEYS.map((key) => {
        const isActive = activeId === key;
        const inChain = isActive || highlighted.has(key);
        return (
          <CellButton
            key={key}
            cellKey={key}
            value={values[key]}
            isSelected={isActive}
            isHighlighted={!isActive && highlighted.has(key)}
            isDimmed={activeId !== null && !inChain}
            onChange={onChange}
            onSelect={onSelect}
            onHoverEnter={onHoverEnter}
            onHoverLeave={onHoverLeave}
          />
        );
      })}
    </div>
  );
}

function CellButton({
  cellKey,
  value,
  isSelected,
  isHighlighted,
  isDimmed,
  onChange,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: {
  cellKey: CellKey;
  value: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onChange: (key: CellKey, value: number) => void;
  onSelect: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
}) {
  const cat = categoryOf(cellKey);
  const setRef = useRegisterCard(cellKey);

  return (
    <button
      ref={setRef}
      data-card-id={cellKey}
      type="button"
      onClick={() => onSelect(cellKey)}
      onMouseEnter={() => onHoverEnter(cellKey)}
      onMouseLeave={onHoverLeave}
      onFocus={() => onHoverEnter(cellKey)}
      onBlur={onHoverLeave}
      className={cn(
        "group relative rounded-lg border border-transparent bg-card p-1.5 text-left shadow-sm transition-all duration-150",
        "hover:shadow-md",
        (isSelected || isHighlighted) &&
          "ring-2 ring-brand-primary ring-offset-1 bg-brand-bg-light",
        isDimmed && "opacity-40",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 h-full w-1 rounded-l-lg", CAT_DOT[cat])}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 pl-1.5">
        <span className="flex-1 truncate text-[12px] font-medium text-ink-primary">
          {CELL_LABEL[cellKey]}
        </span>
        <Input
          type="number"
          min={0}
          step={1}
          value={value || ""}
          placeholder="0"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange(cellKey, Math.max(0, Number(e.target.value) || 0))}
          className="h-6 w-[4.5rem] px-1 text-right text-xs font-bold tabular-nums focus-visible:ring-brand-primary"
        />
        <span className="text-[10px] font-semibold text-ink-secondary">pt</span>
      </div>
    </button>
  );
}
