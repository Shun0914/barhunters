"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ICONS } from "@/components/icons";

import { formatDateTime } from "@/components/applications/detailParts";
import { PageHeader } from "@/components/PageHeader";
import {
  emitNotificationsChanged,
  fetchNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";
import type {
  Notification,
  NotificationTab,
  NotificationType,
} from "@/lib/api/types";

// spec.md §3.8 — 通知一覧画面（S-06）。
// Master-Detail。タブ「すべて / 未読」、検索、詳細表示時に既読化。

const TABS: { id: NotificationTab; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "unread", label: "未読" },
];

function initialsOf(name: string | null): string {
  if (!name) return "—";
  return name.slice(0, 2);
}

// spec.md §3.8 詳細パネル — type 別 CTA
function ctaFor(n: Notification): { label: string; href: string; icon: React.ReactNode } | null {
  if (!n.related_application_id) return null;
  if (n.type === "approval_request") {
    return {
      label: "ポイント承認画面へ",
      href: `/approvals?selected=${n.related_application_id}`,
      icon: ICONS.approve,
    };
  }
  // approved / returned
  return {
    label: "申請状況へ",
    href: `/applications?selected=${n.related_application_id}`,
    icon: ICONS.applicationStatus,
  };
}

export function NotificationView() {
  const [tab, setTab] = useState<NotificationTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Notification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 一覧取得
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNotifications({ tab, q: searchQuery || undefined })
      .then((arr) => {
        if (cancelled) return;
        setItems(arr);
        // spec.md §3.8 — 画面を開いた瞬間に最新の通知を自動選択
        setSelectedId((prev) => {
          if (arr.length === 0) return null;
          if (prev && arr.some((a) => a.id === prev)) return prev;
          return arr[0].id;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "通知の取得に失敗しました");
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

  // 既読化のタイミング: 詳細を開いた瞬間ではなく、別の通知に切り替える / 画面を離れる
  // タイミングで既読化する。useEffect の cleanup を利用。
  useEffect(() => {
    if (!selected || selected.read_at !== null) return;
    const targetId = selected.id;
    return () => {
      markNotificationRead(targetId)
        .then((updated) => {
          // 同一画面内で次の通知を開いた場合は items の青ドットも更新
          setItems((prev) =>
            prev.map((n) => (n.id === targetId ? updated : n)),
          );
          // 左下バッジを即時更新
          emitNotificationsChanged();
        })
        .catch(() => {
          // 既読化失敗時は無視
        });
    };
  }, [selected]);

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
      <PageHeader title="通知一覧">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onKeyDown={handleSearchKeyDown}
          onClear={handleSearchClear}
        />
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden bg-white px-8 pb-8 pt-5">
        {error && (
          <div className="mb-3 shrink-0 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 左カラム（タブ＋一覧）／中央縦線／右カラム（詳細）。右側は内容に応じて縦幅が決まる。 */}
        <div className="grid flex-1 grid-cols-[minmax(360px,460px)_1px_1fr] gap-x-6 overflow-hidden">
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
              <NotificationList
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

          {/* 右カラム: 詳細はタブの下端あたりから始まる。中身の高さ依存。 */}
          <div className="flex min-w-0 flex-col overflow-y-auto pt-12">
            {selected ? (
              <NotificationDetail
                notification={selected}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex items-center justify-center rounded-[5px] border border-slate-200 bg-white px-6 py-10 text-sm text-[#64748b]">
                {tab === "unread"
                  ? "未読の通知はありません"
                  : "通知はありません"}
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
        className="w-[220px] rounded border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-xs text-[#334155] placeholder:text-slate-400 focus:border-[#0178C8] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="検索クリア"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-[#64748b] hover:text-[#334155]"
        >
          ×
        </button>
      )}
    </div>
  );
}

function NotificationList({
  items,
  selectedId,
  loading,
  tab,
  onSelect,
}: {
  items: Notification[];
  selectedId: string | null;
  loading: boolean;
  tab: NotificationTab;
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
        {tab === "unread" ? "未読の通知はありません" : "通知はありません"}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {items.map((n) => {
        const active = n.id === selectedId;
        const unread = n.read_at === null;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={`flex flex-col rounded border bg-white px-4 py-3 text-left transition ${
              active
                ? "border-[#0178C8] ring-1 ring-[#0178C8]"
                : "border-slate-200 hover:border-slate-300 hover:bg-[#f8fafc]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* spec.md §3.8 — 未読インジケータ（青ドット）。既読時は同サイズの透明要素で位置を固定 */}
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    unread ? "bg-[#0178C8]" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 truncate text-xs text-[#334155]">
                  {n.title}
                </div>
              </div>
              <div className="shrink-0 whitespace-pre-line text-right text-[10px] leading-tight text-[#64748b]">
                {formatDateTime(n.created_at)}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0178C8] text-[9px] font-bold text-white">
                {initialsOf(n.sender_name)}
              </div>
              <div className="text-[10px] text-[#64748b]">
                {n.sender_name ?? "—"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NotificationDetail({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const router = useRouter();
  const cta = ctaFor(notification);
  return (
    /* 横幅は親（右カラム）のフル幅を取る。縦幅は中身（タイトル/本文/ボタン）に応じて自然に決まる。
       親が flex-col なので cross-axis は横方向 → デフォルトの stretch で横フル幅。
       × は右上端に絶対配置、本文等は右に余白 (pr-14) を取って × より内側に。 */
    <div className="relative rounded-[5px] border border-slate-200 bg-white pl-6 pr-14 pt-10 pb-5">
      {/* × 閉じる: 右上端に絶対配置 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 top-4 text-[#94a3b8] transition hover:text-[#334155]"
      >
        {ICONS.close}
      </button>

      <div className="text-sm font-bold text-[#334155]">
        {notification.title}
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">
        {notification.body}
      </div>

      {cta && (
        /* spec.md §3.8 — 本文の 2 行下に右寄せで CTA。leading-relaxed (≈1.625) × text-sm (14px) ≒ 1 行 23px → 約 2 行 = 46px */
        <div className="mt-[46px] flex justify-end">
          <button
            type="button"
            onClick={() => router.push(cta.href)}
            className="flex items-center gap-2 rounded border border-[#334155] bg-[#faf8f5] px-4 py-2 text-xs font-semibold text-[#334155] transition hover:bg-[#f5f1ea]"
          >
            {cta.icon}
            {cta.label}
          </button>
        </div>
      )}
    </div>
  );
}

// 未使用警告抑止（型を export 用に保持）
export type { NotificationType };
