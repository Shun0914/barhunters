"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch, getDevUserId, setDevUserId } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";

// 開発用のダミーログイン切替（spec.md §5.0 — 本物の認証導入時は削除）。
// サイドバー左下のアバター + 名前部分をクリックでドロップダウンを開き、
// 全ユーザーから 1 名を選択 → localStorage に保存 → ページリロードで反映。

function initialsOf(name: string): string {
  return name.slice(0, 2);
}

export function DevUserSwitcher() {
  const [me, setMe] = useState<UserBrief | null>(null);
  const [allUsers, setAllUsers] = useState<UserBrief[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<UserBrief>("/api/users/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!open || allUsers.length > 0) return;
    apiFetch<UserBrief[]>("/api/users")
      .then(setAllUsers)
      .catch(() => setAllUsers([]));
  }, [open, allUsers.length]);

  // クリックアウトで閉じる
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleSelect(id: string | null) {
    setDevUserId(id);
    // 単純化: ハードリロードで全クライアントステートをリセット
    window.location.reload();
  }

  const currentDevId = getDevUserId();

  return (
    <div ref={wrapRef} className="relative flex flex-1 items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-1 items-center gap-2 rounded px-1 py-1 text-left transition hover:bg-[#ecf5fa]"
        title="開発用ユーザー切替"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0178C8] text-xs font-bold text-white">
          {me ? initialsOf(me.name) : "—"}
        </div>
        <div className="flex-1 truncate text-sm text-[#334155]">
          {me?.name ?? "（読み込み中）"}
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 max-h-72 w-[230px] overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            開発用 ユーザー切替
          </div>
          <Link
            href="/mypage"
            className="block border-b border-slate-100 px-3 py-2 text-xs font-medium text-[#0178C8] hover:bg-[#ecf5fa]"
            onClick={() => setOpen(false)}
          >
            マイページ（ポイント内訳）
          </Link>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#ecf5fa] ${
              !currentDevId ? "bg-[#ecf5fa] font-bold text-[#0178C8]" : "text-[#334155]"
            }`}
          >
            既定（.env の DEV_DEFAULT_USER_ID）
          </button>
          {allUsers.map((u) => {
            const active = currentDevId === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelect(u.id)}
                className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#ecf5fa] ${
                  active
                    ? "bg-[#ecf5fa] font-bold text-[#0178C8]"
                    : "text-[#334155]"
                }`}
              >
                {u.name}
                {u.role ? (
                  <span className="ml-1 text-[10px] text-[#64748b]">
                    ({u.role})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
