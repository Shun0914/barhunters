"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ApprovalRouteView,
  DetailField,
  PointsField,
  buildApprovers,
  formatDateTime,
} from "@/components/applications/detailParts";
import { PageHeader } from "@/components/PageHeader";
import { ApiError } from "@/lib/api";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 申請者フィルタ候補は初回のみ
  useEffect(() => {
    fetchApprovalApplicants()
      .then(setApplicants)
      .catch(() => setApplicants([]));
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

  // spec.md §3.4 — 操作可能なのは status=submitted の自分の段だけ
  const canAct = selected?.status === "submitted";

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
              <div className="rounded border border-[#0178C8]/20 bg-[#ecf5fa] px-3 py-2 text-sm text-[#0178C8]">
                {info}
              </div>
            )}
          </div>
        )}

        {/* 左カラム（タブ＋一覧）／中央縦線／右カラム（詳細） */}
        <div className="grid flex-1 grid-cols-[minmax(320px,420px)_1px_1fr] gap-x-6 overflow-hidden">
          {/* 左カラム */}
          <div className="flex min-w-0 flex-col overflow-hidden">
            {/* タブ — 下線は左カラム幅まで */}
            <div className="flex shrink-0 items-center gap-8 border-b border-slate-200">
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
                    className={`pb-2 text-sm transition ${
                      active
                        ? "border-b-2 border-[#0178C8] font-bold text-[#0178C8]"
                        : "text-[#64748b] hover:text-[#334155]"
                    }`}
                  >
                    {t.label}
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
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
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
    <div className="flex h-full flex-col overflow-hidden rounded-[5px] border border-slate-200 bg-[#ecf5fa]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="text-sm font-bold text-[#334155]">
          申請番号: {app.application_number ?? "—"}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReturn}
            disabled={!canAct}
            className="rounded border border-[#334155] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↶ 差戻し
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-base leading-none text-[#64748b] hover:text-[#334155]"
          >
            ×
          </button>
        </div>
      </div>

      {/* 本文 */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-3 pt-2">
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

      {/* フッター: 承認ボタン */}
      <div className="flex shrink-0 items-center px-6 pb-5 pt-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={!canAct}
          className="rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↩ 承認
        </button>
      </div>
    </div>
  );
}
