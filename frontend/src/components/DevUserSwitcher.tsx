"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { apiFetch, getDevUserId, isDevUserSwitchEnabled, setDevUserId } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";

function initialsOf(name: string): string {
  return name.slice(0, 2);
}

type Props = {
  /**
   * アバターの右側、名前の下に並べる要素（例: ログアウトボタン + 通知ベル）。
   * 渡すと「アバター | 名前 / bottomSlot」の 2 段レイアウトになり、長い名前でも
   * 通知バッジがサイドバー外にはみ出さない。
   */
  bottomSlot?: ReactNode;
};

/** 左下: ログインユーザー表示。デモ切替は NEXT_PUBLIC_ALLOW_DEV_USER_SWITCH=true 時のみ。 */
export function DevUserSwitcher({ bottomSlot }: Props = {}) {
  const switchEnabled = isDevUserSwitchEnabled();
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
    if (!switchEnabled || !open || allUsers.length > 0) return;
    apiFetch<UserBrief[]>("/api/users")
      .then(setAllUsers)
      .catch(() => setAllUsers([]));
  }, [open, allUsers.length, switchEnabled]);

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
    window.location.reload();
  }

  const currentDevId = getDevUserId();
  const avatar = (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0178C8] text-xs font-bold text-white">
      {me ? initialsOf(me.name) : "—"}
    </div>
  );
  // 2 段レイアウトで折り返しを許容するため truncate を撤廃し break-words を付与。
  const nameEl = (
    <div className="text-sm text-[#334155] break-words">{me?.name ?? "（読み込み中）"}</div>
  );

  if (!switchEnabled) {
    return (
      <div className="flex flex-1 items-start gap-2 px-1">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {nameEl}
          {bottomSlot ? bottomSlot : (
            <Link href="/mypage" className="text-[10px] text-[#0178C8] hover:underline">
              マイページ
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex flex-1 items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 rounded p-0.5 transition hover:bg-[#ecf5fa]"
        title="デモ用ユーザー切替"
      >
        {avatar}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded px-1 py-0.5 text-left transition hover:bg-[#ecf5fa]"
          title="デモ用ユーザー切替"
        >
          {nameEl}
        </button>
        {bottomSlot}
      </div>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 max-h-72 w-[230px] overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            デモ用 ユーザー切替
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
            ログイン本人（Cookie）
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
                  <span className="ml-1 text-[10px] text-[#64748b]">({u.role})</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
