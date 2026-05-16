"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ICONS } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, apiFetch } from "@/lib/api";

type SubordinateRolesOut = { roles: string[] };

type OneOnOneOut = {
  id: number;
  recorder_id: string;
  partner_role: string;
  pair_type: string;
  conducted_at: string;
  note: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OneOnOneForm() {
  const router = useRouter();

  const [partnerRoles, setPartnerRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [partnerRole, setPartnerRole] = useState("");
  const [conductedAt, setConductedAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SubordinateRolesOut>("/api/one-on-ones/subordinate-roles")
      .then((d) => {
        setPartnerRoles(d.roles);
        if (d.roles.length > 0) setPartnerRole(d.roles[0]);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "選択可能な役職の取得に失敗しました";
        setError(msg);
      })
      .finally(() => setRolesLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<OneOnOneOut>("/api/one-on-ones", {
        method: "POST",
        body: JSON.stringify({
          partner_role: partnerRole,
          conducted_at: conductedAt,
          note: note ? note : null,
        }),
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        const d = e.detail as { detail?: string } | null;
        setError(typeof d?.detail === "string" ? d.detail : `送信に失敗しました（HTTP ${e.status}）`);
      } else {
        setError(e instanceof Error ? e.message : "送信に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!rolesLoading && partnerRoles.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="1on1 実施報告" />
        <div className="flex-1 bg-white px-8 py-6">
          <div className="max-w-md rounded border border-slate-200 bg-[#ecf5fa] p-4 text-sm text-[#334155]">
            あなたの役職では 1on1 の記録はできません。
            <br />
            （部長・課長・係長が、運用どおり記録できる相手役職を選択して報告できます）
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="1on1 実施報告" />
      <div className="flex-1 overflow-auto bg-white px-8 py-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-md space-y-4 rounded-[5px] border border-slate-200 bg-[#ecf5fa] p-5 shadow-sm"
        >
          <div>
            <label
              htmlFor="conductedAt"
              className="mb-1 block text-sm font-bold text-[#334155]"
            >
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              id="conductedAt"
              type="date"
              value={conductedAt}
              onChange={(e) => setConductedAt(e.target.value)}
              required
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="partnerRole"
              className="mb-1 block text-sm font-bold text-[#334155]"
            >
              実施相手の役職 <span className="text-red-500">*</span>
            </label>
            <select
              id="partnerRole"
              value={partnerRole}
              onChange={(e) => setPartnerRole(e.target.value)}
              required
              disabled={rolesLoading || submitting}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {rolesLoading ? (
                <option value="">読み込み中…</option>
              ) : (
                partnerRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              )}
            </select>
            <div className="mt-1 text-xs text-[#64748b]">
              個人名は記録されません（役職のみ）。
            </div>
          </div>

          <div>
            <label
              htmlFor="note"
              className="mb-1 block text-sm font-bold text-[#334155]"
            >
              メモ（任意）
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="話した内容、所感など"
              className="w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || rolesLoading || !partnerRole}
            className="inline-flex items-center gap-2.5 rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              "送信中…"
            ) : (
              <>
                {ICONS.send}
                報告する
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
