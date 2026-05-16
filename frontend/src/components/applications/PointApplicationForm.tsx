"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createDraft,
  fetchApprovalRoute,
  fetchLatestDraft,
  submitApplication,
  updateDraft,
} from "@/lib/api/applications";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import type {
  ApprovalRoute,
  CategoryKey,
  LevelKey,
  PointApplication,
  PointApplicationDraftIn,
} from "@/lib/api/types";

type FormState = {
  title: string;
  level: LevelKey | "";
  category: CategoryKey | "";
  description: string;
  approver1: string;
  approver2: string;
  approver3: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  level: "",
  category: "",
  description: "",
  approver1: "",
  approver2: "",
  approver3: "",
};

const TITLE_MAX = 50;
const DESCRIPTION_MAX = 500;

// 5/14 合意の 2 値ポイント体系。
const LEVEL_OPTIONS: { value: LevelKey; label: string; base: string }[] = [
  { value: "daily", label: "日常 — 24日に1回、誰でも参加できる行動", base: "0.1P" },
  { value: "creative", label: "創造 — 年数回、新しい価値創出の挑戦", base: "5P" },
];

const CATEGORY_OPTIONS: { value: CategoryKey; label: string; desc: string }[] = [
  { value: "social", label: "社会貢献", desc: "地域・顧客・社会への貢献" },
  { value: "safety", label: "安心安全", desc: "インフラ事業の根幹、保安・品質" },
  { value: "future", label: "未来共創", desc: "新規事業・イノベーション" },
];

function formStateFromApplication(app: PointApplication): FormState {
  return {
    title: app.title ?? "",
    level: (app.level ?? "") as LevelKey | "",
    category: (app.category ?? "") as CategoryKey | "",
    description: app.description ?? "",
    approver1: app.approver_1_user_id ?? "",
    approver2: app.approver_2_user_id ?? "",
    approver3: app.approver_3_user_id ?? "",
  };
}

function payloadFromFormState(form: FormState): PointApplicationDraftIn {
  return {
    title: form.title || null,
    level: form.level === "" ? null : form.level,
    category: form.category === "" ? null : form.category,
    description: form.description || null,
    approver_1_user_id: form.approver1 || null,
    approver_2_user_id: form.approver2 || null,
    approver_3_user_id: form.approver3 || null,
  };
}

