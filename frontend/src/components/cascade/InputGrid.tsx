"use client";

import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/cascade/meta";
import { CATEGORY_KEYS, CATEGORY_LABEL, type CategoryKey, type PointsInput } from "@/lib/cascade/types";
import { cn } from "@/lib/utils";

import { useRegisterCard } from "./CascadeContext";

type Props = {
  values: PointsInput;
  onChange: (key: CategoryKey, value: number) => void;
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

const CAT_DESC: Record<CategoryKey, string> = {
  social: "地域・顧客・社会への貢献",
  safety: "インフラ事業の根幹、保安・品質",
  future: "新規事業・イノベーション",
};

export function InputGrid({
  values,
  onChange,
  highlighted,
  activeId,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: Props) {
  // CATEGORIES の並び順を採用（meta.ts の順）
  const ordered: CategoryKey[] = CATEGORIES.map((c) => c.key as CategoryKey).filter(
    (k): k is CategoryKey => CATEGORY_KEYS.includes(k),
  );
  return (
    <div className="flex flex-col gap-1.5">
      {ordered.map((key) => {
        const isActive = activeId === key;
        const inChain = isActive || highlighted.has(key);
        return (
          <CategoryInput
            key={key}
            categoryKey={key}
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

function CategoryInput({
  categoryKey,
  value,
  isSelected,
  isHighlighted,
  isDimmed,
  onChange,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: {
  categoryKey: CategoryKey;
  value: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onChange: (key: CategoryKey, value: number) => void;
  onSelect: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
}) {
  const setRef = useRegisterCard(categoryKey);

  return (
    <button
      ref={setRef}
      data-card-id={categoryKey}
      type="button"
      onClick={() => onSelect(categoryKey)}
      onMouseEnter={() => onHoverEnter(categoryKey)}
      onMouseLeave={onHoverLeave}
      onFocus={() => onHoverEnter(categoryKey)}
      onBlur={onHoverLeave}
      className={cn(
        "group relative rounded-lg border border-transparent bg-card p-2 text-left shadow-sm transition-all duration-150",
        "hover:shadow-md",
        (isSelected || isHighlighted) &&
          "ring-2 ring-brand-primary ring-offset-1 bg-brand-bg-light",
        isDimmed && "opacity-40",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 h-full w-1 rounded-l-lg", CAT_DOT[categoryKey])}
        aria-hidden
      />
      <div className="flex items-center gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink-primary">
            {CATEGORY_LABEL[categoryKey]}
          </div>
          <div className="truncate text-[10px] text-ink-secondary">
            {CAT_DESC[categoryKey]}
          </div>
        </div>
        <Input
          type="number"
          min={0}
          step={0.1}
          value={value || ""}
          placeholder="0"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange(categoryKey, Math.max(0, Number(e.target.value) || 0))}
          className="h-7 w-[5.5rem] px-1 text-right text-xs font-bold tabular-nums focus-visible:ring-brand-primary"
        />
        <span className="text-[10px] font-semibold text-ink-secondary">pt</span>
      </div>
    </button>
  );
}
