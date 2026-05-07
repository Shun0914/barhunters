"use client";

import { useEffect, useMemo, useState } from "react";

import { ICONS } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { ApiError } from "@/lib/api";
import {
  fetchActivityGenres,
  fetchApplications,
  resubmitApplication,
  withdrawApplication,
} from "@/lib/api/applications";
import type {
  ActivityGenre,
  ApplicationStatusTab,
  PointApplication,
  PointApplicationDraftIn,
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
  const [genres, setGenres] = useState<ActivityGenre[]>([]);

  useEffect(() => {
    fetchActivityGenres()
      .then(setGenres)
      .catch(() => setGenres([]));
  }, []);

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
      setInfo("申請を取り戻しました（下書きに戻りました）");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message || "取戻しに失敗しました"
          : e instanceof Error
            ? e.message
            : "取戻しに失敗しました";
      setError(msg);
    }
  }

  async function handleResubmit(payload?: PointApplicationDraftIn) {
    if (!selected) return;
    setError(null);
    setInfo(null);
    try {
      const updated = await resubmitApplication(selected.id, payload);
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setInfo("再申請しました（差戻し段から審査が再開されます）");
    } catch (e) {
      // バリデーションエラー (400) はサーバから { detail: { field: msg, ... } } で返る
      if (
        e instanceof ApiError &&
        typeof e.detail === "object" &&
        e.detail !== null
      ) {
        const d = e.detail as { detail?: Record<string, string> };
        if (d.detail) {
          const first = Object.values(d.detail)[0];
          setError(first ?? "再申請に失敗しました");
          return;
        }
      }
      const msg =
        e instanceof ApiError
          ? e.message || "再申請に失敗しました"
          : e instanceof Error
            ? e.message
            : "再申請に失敗しました";
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
            {/* タブ — 等間隔（flex-1）で配置、アクティブ下線は文字幅、全体下線は左カラム幅まで */}
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
                genres={genres}
                canWithdraw={canWithdraw}
                onWithdraw={handleWithdraw}
                onResubmit={handleResubmit}
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
        // 差戻し申請は背景を常時薄赤、選択時のみ枠とリングを赤系にする
        const isReturned = a.status === "returned";
        const borderClass = active
          ? isReturned
            ? "border-[#c44040] ring-1 ring-[#c44040]"
            : "border-[#0178C8] ring-1 ring-[#0178C8]"
          : "border-slate-200 hover:border-slate-300";
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex items-start justify-between rounded border px-4 py-3 text-left transition ${
              isReturned ? "bg-[#fde8e8]" : "bg-white"
            } ${borderClass}`}
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

const TITLE_MAX = 50;
const DESCRIPTION_MAX = 500;

function ApplicationDetail({
  app,
  genres,
  canWithdraw,
  onWithdraw,
  onResubmit,
  onClose,
}: {
  app: PointApplication;
  genres: ActivityGenre[];
  canWithdraw: boolean;
  onWithdraw: () => void;
  onResubmit: (payload?: PointApplicationDraftIn) => void;
  onClose: () => void;
}) {
  const approvers = buildApprovers(app);
  const isReturned = app.status === "returned";

  // 差戻し申請の編集用ローカル state（選択中の申請が変わったら初期化）
  const [editTitle, setEditTitle] = useState<string>(app.title || "");
  const [editGenreId, setEditGenreId] = useState<number | "">(
    app.activity_genre_id ?? "",
  );
  const [editDescription, setEditDescription] = useState<string>(
    app.description || "",
  );
  useEffect(() => {
    setEditTitle(app.title || "");
    setEditGenreId(app.activity_genre_id ?? "");
    setEditDescription(app.description || "");
  }, [app.id, app.title, app.activity_genre_id, app.description]);

  // ジャンル変更でポイント数を即時表示（再申請時にサーバ側で再計算もされる）
  const previewPoints = useMemo(() => {
    if (editGenreId === "") return null;
    return genres.find((g) => g.id === editGenreId)?.default_points ?? null;
  }, [editGenreId, genres]);

  function handleResubmitClick() {
    if (!isReturned) return;
    onResubmit({
      title: editTitle || null,
      activity_genre_id: editGenreId === "" ? null : Number(editGenreId),
      description: editDescription || null,
    });
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-slate-200 bg-[#ecf5fa]">
      {/* × 閉じる: 右上端に絶対配置（取戻しやフィールドより外側） */}
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 top-4 text-[#94a3b8] transition hover:text-[#334155]"
      >
        {ICONS.close}
      </button>

      {/* 申請番号（左）。差戻し以外は右に取戻しボタン（再申請は下のフッターに配置） */}
      <div className="flex items-center justify-between pl-6 pr-14 pt-10 pb-3">
        <div className="text-lg font-bold text-[#334155]">
          申請番号: {app.application_number ?? "—"}
        </div>
        {!isReturned && (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={!canWithdraw}
            title={canWithdraw ? "" : "取り戻しできません"}
            className="flex items-center gap-2 rounded border border-[#334155] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ICONS.return}
            取戻し
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pl-6 pr-14 pb-3 pt-2">
        {isReturned ? (
          <>
            {/* 差戻し申請: タイトル / ジャンル / 活動内容を編集可能に */}
            <div>
              <label
                className="mb-1 block text-sm font-bold text-[#334155]"
                htmlFor="resubmit-title"
              >
                タイトル
              </label>
              <input
                id="resubmit-title"
                type="text"
                value={editTitle}
                maxLength={TITLE_MAX}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
              />
              <div className="mt-1 text-right text-[10px] text-[#64748b]">
                {editTitle.length}/{TITLE_MAX}
              </div>
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-bold text-[#334155]"
                htmlFor="resubmit-genre"
              >
                活動ジャンル
              </label>
              <div className="relative w-[354px] max-w-full">
                <select
                  id="resubmit-genre"
                  value={editGenreId}
                  onChange={(e) =>
                    setEditGenreId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={`w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-[#0178C8] focus:outline-none ${
                    editGenreId === "" ? "text-slate-300" : "text-[#334155]"
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
            </div>

            <PointsField points={previewPoints} />

            <div>
              <label
                className="mb-1 block text-sm font-bold text-[#334155]"
                htmlFor="resubmit-description"
              >
                活動内容
              </label>
              <textarea
                id="resubmit-description"
                value={editDescription}
                maxLength={DESCRIPTION_MAX}
                rows={6}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#334155] focus:border-[#0178C8] focus:outline-none"
              />
              <div className="mt-1 text-right text-[10px] text-[#64748b]">
                {editDescription.length}/{DESCRIPTION_MAX}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 通常: 読み取り専用表示（申請者欄は不要なので非表示） */}
            <DetailField label="タイトル" value={app.title || "—"} />
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
          </>
        )}

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

      {/* フッター: 差戻し申請のときだけ再申請ボタンを左下に配置（S-04 の承認ボタンと同じ位置感） */}
      {isReturned && (
        <div className="flex shrink-0 items-center pl-6 pr-14 pb-5 pt-2">
          <button
            type="button"
            onClick={handleResubmitClick}
            className="flex items-center gap-2.5 rounded border border-[#334155] bg-[#faf8f5] px-8 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea]"
          >
            {ICONS.send}
            再申請
          </button>
        </div>
      )}
    </div>
  );
}
