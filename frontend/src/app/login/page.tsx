import { Suspense } from "react";

import { LoginPageClient } from "./pageClient";

export const metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          読み込み中...
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
