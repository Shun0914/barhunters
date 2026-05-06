"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createDraft,
  fetchActivityGenres,
  fetchApprovalRoute,
  fetchLatestDraft,
  submitApplication,
  updateDraft,
} from "@/lib/api/applications";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import type {
  ActivityGenre,
  ApprovalRoute,
  PointApplication,
  PointApplicationDraftIn,
} from "@/lib/api/types";

type FormState = {
  title: string;
  activityGenreId: number | "";
  description: string;
  approver1: string;
  approver2: string;
  approver3: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  activityGenreId: "",
  description: "",
  approver1: "",
  approver2: "",
  approver3: "",
};

const TITLE_MAX = 50;
const DESCRIPTION_MAX = 500;

function formStateFromApplication(app: PointApplication): FormState {
  return {
    title: app.title ?? "",
    activityGenreId: app.activity_genre_id ?? "",
    description: app.description ?? "",
    approver1: app.approver_1_user_id ?? "",
    approver2: app.approver_2_user_id ?? "",
    approver3: app.approver_3_user_id ?? "",
  };
}

function payloadFromFormState(form: FormState): PointApplicationDraftIn {
  return {
    title: form.title || null,
    activity_genre_id:
      form.activityGenreId === "" ? null : Number(form.activityGenreId),
    description: form.description || null,
    approver_1_user_id: form.approver1 || null,
    approver_2_user_id: form.approver2 || null,
    approver_3_user_id: form.approver3 || null,
  };
}

