"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApprovalView } from "@/components/approvals/ApprovalView";
import { apiFetch } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";

/** /approvals のアクセス制御。一般社員（および移行前のレガシー役職名「一般職員」）は決裁権限がないため申請状況へリダイレクト。 */
export function ApprovalsGate() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<UserBrief>("/api/users/me")
      .then((me) => {
        if (cancelled) return;
        if (me.role === "一般社員" || me.role === "一般職員") {
          router.replace("/applications");
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        // /api/users/me が取れない場合は安全側に倒して通す（既存挙動を壊さない）
        if (!cancelled) setAllowed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#64748b]">
        読み込み中…
      </div>
    );
  }
  return <ApprovalView />;
}
