"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchSession } from "@/lib/api/auth";

type Props = { children: React.ReactNode };

export function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          const next = encodeURIComponent(pathname || "/dashboard");
          router.replace(`/login?next=${next}`);
          return;
        }
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        読み込み中...
      </div>
    );
  }

  return <>{children}</>;
}