export function PointApplicationForm() {
  const router = useRouter();

  const [genres, setGenres] = useState<ActivityGenre[]>([]);
  const [route, setRoute] = useState<ApprovalRoute | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "submit" | "load-draft">(
    null,
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 初期ロード: ジャンル + 承認ルート
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchActivityGenres(), fetchApprovalRoute()])
      .then(([g, r]) => {
        if (cancelled) return;
        setGenres(g);
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

  // ポイント数の自動算出（ジャンル変更時、spec.md §2.3）
  const points = useMemo<number | null>(() => {
    if (form.activityGenreId === "") return null;
    const id = Number(form.activityGenreId);
    return genres.find((g) => g.id === id)?.default_points ?? null;
  }, [form.activityGenreId, genres]);

  const totalSteps = route?.approval_total_steps ?? 0;

  // クライアント側バリデーション
  function validateForSubmit(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.title) errs.title = "タイトルは必須です";
    else if (form.title.length > TITLE_MAX)
      errs.title = `タイトルは ${TITLE_MAX} 文字以内で入力してください`;
    if (form.activityGenreId === "")
      errs.activity_genre_id = "活動ジャンルは必須です";
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

  // 一時保存（必須バリデーションをスキップ）
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

  // 申請送信
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

  // 下書き再開
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
    /* ページ全体: 上部にヘッダーバー（Figma 1:134 / h-80px bg-#faf8f5）+ 下にフォーム */
    <div className="flex h-full flex-col">
      <PageHeader title="ポイント申請フォーム" />

      {/* フォームカードを内包するスクロール領域（Figmaの top:117 以下に相当） */}
      <div className="flex flex-1 flex-col px-8 pb-8 pt-[37px] overflow-hidden bg-white">
      {/* フォームカード: Figma準拠 bg-[#ecf5fa] / rounded-[5px] */}
      <div className="flex flex-1 flex-col rounded-[5px] border border-slate-200 bg-[#ecf5fa] shadow-sm overflow-hidden">
        {/* カードヘッダー: フォーム本体と同じ #ecf5fa の 1 枚扱い（区切りなし） */}
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

        {/* 通知エリア */}
        {(globalError || info) && (
          <div className="px-8 py-3">
            {globalError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {globalError}
              </div>
            )}
            {info && (
              <div className="rounded border border-[#0178C8]/20 bg-[#ecf5fa] px-3 py-2 text-sm text-[#0178C8]">
                {info}
              </div>
            )}
          </div>
        )}

        {/* フォーム本体: 画面に収まる1枚レイアウト（縦スクロールなし）
            右側は「下書き再開」ボタンの左端あたりまで余白を取って Figma に揃える */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pl-8 pr-36 py-5">
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

          {/* 活動ジャンル */}
          <div>
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="activityGenreId"
            >
              活動ジャンル <span className="text-red-500">*</span>
            </label>
            {/* Figma 1:156 — 354px 固定幅 */}
            <div className="relative w-[354px] max-w-full">
              <select
                id="activityGenreId"
                value={form.activityGenreId}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    activityGenreId:
                      e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none ${
                  form.activityGenreId === "" ? "text-slate-300" : "text-[#334155]"
                }`}
              >
                <option value="">ジャンルを選択</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
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
            {errors.activity_genre_id && (
              <div className="mt-1 text-xs text-red-500">
                {errors.activity_genre_id}
              </div>
            )}
          </div>

          {/* ポイント数（読み取り専用） */}
          <div>
            <label
              className="mb-1.5 block text-sm font-bold text-[#334155]"
              htmlFor="points"
            >
              ポイント数
            </label>
            <div className="relative w-[154px]">
              {/* Figma 1:161 — 154px 固定幅 */}
              <input
                id="points"
                type="text"
                value={points === null ? "" : String(points)}
                readOnly
                className="w-full cursor-not-allowed rounded border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-[#334155]"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#64748b]">
                P
              </span>
            </div>
          </div>

          {/* 活動内容: 残りの縦スペースを埋めて1枚に収める */}
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
              <span>{form.description.length}/{DESCRIPTION_MAX}</span>
            </div>
          </div>

          {/* 承認者（3列）— textarea より更に右側に余白を取って Figma に合わせる */}
          <div className="grid grid-cols-3 gap-6 pr-24">
            {[1, 2, 3].map((step) => {
              const enabled = step <= totalSteps;
              const candidates = route?.candidates_per_step[step - 1] ?? [];
              const value =
                step === 1
                  ? form.approver1
                  : step === 2
                    ? form.approver2
                    : form.approver3;
              const setValue = (v: string) =>
                setForm((s) => ({
                  ...s,
                  approver1: step === 1 ? v : s.approver1,
                  approver2: step === 2 ? v : s.approver2,
                  approver3: step === 3 ? v : s.approver3,
                }));
              const errKey =
                step === 1
                  ? "approver_1_user_id"
                  : step === 2
                    ? "approver_2_user_id"
                    : "approver_3_user_id";
              const placeholder =
                step === 1 ? "承認者1" : step === 2 ? "承認者2" : "承認者を選択";
              return (
                <div key={step}>
                  <label
                    className="mb-1.5 block text-sm font-bold text-[#334155]"
                    htmlFor={`approver${step}`}
                  >
                    第{step}承認者
                    {enabled && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <div className="relative w-full">
                    <select
                      id={`approver${step}`}
                      value={value}
                      disabled={!enabled || busy !== null}
                      onChange={(e) => setValue(e.target.value)}
                      className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-[#ecf5fa] disabled:text-[#64748b] ${
                        value === "" ? "text-slate-300" : "text-[#334155]"
                      }`}
                    >
                      <option value="">
                        {enabled ? placeholder : "（不要）"}
                      </option>
                      {candidates.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.role ? `（${u.role}）` : ""}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] leading-none ${
                        enabled ? "text-[#334155]" : "text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </div>
                  {errors[errKey] && (
                    <div className="mt-1 text-xs text-red-500">
                      {errors[errKey]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ボタン行: フォーム本体と同じ #ecf5fa の 1 枚扱い（区切りなし） */}
        <div className="flex items-center gap-3 px-8 pt-3 pb-5">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy !== null}
            className="flex items-center gap-2.5 rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:opacity-50"
          >
            {busy === "save" ? (
              "保存中…"
            ) : (
              <>
                <span>+</span>
                <span>一時保存</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy !== null}
            className="flex items-center gap-2.5 rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:opacity-50"
          >
            {busy === "submit" ? (
              "送信中…"
            ) : (
              <>
                {/* icon.png 準拠 — 紙飛行機/送信アイコン。外形 + 中央の折り目線。右上向き */}
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 11 L21 3 L13 21 L11 13 Z" />
                  <path d="M11 13 L21 3" />
                </svg>
                申請
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
