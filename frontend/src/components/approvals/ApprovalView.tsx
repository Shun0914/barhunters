"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ApprovalRouteView,
  DetailField,
  PointsField,
  buildApprovers,
  formatDateTime,
} from "@/components/applications/detailParts";
import { ICONS } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, apiFetch } from "@/lib/api";
import {
  approveApplication,
  fetchApprovalApplicants,
  fetchApprovals,
  returnApplication,
  type ApprovalTab,
} from "@/lib/api/approvals";
import type { PointApplication, UserBrief } from "@/lib/api/types";

// spec.md §3.7 — 承認者視点の承認画面（S-04）。
// S-02 と同じ Master-Detail だが、申請者フィルタ・承認/差戻しボタンを持つ。

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: "waiting", label: "承認待ち" },
  { id: "completed", label: "完了" },
  { id: "all", label: "すべて" },
];

export function ApprovalView() {
  const [tab, setTab] = useState<ApprovalTab>("waiting");
  const [applicantFilter, setApplicantFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<PointApplication[]>([]);
  const [applicants, setApplicants] = useState<UserBrief[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 申請者フィルタ候補とログインユーザー id は初回のみ取得
  useEffect(() => {
    fetchApprovalApplicants()
      .then(setApplicants)
      .catch(() => setApplicants([]));
    apiFetch<UserBrief>("/api/users/me")
      .then((u: UserBrief) => setMeId(u.id))
      .catch(() => setMeId(null));
  }, []);

  // 一覧取得
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApprovals({
      tab,
      applicantUserId: applicantFilter || undefined,
      q: searchQuery || undefined,
    })
      .then((arr) => {
        if (cancelled) return;
        setItems(arr);
        setSelectedId((prev) => {
          if (arr.length === 0) return null;
          if (prev && arr.some((a) => a.id === prev)) return prev;
          return arr[0].id;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, applicantFilter, searchQuery]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // spec.md §3.4 — 操作可能なのは status=submitted かつ current_approval_step が自分の段のときのみ。
  // 完了タブで自分が承認済の申請を選択しても再操作できないようにする。
  const canAct = useMemo(() => {
    if (!selected || !meId) return false;
    if (selected.status !== "submitted") return false;
    const step = selected.current_approval_step;
    if (step === 1) return selected.approver_1_user_id === meId;
    if (step === 2) return selected.approver_2_user_id === meId;
    if (step === 3) return selected.approver_3_user_id === meId;
    return false;
  }, [selected, meId]);

  // spec.md §3.7 — 操作後は次の申請を自動選択（直下、なければ直上）
  function pickNextSelection(currentList: PointApplication[], removedId: string): string | null {
    const idx = currentList.findIndex((a) => a.id === removedId);
    const next = currentList.filter((a) => a.id !== removedId);
    if (next.length === 0) return null;
    // 直下 = 同じ index の要素（消したぶん詰まる）。なければ直上 = idx-1
    if (idx >= 0 && idx < next.length) return next[idx].id;
    return next[next.length - 1].id;
  }

  async function handleApprove() {
    if (!selected) return;
    setError(null);
    setInfo(null);
    try {
      await approveApplication(selected.id);
      // waiting タブでは消える、completed/all では status が更新される
      if (tab === "waiting") {
        setSelectedId(pickNextSelection(items, selected.id));
        setItems((prev) => prev.filter((a) => a.id !== selected.id));
        setInfo("承認しました");
      } else {
        // 再フェッチで最新状態に
        const fresh = await fetchApprovals({
          tab,
          applicantUserId: applicantFilter || undefined,
          q: searchQuery || undefined,
        });
        setItems(fresh);
        setInfo("承認しました");
      }
    } catch (e) {
      setError(humanizeError(e, "承認に失敗しました"));
    }
  }

  async function handleReturn() {
    if (!selected) return;
    setError(null);
    setInfo(null);
    try {
      await returnApplication(selected.id);
      if (tab === "waiting") {
        setSelectedId(pickNextSelection(items, selected.id));
        setItems((prev) => prev.filter((a) => a.id !== selected.id));
        setInfo("差し戻しました");
      } else {
        const fresh = await fetchApprovals({
          tab,
          applicantUserId: applicantFilter || undefined,
          q: searchQuery || undefined,
        });
        setItems(fresh);
        setInfo("差し戻しました");
      }
    } catch (e) {
      setError(humanizeError(e, "差戻しに失敗しました"));
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      setSearchQuery(searchInput.trim());
    }
  }

  function handleSearchClear() {
    setSearchInput("");
    setSearchQuery("");
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="ポイント承認"
        inline={
          <ApplicantFilter
            applicants={applicants}
            value={applicantFilter}
            onChange={setApplicantFilter}
          />
        }
      >
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onKeyDown={handleSearchKeyDown}
          onClear={handleSearchClear}
        />
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden bg-white px-8 pb-8 pt-5">
        {(error || info) && (
          <div className="mb-3 shrink-0 space-y-2">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded border border-[#3a9e55]/30 bg-[#dff5e3] px-3 py-2 text-sm text-[#3a9e55]">
                {info}
              </div>
            )}
          </div>
        )}

        {/* 左カラム（タブ＋一覧）／中央縦線／右カラム（詳細） */}
        <div className="grid flex-1 grid-cols-[minmax(320px,420px)_1px_1fr] gap-x-6 overflow-hidden">
          {/* 左カラム */}
          <div className="flex min-w-0 flex-col overflow-hidden">
            {/* タブ — 等間隔（flex-1）で配置、アクティブ下線はタブ1つぶんの幅、全体下線は左カラム幅まで */}
            <div className="flex shrink-0 items-end border-b border-slate-200">
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setInfo(null);
                      setError(null);
                    }}
                    className={`flex-1 text-center text-sm transition ${
                      active
                        ? "font-bold text-[#0178C8]"
                        : "text-[#64748b] hover:text-[#334155]"
                    }`}
                  >
                    <span
                      className={`block pb-2 ${
                        active ? "-mb-px border-b-2 border-[#0178C8]" : ""
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-0 flex-1">
              <ApprovalList
                items={items}
                selectedId={selectedId}
                loading={loading}
                tab={tab}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
          </div>

          {/* 中央: 縦の区切り線（タブの上端から下まで連続） */}
          <div className="bg-slate-200" aria-hidden="true" />

          {/* 右カラム: 詳細はタブの下端あたりから始まる */}
          <div className="flex min-w-0 flex-col overflow-hidden pt-12">
            {selected ? (
              <ApprovalDetail
                app={selected}
                canAct={canAct}
                onApprove={handleApprove}
                onReturn={handleReturn}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[5px] border border-slate-200 bg-[#ecf5fa] text-sm text-[#64748b]">
                {items.length === 0
                  ? tab === "waiting"
                    ? "承認待ちの申請はありません"
                    : "該当する申請はありません"
                  : "左の一覧から申請を選択してください"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function humanizeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

function ApplicantFilter({
  applicants,
  value,
  onChange,
}: {
  applicants: UserBrief[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-[180px] appearance-none rounded border border-slate-300 bg-white py-1.5 pl-3 pr-7 text-xs focus:border-[#0178C8] focus:outline-none ${
          value === "" ? "text-slate-400" : "text-[#334155]"
        }`}
      >
        <option value="">申請者で絞り込み</option>
        {applicants.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] leading-none text-[#334155]"
        aria-hidden="true"
      >
        ▼
      </span>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  onKeyDown,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]">
        {ICONS.glass}
      </span>
      <input
        type="search"
        value={value}
        placeholder="Search"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-[220px] rounded border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-xs text-[#334155] placeholder:text-slate-400 focus:border-[#0178C8] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="検索クリア"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#64748b] hover:text-[#334155]"
        >
          ×
        </button>
      )}
    </div>
  );
}

function ApprovalList({
  items,
  selectedId,
  loading,
  tab,
  onSelect,
}: {
  items: PointApplication[];
  selectedId: string | null;
  loading: boolean;
  tab: ApprovalTab;
  onSelect: (id: string) => void;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[5px] border border-slate-200 bg-white text-xs text-[#64748b]">
        読み込み中…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[5px] border border-slate-200 bg-white text-xs text-[#64748b]">
        {tab === "waiting"
          ? "承認待ちの申請はありません"
          : "該当する申請はありません"}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {items.map((a) => {
        const active = a.id === selectedId;
        const ts = a.submitted_at ?? a.updated_at;
        // 申請者名の頭2文字でアバターを作る（spec.md §3.7 — カード右下に申請者アイコン+名前）
        const initials = (a.applicant_name ?? "—").slice(0, 2);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex flex-col rounded border bg-white px-4 py-3 text-left transition ${
              active
                ? "border-[#0178C8] ring-1 ring-[#0178C8]"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="text-xs text-[#334155]">
                  申請番号:{" "}
                  <span className="font-semibold">
                    {a.application_number ?? "—"}
                  </span>
                </div>
                <div className="text-xs text-[#334155]">
                  タイトル: {a.title || "（未入力）"}
                </div>
              </div>
              <div className="ml-3 whitespace-pre-line text-right text-[10px] leading-tight text-[#64748b]">
                {formatDateTime(ts)}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0178C8] text-[9px] font-bold text-white">
                {initials}
              </div>
              <div className="text-[10px] text-[#64748b]">
                {a.applicant_name ?? "—"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ApprovalDetail({
  app,
  canAct,
  onApprove,
  onReturn,
  onClose,
}: {
  app: PointApplication;
  canAct: boolean;
  onApprove: () => void;
  onReturn: () => void;
  onClose: () => void;
}) {
  const approvers = buildApprovers(app);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-slate-200 bg-[#ecf5fa]">
      {/* × 閉じる: 右上端に絶対配置（差戻し / 各フィールド / 承認ボタン より外側） */}
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 top-4 text-[#94a3b8] transition hover:text-[#334155]"
      >
        {ICONS.close}
      </button>

      {/* 申請番号（左）と 差戻しボタン（右）を同じ行に。× の下に余白を取って配置 */}
      <div className="flex items-center justify-between pl-6 pr-14 pt-10 pb-3">
        <div className="text-lg font-bold text-[#334155]">
          申請番号: {app.application_number ?? "—"}
        </div>
        <button
          type="button"
          onClick={onReturn}
          disabled={!canAct}
          className="flex items-center gap-2 rounded border border-[#334155] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ICONS.return}
          差戻し
        </button>
      </div>

      {/* 本文（右余白 pr-14 で × より内側に揃える） */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pl-6 pr-14 pb-3 pt-2">
        <DetailField label="タイトル" value={app.title || "—"} />
        <DetailField label="申請者" value={app.applicant_name || "—"} />
        <DetailField
          label="活動ジャンル"
          value={app.activity_genre_name || "—"}
        />
        <PointsField points={app.points} />
        <DetailField
          label="活動内容"
          value={app.description || "—"}
          multiline
        />

        <div>
          <div className="mb-2 text-sm font-bold text-[#334155]">承認ルート</div>
          {approvers.length > 0 ? (
            <ApprovalRouteView
              approvers={approvers}
              currentStep={app.current_approval_step}
              status={app.status}
            />
          ) : (
            <div className="text-xs text-[#64748b]">承認ルートは未確定です</div>
          )}
        </div>
      </div>

      {/* フッター: 承認ボタン（右余白 pr-14 で × より内側に揃える） */}
      <div className="flex shrink-0 items-center pl-6 pr-14 pb-5 pt-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={!canAct}
          className="flex items-center gap-2.5 rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ICONS.approve}
          承認
        </button>
      </div>
    </div>
  );
}
