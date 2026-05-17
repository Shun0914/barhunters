"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { login } from "@/lib/api/auth";

const DEMO_HINTS = [
  { id: "MIN-BM-001", label: "部長" },
  { id: "MIN-KC-001", label: "課長" },
  { id: "MIN-IP-001", label: "一般社員" },
  { id: "FUK-BM-001", label: "部長（Azure デモ）" },
  { id: "FUK-KC-001", label: "課長（Azure デモ）" },
];

export function LoginPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(loginId.trim(), password);
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (e: unknown) {
      setErr(
        e instanceof ApiError && e.status === 401
          ? "ログイン ID またはパスワードが正しくありません"
          : "ログインに失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(id: string) {
    setLoginId(id);
    setPassword("demo");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#334155]">ログイン</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="login-id">
              ログイン ID（社員コード）
            </label>
            <input
              id="login-id"
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-[#0178C8] py-2.5 text-sm font-medium text-white hover:bg-[#0169ad] disabled:opacity-60"
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            デモ用クイック入力（PW は環境の DEMO_PASSWORD、既定 demo）
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_HINTS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => fillDemo(h.id)}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-[#0178C8] hover:bg-[#ecf5fa]"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
