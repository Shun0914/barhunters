"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DevUserSwitcher } from "@/components/DevUserSwitcher";
import { ICONS } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { apiFetch } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";

// spec.md §1.1 のサイドナビ構成（MVP は PC 固定幅・常時展開・お気に入り非表示）
type NavItem = { label: string; href: string; icon: React.ReactNode };

/** 決裁権限・1on1 記録対象から除外される末端ロール（移行前のレガシー表記も含む） */
function isGeneralEmployeeLikeRole(role: string | null | undefined): boolean {
  return role === "一般社員" || role === "一般職員";
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "ダッシュボード",
    items: [
      { label: "ダッシュボード", href: "/dashboard", icon: ICONS.dashboard },
      { label: "因果ストーリー", href: "/cascade", icon: ICONS.story },
    ],
  },
  {
    group: "ポイント申請",
    items: [
      { label: "申請フォーム", href: "/applications/new", icon: ICONS.apply },
      { label: "申請状況", href: "/applications", icon: ICONS.applicationStatus },
    ],
  },
];

const STANDALONE_ITEMS: NavItem[] = [
  { label: "ポイント承認", href: "/approvals", icon: ICONS.approve },
];

// STANDALONE_ITEMS（ポイント承認）の下に出すグループ。
const POST_STANDALONE_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "1on1",
    items: [{ label: "1on1実施", href: "/oneonone/new", icon: ICONS.profile }],
  },
];

const OTHER_ITEMS: NavItem[] = [
  { label: "通知一覧", href: "/notifications", icon: ICONS.bell },
];

// ナビ全項目の href から、現在のパスに **最長一致** する 1 件だけをアクティブにする。
// 例: pathname=/applications/new のとき /applications（申請状況）は active にならず、
// /applications/new（申請フォーム）のみ active になる。
const ALL_HREFS: string[] = [
  ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)),
  ...STANDALONE_ITEMS.map((i) => i.href),
  ...POST_STANDALONE_GROUPS.flatMap((g) => g.items.map((i) => i.href)),
  ...OTHER_ITEMS.map((i) => i.href),
];

function resolveActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (!matches) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

// Figma準拠: アクティブ項目は bg-[#ecf5fa] + 右端に 3px の青ボーダー
function navLinkClass(active: boolean): string {
  const base = "flex items-center gap-2 px-4 py-2 text-sm transition-colors relative";
  if (active) {
    return (
      base +
      " bg-[#ecf5fa] text-[#0178C8] font-medium" +
      " after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-[#0178C8]"
    );
  }
  return base + " text-[#334155] hover:bg-[#ecf5fa]/60 hover:text-[#0178C8]";
}

export function Sidebar() {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);
  const isActive = (href: string) => href === activeHref;

  // ログインユーザーの役職に応じてメニューを出し分ける。
  // 一般社員（およびレガシー「一般職員」）は決裁がないので「ポイント承認」非表示、1on1 記録導線も不要。
  const [me, setMe] = useState<UserBrief | null>(null);
  useEffect(() => {
    apiFetch<UserBrief>("/api/users/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  const standaloneItems = isGeneralEmployeeLikeRole(me?.role) ? [] : STANDALONE_ITEMS;
  const oneOnOneNavGroups =
    me != null && isGeneralEmployeeLikeRole(me.role) ? [] : POST_STANDALONE_GROUPS;

  return (
    /* Figma: サイドバー背景は #faf8f5、幅 250px */
    <aside className="relative z-20 flex h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-[#faf8f5]">
      {/* ロゴ部 — Figma の image 14（西部ガスHD ロゴプレースホルダ）+「システム名」
          高さは右側の PageHeader (h-20) と揃える */}
      <div className="flex h-20 shrink-0 items-center gap-2 px-3">
        <div className="relative h-10 w-12 shrink-0">
          <Image
            src="/seibugas-logo.png"
            alt="西部ガスホールディングス"
            fill
            sizes="48px"
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[10px] text-[#334155]">システム名</span>
      </div>

      {/* ナビ本体 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.group} className="mb-2">
            <div className="px-4 py-1.5 text-[10px] font-medium tracking-wide text-[#334155]">
              {g.group}
            </div>
            <ul>
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={navLinkClass(active)}>
                      <span className={active ? "text-[#0178C8]" : "text-[#64748b]"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {standaloneItems.length > 0 && (
          <div className="mb-2">
            <ul>
              {standaloneItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={navLinkClass(active)}>
                      <span className={active ? "text-[#0178C8]" : "text-[#64748b]"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {oneOnOneNavGroups.map((g) => (
          <div key={g.group} className="mb-2">
            <div className="px-4 py-1.5 text-[10px] font-medium tracking-wide text-[#334155]">
              {g.group}
            </div>
            <ul>
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={navLinkClass(active)}>
                      <span className={active ? "text-[#0178C8]" : "text-[#64748b]"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="mb-2">
          <div className="px-4 py-1.5 text-[10px] font-medium tracking-wide text-[#334155]">
            その他
          </div>
          <ul>
            {OTHER_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass(active)}>
                    <span className={active ? "text-[#0178C8]" : "text-[#64748b]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* お気に入りセクションは MVP では DOM レベルで非表示（spec.md §1.1） */}
      </nav>

      {/* 左下: ユーザー表示 + 通知ベル（spec.md §1.1 / §1.3） — 開発時はクリックでユーザー切替 */}
      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
        <DevUserSwitcher />
        <NotificationBell />
      </div>
    </aside>
  );
}