export function PointApplicationForm() {
  const router = useRouter();

  const [route, setRoute] = useState<ApprovalRoute | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "submit" | "load-draft">(
    null,
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 初期ロード: 承認ルート
  useEffect(() => {
    let cancelled = false;
    fetchApprovalRoute()
      .then((r) => {
        if (cancelled) return;
        setRoute(r);
        const defaults = r.default_approver_user_ids;
        setForm((prev) => ({
          ...prev,
          approver1: prev.approver1 || defaults[0] || "",
          approver2: prev.approver2 || defaults[1] || "",
          approver3: prev.approver3 || defaults[2] || "",
        }));
      })
      .catch((e) => {
        setGlobalError(
          `初期データの取得に失敗しました: ${
            e instanceof Error ? e.message : "unknown"
          }`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSteps = route?.approval_total_steps ?? 0;

  function validateForSubmit(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.title) errs.title = "タイトルは必須です";
    else if (form.title.length > TITLE_MAX)
      errs.title = `タイトルは ${TITLE_MAX} 文字以内で入力してください`;
    if (form.level === "") errs.level = "活動レベルは必須です";
    if (form.category === "") errs.category = "カテゴリは必須です";
    if (!form.description) errs.description = "活動内容は必須です";
    else if (form.description.length > DESCRIPTION_MAX)
      errs.description = `活動内容は ${DESCRIPTION_MAX} 文字以内で入力してください`;
    if (totalSteps >= 1 && !form.approver1)
      errs.approver_1_user_id = "第1承認者は必須です";
    if (totalSteps >= 2 && !form.approver2)
      errs.approver_2_user_id = "第2承認者は必須です";
    if (totalSteps >= 3 && !form.approver3)
      errs.approver_3_user_id = "第3承認者は必須です";
    return errs;
  }

  async function handleSaveDraft() {
    setBusy("save");
    setGlobalError(null);
    setInfo(null);
    setErrors({});
    try {
      const payload = payloadFromFormState(form);
      const saved =
        applicationId === null
          ? await createDraft(payload)
          : await updateDraft(applicationId, payload);
      setApplicationId(saved.id);
      setInfo(`下書きを保存しました（${new Date().toLocaleTimeString()}）`);
    } catch (e) {
      setGlobalError(
        e instanceof Error ? e.message : "下書き保存に失敗しました",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit() {
    setBusy("submit");
    setGlobalError(null);
    setInfo(null);
    const clientErrs = validateForSubmit();
    if (Object.keys(clientErrs).length > 0) {
      setErrors(clientErrs);
      setBusy(null);
      return;
    }

    try {
      const payload = payloadFromFormState(form);
      const saved =
        applicationId === null
          ? await createDraft(payload)
          : await updateDraft(applicationId, payload);
      const submitted = await submitApplication(saved.id);
      setApplicationId(submitted.id);
      setInfo(
        `申請を送信しました。申請番号: ${submitted.application_number ?? "-"}`,
      );
      setForm({
        ...EMPTY_FORM,
        approver1: route?.default_approver_user_ids[0] || "",
        approver2: route?.default_approver_user_ids[1] || "",
        approver3: route?.default_approver_user_ids[2] || "",
      });
      setApplicationId(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && typeof e.detail === "object" && e.detail) {
        const d = e.detail as { detail?: Record<string, string> };
        if (d.detail) {
          setErrors(d.detail);
        } else {
          setGlobalError(JSON.stringify(e.detail));
        }
      } else {
        setGlobalError(
          e instanceof Error ? e.message : "申請送信に失敗しました",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleLoadDraft() {
    setBusy("load-draft");
    setGlobalError(null);
    setInfo(null);
    try {
      const latest = await fetchLatestDraft();
      if (!latest) {
        setInfo("再開できる下書きはありません。");
        return;
      }
      setApplicationId(latest.id);
      setForm(formStateFromApplication(latest));
      setInfo(
        `最新の下書きを読み込みました（更新: ${new Date(
          latest.updated_at,
        ).toLocaleString()}）`,
      );
    } catch (e) {
      setGlobalError(
        e instanceof Error ? e.message : "下書きの読み込みに失敗しました",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="ポイント申請フォーム" />

      <div className="flex flex-1 flex-col px-8 pb-8 pt-[37px] overflow-hidden bg-white">
      <div className="flex flex-1 flex-col rounded-[5px] border border-slate-200 bg-[#ecf5fa] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-5 pb-3">
          <div className="text-base font-bold text-[#334155]">ポイント申請フォーム</div>
          <button
            type="button"
            onClick={handleLoadDraft}
            disabled={busy !== null}
            className="rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:opacity-50"
          >
            {busy === "load-draft" ? "読込中…" : "下書き再開"}
          </button>
        </div>

        {(globalError || info) && (
          <div className="px-8 py-3">
            {globalError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {globalError}
              </div>
            )}
            {info && (
              <div className="rounded border border-[#3a9e55]/30 bg-[#dff5e3] px-3 py-2 text-sm text-[#3a9e55]">
                {info}
              </div>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pl-8 pr-36 py-5">
          {/* タイトル */}
          <div>
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="title"
            >
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={(e) =>
                setForm((s) => ({ ...s, title: e.target.value }))
              }
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#64748b]">
              {errors.title ? (
                <span className="text-red-500">{errors.title}</span>
              ) : (
                <span />
              )}
              <span>{form.title.length}/{TITLE_MAX}</span>
            </div>
          </div>

          {/* 活動レベル */}
          <div>
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="level"
            >
              活動レベル <span className="text-red-500">*</span>
            </label>
            <div className="relative w-[420px] max-w-full">
              <select
                id="level"
                value={form.level}
                onChange={(e) =>
                  setForm((s) => ({ ...s, level: e.target.value as LevelKey | "" }))
                }
                className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none ${
                  form.level === "" ? "text-slate-300" : "text-[#334155]"
                }`}
              >
                <option value="">レベルを選択</option>
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.base}  {o.label}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] leading-none text-[#334155]"
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
            <div className="mt-1 text-xs text-[#64748b]">
              役職傾斜（管理職 ×3.0 / それ以外 ×1.0）はサーバ側で自動付与されます。
            </div>
            {errors.level && (
              <div className="mt-1 text-xs text-red-500">{errors.level}</div>
            )}
          </div>

          {/* カテゴリ */}
          <div>
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="category"
            >
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="relative w-[420px] max-w-full">
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    category: e.target.value as CategoryKey | "",
                  }))
                }
                className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none ${
                  form.category === "" ? "text-slate-300" : "text-[#334155]"
                }`}
              >
                <option value="">カテゴリを選択</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.desc}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] leading-none text-[#334155]"
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
            {errors.category && (
              <div className="mt-1 text-xs text-red-500">{errors.category}</div>
            )}
          </div>

          {/* 活動内容 */}
          <div className="flex min-h-0 flex-1 flex-col">
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="description"
            >
              活動内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              className="min-h-0 w-full flex-1 resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#64748b]">
              {errors.description ? (
                <span className="text-red-500">{errors.description}</span>
              ) : (
                <span />
              )}
              <span>
                {form.description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          {/* 承認者欄: 既存のままレイアウトを維持（必要なら別 PR で再構成） */}
          {totalSteps >= 1 && (
            <ApproverPickRow
              label="第1承認者"
              required
              value={form.approver1}
              candidates={route?.candidates_per_step[0] ?? []}
              onChange={(v) => setForm((s) => ({ ...s, approver1: v }))}
              error={errors.approver_1_user_id}
            />
          )}
          {totalSteps >= 2 && (
            <ApproverPickRow
              label="第2承認者"
              required
              value={form.approver2}
              candidates={route?.candidates_per_step[1] ?? []}
              onChange={(v) => setForm((s) => ({ ...s, approver2: v }))}
              error={errors.approver_2_user_id}
            />
          )}
          {totalSteps >= 3 && (
            <ApproverPickRow
              label="第3承認者"
              required
              value={form.approver3}
              candidates={route?.candidates_per_step[2] ?? []}
              onChange={(v) => setForm((s) => ({ ...s, approver3: v }))}
              error={errors.approver_3_user_id}
            />
          )}

          {/* アクション */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={busy !== null}
              className="rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:opacity-50"
            >
              {busy === "save" ? "保存中…" : "下書き保存"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy !== null}
              className="rounded bg-[#0178C8] px-8 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0167a8] disabled:opacity-50"
            >
              {busy === "submit" ? "送信中…" : "申請"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function ApproverPickRow({
  label,
  required,
  value,
  candidates,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  candidates: { id: string; name: string }[];
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-[#334155]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="relative w-[420px] max-w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none ${
            value === "" ? "text-slate-300" : "text-[#334155]"
          }`}
        >
          <option value="">承認者を選択</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] leading-none text-[#334155]"
          aria-hidden="true"
        >
          ▼
        </span>
      </div>
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}
