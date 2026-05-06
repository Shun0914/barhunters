"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ApiError } from "@/lib/api";
import {
  fetchApplications,
  withdrawApplication,
} from "@/lib/api/applications";
import type {
  ApplicationStatusTab,
  PointApplication,
} from "@/lib/api/types";

import {
  ApprovalRouteView,
  DetailField,
  PointsField,
  buildApprovers,
  formatDateTime,
} from "./detailParts";

// spec.md §3.6 — 申請者視点の申請状況画面（S-02）。
// 左右分割の Master-Detail。タブ・検索・取消し（withdraw）を持つ。

const TABS: { id: ApplicationStatusTab; label: string }[] = [
  { id: "incomplete", label: "未完了" },
  { id: "completed", label: "完了" },
  { id: "all", label: "すべて" },
];

export function ApplicationStatusView() {
  const [tab, setTab] = useState<ApplicationStatusTab>("incomplete");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<PointApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApplications({ tab, q: searchQuery || undefined })
      .then((arr) => {
        if (cancelled) return;
        setItems(arr);
        // 表示中の選択IDが新しいリストに無ければ先頭を選択（あれば維持）
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
  }, [tab, searchQuery]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // spec.md §3.6.3 — 第1承認前のみ取消し可能
  const canWithdraw =
    selected?.status === "submitted" && selected.current_approval_step === 1;

  async function handleWithdraw() {
    if (!selected) return;
    setError(null);
    setInfo(null);
    try {
      const updated = await withdrawApplication(selected.id);
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setInfo("申請を取り消しました（下書きに戻りました）");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message || "取消しに失敗しました"
          : e instanceof Error
            ? e.message
            : "取消しに失敗しました";
      setError(msg);
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
      <PageHeader title="ポイント申請状況">
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
              <ApplicationList
                items={items}
                selectedId={selectedId}
                loading={loading}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
          </div>

          {/* 中央: 縦の区切り線（タブの上端から下まで連続） */}
          <div className="bg-slate-200" aria-hidden="true" />

          {/* 右カラム: 詳細はタブの下端あたりから始まる（mt-12 でタブ高さぶん下げる） */}
          <div className="flex min-w-0 flex-col overflow-hidden pt-12">
            {selected ? (
              <ApplicationDetail
                app={selected}
                canWithdraw={canWithdraw}
                onWithdraw={handleWithdraw}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[5px] border border-slate-200 bg-[#ecf5fa] text-sm text-[#64748b]">
                {items.length === 0
                  ? "該当する申請はありません"
                  : "左の一覧から申請を選択してください"}
              </div>
            )}
          </div>
        </div>
      </div>
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

function ApplicationList({
  items,
  selectedId,
  loading,
  onSelect,
}: {
  items: PointApplication[];
  selectedId: string | null;
  loading: boolean;
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
        該当する申請はありません
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {items.map((a) => {
        const active = a.id === selectedId;
        // spec.md §3.6 — submitted_at（draft なら updated_at）
        const ts = a.submitted_at ?? a.updated_at;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex items-start justify-between rounded border bg-white px-4 py-3 text-left transition ${
              active
                ? "border-[#0178C8] ring-1 ring-[#0178C8]"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
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
          </button>
        );
      })}
    </div>
  );
}

function ApplicationDetail({
  app,
  canWithdraw,
  onWithdraw,
  onClose,
}: {
  app: PointApplication;
  canWithdraw: boolean;
  onWithdraw: () => void;
  onClose: () => void;
}) {
  const approvers = buildApprovers(app);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[5px] border border-slate-200 bg-[#ecf5fa]">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="text-sm font-bold text-[#334155]">
          申請番号: {app.application_number ?? "—"}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onWithdraw}
            disabled={!canWithdraw}
            title={canWithdraw ? "" : "取り消しできません"}
            className="rounded border border-[#334155] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↶ 取消し
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

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-5 pt-2">
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
          <div className="mb-2 text-sm font-bold text-[#334155]">
            承認ルート
          </div>
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
    </div>
  );
}
