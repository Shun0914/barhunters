"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DevUserSwitcher } from "@/components/DevUserSwitcher";
import { ICONS } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { APP_LOGO_PATH, APP_NAME } from "@/lib/appBranding";
import { apiFetch, setDevUserId } from "@/lib/api";
import { logout } from "@/lib/api/auth";
import type { UserBrief } from "@/lib/api/types";

// spec.md §1.1 のサイドナビ構成（MVP は PC 固定幅・常時展開・お気に入り非表示）
type NavItem = { label: string; href: string; icon: React.ReactNode };

/** 決裁権限・1on1 記録対象から除外される末端ロール（移行前のレガシー表記も含む） */
function isGeneralEmployeeLikeRole(role: string | null | undefined): boolean {
  return role === "一般社員" || role === "一般職員";
}

// 上部のグループ見出しなし項目（ダッシュボード/因果ストーリー）
const TOP_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: ICONS.dashboard },
  { label: "因果ストーリー", href: "/cascade", icon: ICONS.story },
];

// 「ポイント申請」グループに常に並ぶ項目
const APPLICATION_GROUP_BASE: NavItem[] = [
  { label: "申請フォーム", href: "/applications/new", icon: ICONS.apply },
  { label: "申請状況", href: "/applications", icon: ICONS.applicationStatus },
];

// 「ポイント申請」グループ内で、決裁権限のある役職にだけ出す項目
const APPLICATION_GROUP_APPROVER: NavItem[] = [
  { label: "ポイント承認", href: "/approvals", icon: ICONS.approve },
];

// 1on1 実施（決裁権限のある役職のみ）— 単独表示、グループ見出しなし
const ONE_ON_ONE_ITEM: NavItem = {
  label: "1on1実施",
  href: "/oneonone/new",
  icon: ICONS.profile,
};

// 全員に出す末尾の単独項目（通知一覧）
const BOTTOM_ITEMS: NavItem[] = [
  { label: "通知一覧", href: "/notifications", icon: ICONS.bell },
];

// ナビ全項目の href から、現在のパスに **最長一致** する 1 件だけをアクティブにする。
// 例: pathname=/applications/new のとき /applications（申請状況）は active にならず、
// /applications/new（申請フォーム）のみ active になる。
const ALL_HREFS: string[] = [
  "/mypage",
  ...TOP_ITEMS.map((i) => i.href),
  ...APPLICATION_GROUP_BASE.map((i) => i.href),
  ...APPLICATION_GROUP_APPROVER.map((i) => i.href),
  ONE_ON_ONE_ITEM.href,
  ...BOTTOM_ITEMS.map((i) => i.href),
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
  const router = useRouter();
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
  const isGeneral = isGeneralEmployeeLikeRole(me?.role);
  const applicationGroupItems = isGeneral
    ? APPLICATION_GROUP_BASE
    : [...APPLICATION_GROUP_BASE, ...APPLICATION_GROUP_APPROVER];
  const showOneOnOne = me != null && !isGeneral;

  return (
    /* Figma: サイドバー背景は #faf8f5、幅 250px */
    <aside className="relative z-20 flex h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-[#faf8f5]">
      {/* ロゴ部 — 西部ガスロゴ + システム名（高さは PageHeader h-20 と揃える） */}
      <div className="flex h-20 shrink-0 items-center gap-2 px-3">
        <div className="relative h-10 w-12 shrink-0">
          <Image
            src={APP_LOGO_PATH}
            alt={APP_NAME}
            fill
            sizes="48px"
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[10px] font-medium text-[#334155]">{APP_NAME}</span>
      </div>

      {/* ナビ本体 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* 上部: グループ見出しなしの単独項目（ダッシュボード/因果ストーリー） */}
        <ul className="mb-2">
          {TOP_ITEMS.map((item) => {
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

        {/* ポイント申請グループ（唯一のグループ見出し） */}
        <div className="mb-2">
          <div className="px-4 py-1.5 text-[10px] font-medium tracking-wide text-[#334155]">
            ポイント申請
          </div>
          <ul>
            {applicationGroupItems.map((item) => {
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

        {/* 1on1 実施（グループ見出しなし、決裁権限のある役職のみ） */}
        {showOneOnOne && (
          <ul className="mb-2">
            <li>
              <Link
                href={ONE_ON_ONE_ITEM.href}
                className={navLinkClass(isActive(ONE_ON_ONE_ITEM.href))}
              >
                <span
                  className={
                    isActive(ONE_ON_ONE_ITEM.href)
                      ? "text-[#0178C8]"
                      : "text-[#64748b]"
                  }
                >
                  {ONE_ON_ONE_ITEM.icon}
                </span>
                <span>{ONE_ON_ONE_ITEM.label}</span>
              </Link>
            </li>
          </ul>
        )}

        {/* 末尾: グループ見出しなしの単独項目（通知一覧） */}
        <ul className="mb-2">
          {BOTTOM_ITEMS.map((item) => {
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

        {/* お気に入りセクションは MVP では DOM レベルで非表示（spec.md §1.1） */}
      </nav>

      {/* 左下: ユーザー表示 + 通知ベル（spec.md §1.1 / §1.3） — 開発時はクリックでユーザー切替。
          長い氏名でも通知バッジがはみ出さないよう、アバター右側で名前と操作群を 2 段に並べる。
          マイページ導線は本番（switchEnabled=false）でも維持するため bottomSlot 内に統合。 */}
      <div className="flex items-start border-t border-slate-200 px-4 py-3">
        <DevUserSwitcher
          bottomSlot={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await logout();
                  } catch {
                    // ignore
                  }
                  setDevUserId(null);
                  router.replace("/login");
                }}
                className="shrink-0 rounded px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
                title="ログアウト"
              >
                ログアウト
              </button>
              <NotificationBell />
              <Link
                href="/mypage"
                className="text-[10px] text-[#0178C8] hover:underline"
              >
                マイページ
              </Link>
            </div>
          }
        />
      </div>
    </aside>
  );
}
