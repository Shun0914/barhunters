"use client";

import { cn } from "@/lib/utils";
import { HD_DEPARTMENTS, ROLES, SAIBU_HQ } from "@/lib/dashboard/org";
import type {
  Company,
  DashboardFilter,
  Headquarters,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[12px] font-medium tracking-wide text-ink-secondary">
      {children}
    </div>
  );
}

export function FilterPanel({ filter, onChange, className }: Props) {
  const departmentList: readonly string[] =
    filter.company === "HD"
      ? HD_DEPARTMENTS
      : filter.hq
        ? SAIBU_HQ[filter.hq].departments
        : [];

  const updateCompany = (company: Company) => {
    onChange({
      ...filter,
      company,
      hq: company === "SAIBU" ? (filter.hq ?? "CORPORATE") : null,
      departments: [],
    });
  };

  const updateHq = (hq: Headquarters) => {
    onChange({ ...filter, hq, departments: [] });
  };

  const toggleDepartment = (name: string) => {
    const set = new Set(filter.departments);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange({ ...filter, departments: Array.from(set) });
  };

  const toggleRole = (role: Role) => {
    const set = new Set(filter.roles);
    if (set.has(role)) set.delete(role);
    else set.add(role);
    onChange({ ...filter, roles: Array.from(set) });
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div>
        <SectionTitle>会社</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {COMPANIES.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-primary"
            >
              <input
                type="radio"
                name="company"
                checked={filter.company === c.key}
                onChange={() => updateCompany(c.key)}
                className="accent-brand-primary"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {filter.company === "SAIBU" ? (
        <div>
          <SectionTitle>本部</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {HQ_KEYS.map((h) => (
              <label
                key={h}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-primary"
              >
                <input
                  type="radio"
                  name="hq"
                  checked={filter.hq === h}
                  onChange={() => updateHq(h)}
                  className="accent-brand-primary"
                />
                {SAIBU_HQ[h].label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionTitle>部署</SectionTitle>
        <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1">
          {departmentList.length === 0 ? (
            <span className="text-[12px] text-ink-secondary">
              （本部を選択してください）
            </span>
          ) : (
            departmentList.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-start gap-2 text-[13px] text-ink-primary"
              >
                <input
                  type="checkbox"
                  checked={filter.departments.includes(d)}
                  onChange={() => toggleDepartment(d)}
                  className="mt-0.5 accent-brand-primary"
                />
                <span className="leading-tight">{d}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <hr className="border-black/10" />

      <div>
        <SectionTitle>役職</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {ROLES.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-primary"
            >
              <input
                type="checkbox"
                checked={filter.roles.includes(r)}
                onChange={() => toggleRole(r)}
                className="accent-brand-primary"
              />
              {r}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
