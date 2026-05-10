import { Suspense } from "react";

import { ApprovalsGate } from "./ApprovalsGate";

export const metadata = {
  title: "ポイント承認 | barhunters",
};

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-[#64748b]">
          読み込み中…
        </div>
      }
    >
      <ApprovalsGate />
    </Suspense>
  );
}
