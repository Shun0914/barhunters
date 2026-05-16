"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { HD_DEPARTMENTS, ROLES, SAIBU_HQ } from "@/lib/dashboard/org";
import type {
  Company,
  DashboardFilter,
  FiscalYear,
  Headquarters,
  Month,
  Role,
} from "@/lib/dashboard/types";

type Props = {
  filter: DashboardFilter;
  onChange: (next: DashboardFilter) => void;
  className?: string;
};

const COMPANIES: { key: Company; label: string }[] = [
  { key: "HD", label: "西部ガスHD" },
  { key: "SAIBU", label: "西部ガス" },
];

const HQ_KEYS: Headquarters[] = ["CORPORATE", "ENERGY", "SUPPLY", "SALES"];

const FISCAL_YEARS: FiscalYear[] = ["FY2026", "FY2025", "FY2024"];
// 4月始まり順（4月→3月）。
const MONTHS: Month[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

const EMPTY_FILTER_FIELDS = {
  companies: [] as Company[],
  hqs: [] as Headquarters[],
  departments: [] as string[],
  roles: [] as Role[],
};

function toggleValue<T>(arr: readonly T[], value: T): T[] {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

/**
 * Excel フィルタ風の折りたたみ式プルダウン。
 * - ヘッダーをクリックで展開/折りたたみ
 * - 展開時は「全選択」「全解除」+ チェックボックスリスト
 * - 選択状態バッジ: 未選択 or 全選択 → 「全件対象」、部分選択 → 「N/M選択中」
 */
function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onSelectionChange,
  getLabel,
}: {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onSelectionChange: (next: T[]) => void;
  getLabel: (value: T) => string;
}) {
  const [open, setOpen] = useState(false);

  const total = options.length;
  const count = selected.length;
  // 「未選択 = 全件対象」「全選択 = 結果的に全件対象」を同じバッジで表現する。
  const isAllOrNone = count === 0 || count === total;
  const badge = isAllOrNone ? "全件対象" : `${count}/${total} 選択中`;

  const toggleOne = (value: T) => onSelectionChange(toggleValue(selected, value));
  const selectAll = () => onSelectionChange([...options]);
  const clearAll = () => onSelectionChange([]);

  return (
    <div className="rounded border border-black/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-t px-2 py-1.5 text-left text-[13px] font-medium text-ink-primary hover:bg-brand-bg-light"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] text-ink-secondary">
            {open ? "▲" : "▼"}
          </span>
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            isAllOrNone
              ? "bg-black/5 text-ink-secondary"
              : "bg-brand-primary/10 text-brand-primary",
          )}
        >
          {badge}
        </span>
      </button>
      {open ? (
        <div className="border-t border-black/10 bg-white p-2">
          <div className="mb-1.5 flex gap-1">
            <button
              type="button"
              onClick={selectAll}
              className="flex-1 rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary hover:bg-brand-bg-light hover:text-brand-primary"
            >
              全選択
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary hover:bg-brand-bg-light hover:text-brand-primary"
            >
              全解除
            </button>
          </div>
          <div className="flex max-h-[200px] flex-col gap-1 overflow-y-auto pr-1">
            {options.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-start gap-2 text-[12px] text-ink-primary"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={() => toggleOne(o)}
                  className="mt-0.5 accent-brand-primary"
                />
                <span className="leading-tight">{getLabel(o)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FilterPanel({ filter, onChange, className }: Props) {
  // 全部署リスト（HD + SAIBU 全本部の和集合、重複は除外）。
  // 初期実装では本部選択と部署選択は連動させない（部署一覧は常に全件表示）。
  const allDepartments: string[] = Array.from(
    new Set([
      ...HD_DEPARTMENTS,
      ...HQ_KEYS.flatMap((h) => SAIBU_HQ[h].departments),
    ]),
  );

  const clearAllFilters = () => onChange({ ...filter, ...EMPTY_FILTER_FIELDS });

  // 「🌐 全社で見る」: 全カテゴリのチェックボックスを全選択状態にする。
  // 集計結果は空配列（未選択）と同じ「全件対象」だが、UI 上は全 ON が見える。
  const selectAllFilters = () =>
    onChange({
      ...filter,
      companies: COMPANIES.map((c) => c.key),
      hqs: [...HQ_KEYS],
      departments: [...allDepartments],
      roles: [...ROLES],
    });

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-3 overflow-y-auto rounded-lg border border-black/5 bg-white p-3 shadow-sm",
        className,
      )}
    >
      {/* クイックボタン（最上部） */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={selectAllFilters}
          className="rounded border border-black/10 bg-white px-2 py-1.5 text-[12px] font-medium text-ink-primary hover:bg-brand-bg-light hover:text-brand-primary"
        >
          全社で見る
        </button>
        <button
          type="button"
          onClick={clearAllFilters}
          className="rounded border border-black/10 bg-white px-2 py-1.5 text-[12px] font-medium text-ink-secondary hover:bg-brand-bg-light hover:text-brand-primary"
        >
          フィルタをクリア
        </button>
      </div>

      <hr className="border-black/10" />

      {/* 期間（常時表示） */}
      <div>
        <div className="mb-2 text-[12px] font-medium tracking-wide text-ink-secondary">
          期間
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FISCAL_YEARS.map((fy) => {
              const active = filter.fiscalYear === fy;
              return (
                <button
                  key={fy}
                  type="button"
                  onClick={() => onChange({ ...filter, fiscalYear: fy })}
                  className={cn(
                    "rounded px-2 py-1 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-brand-primary text-white"
                      : "border border-black/10 bg-white text-ink-primary hover:bg-brand-bg-light",
                  )}
                >
                  {fy}
                </button>
              );
            })}
          </div>
          <select
            value={filter.month}
            onChange={(e) =>
              onChange({
                ...filter,
                month: Number(e.target.value) as Month,
              })
            }
            className="rounded border border-black/10 bg-white px-2 py-1 text-[13px] text-ink-primary"
            aria-label="月"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="border-black/10" />

      {/* プルダウンフィルタ */}
      <FilterDropdown
        label="会社"
        options={COMPANIES.map((c) => c.key) as Company[]}
        selected={filter.companies}
        onSelectionChange={(companies) => onChange({ ...filter, companies })}
        getLabel={(key) => COMPANIES.find((c) => c.key === key)?.label ?? key}
      />

      <FilterDropdown
        label="本部"
        options={HQ_KEYS}
        selected={filter.hqs}
        onSelectionChange={(hqs) => onChange({ ...filter, hqs })}
        getLabel={(key) => SAIBU_HQ[key].label}
      />

      <FilterDropdown
        label="部署"
        options={allDepartments}
        selected={filter.departments}
        onSelectionChange={(departments) => onChange({ ...filter, departments })}
        getLabel={(name) => name}
      />

      <FilterDropdown
        label="役職"
        options={ROLES}
        selected={filter.roles}
        onSelectionChange={(roles) => onChange({ ...filter, roles })}
        getLabel={(name) => name}
      />
    </aside>
  );
}
