"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  fetchRecentNotifications,
  fetchUnreadCount,
} from "@/lib/api/notifications";
import type { Notification } from "@/lib/api/types";

/** spec.md §1.3 — サイドバー左下の通知ベル + ポップオーバー。
 *  ベル: 未読総数バッジ。クリックで最新 4 件のポップオーバー。
 *  エントリ: 承認依頼系 → S-04 / それ以外 → S-06 へ遷移。 */

const POLL_INTERVAL_MS = 30_000; // 未読数の軽いポーリング

function initialsOf(name: string | null): string {
  if (!name) return "—";
  return name.slice(0, 2);
}

function timeOfDay(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

function destinationFor(n: Notification): string {
  if (n.type === "approval_request") {
    return n.related_application_id
      ? `/approvals?selected=${n.related_application_id}`
      : "/approvals";
  }
  return n.related_application_id
    ? `/notifications?selected=${n.related_application_id}`
    : "/notifications";
}

const BELL_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // 未読数: マウント時 + 軽くポーリング
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      fetchUnreadCount()
        .then((r) => {
          if (!cancelled) setUnreadCount(r.count);
        })
        .catch(() => {
          // ignore
        });
    }
    refresh();
    const tid = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(tid);
    };
  }, []);

  // ポップオーバーを開いた瞬間に最新 4 件取得
  useEffect(() => {
    if (!open) return;
    fetchRecentNotifications(4)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="通知"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded p-1 text-[#64748b] transition hover:bg-[#ecf5fa] hover:text-[#0178C8]"
      >
        {BELL_ICON}
        {unreadCount > 0 && (
          <span
            aria-label={`未読 ${unreadCount} 件`}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="通知一覧"
          className="absolute bottom-full left-1/2 mb-2 w-[260px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-200 px-3 py-2 text-xs text-[#334155]">
            通知
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-[#64748b]">
              通知はありません
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <Link
                    href={destinationFor(n)}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2 px-3 py-2 transition hover:bg-[#ecf5fa]"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0178C8] text-[10px] font-bold text-white">
                      {initialsOf(n.sender_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-[#334155]">
                        {n.title}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#64748b]">
                      {timeOfDay(n.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
