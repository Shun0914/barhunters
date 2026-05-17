import { Suspense } from "react";

import { MyPageClient } from "./pageClient";

export const metadata = {
  title: "マイページ",
};

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col">
          <div className="h-20 bg-[#faf8f5]" />
          <div className="flex-1 px-8 py-6 text-sm text-slate-500">読み込み中...</div>
        </div>
      }
    >
      <MyPageClient />
    </Suspense>
  );
}
