import { Fragment } from "react";

import type { PointApplication } from "@/lib/api/types";

// S-02 / S-04 で共通利用する詳細パネル部品（spec.md §3.6 / §3.7 — 共通コンポーネント）

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}\n${hh}:${mi}`;
}

export function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold text-[#334155]">{label}</div>
      {multiline ? (
        <div className="min-h-[80px] whitespace-pre-wrap rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155]">
          {value}
        </div>
      ) : (
        <div className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155]">
          {value}
        </div>
      )}
    </div>
  );
}

export function PointsField({ points }: { points: number | null }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold text-[#334155]">ポイント数</div>
      <div className="relative w-[154px]">
        <div className="rounded border border-slate-300 bg-white px-3 py-2 pr-8 text-right text-sm text-[#334155]">
          {points ?? "—"}
        </div>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#64748b]">
          P
        </span>
      </div>
    </div>
  );
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
    </svg>
  );
}

export function ApprovalRouteView({
  approvers,
  currentStep,
  status,
  returnedByUserId,
}: {
  approvers: readonly {
    step: number;
    name: string | null;
    userId: string | null;
  }[];
  currentStep: number | null;
  status: PointApplication["status"];
  returnedByUserId?: string | null;
}) {
  // 差戻し時は returned_by の段を特定して、それより前を「承認済(青)」、当該段を「差戻し人(赤)」、以降を「未着手(グレー)」
  const returnedStep =
    status === "returned" && returnedByUserId
      ? approvers.find((a) => a.userId === returnedByUserId)?.step ?? null
      : null;

  return (
    <div className="flex items-end gap-3">
      {approvers.map((a, idx) => {
        let colorClass = "text-[#94a3b8]";
        if (status === "returned" && returnedStep !== null) {
          if (a.step === returnedStep) colorClass = "text-red-500";
          else if (a.step < returnedStep) colorClass = "text-[#0178C8]";
        } else {
          const isCurrent = status === "submitted" && a.step === currentStep;
          const isCompleted =
            status === "approved" ||
            (currentStep !== null && a.step < currentStep);
          if (isCurrent) colorClass = "text-red-500";
          else if (isCompleted) colorClass = "text-[#0178C8]";
        }
        return (
          <Fragment key={a.step}>
            <div className="flex w-20 flex-col items-center gap-1">
              <div className="text-[10px] text-[#64748b]">第{a.step}承認者</div>
              <PersonIcon className={colorClass} />
              <div className="w-full truncate text-center text-[10px] text-[#334155]">
                {a.name || "—"}
              </div>
            </div>
            {idx < approvers.length - 1 && (
              <div className="mb-5 text-base text-[#94a3b8]">→</div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/** 申請オブジェクトから ApprovalRouteView 用の `approvers` 配列を作る。 */
export function buildApprovers(
  app: PointApplication,
): readonly { step: number; name: string | null; userId: string | null }[] {
  const total = app.approval_total_steps ?? 0;
  return (
    [
      { step: 1, name: app.approver_1_name, userId: app.approver_1_user_id },
      { step: 2, name: app.approver_2_name, userId: app.approver_2_user_id },
      { step: 3, name: app.approver_3_name, userId: app.approver_3_user_id },
    ] as const
  ).filter((a) => a.step <= total);
}
