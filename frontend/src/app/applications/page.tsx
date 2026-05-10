import { Suspense } from "react";

import { ApplicationStatusView } from "@/components/applications/ApplicationStatusView";

export const metadata = {
  title: "ポイント申請状況 | barhunters",
};

export default function ApplicationsStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-[#64748b]">
          読み込み中…
        </div>
      }
    >
      <ApplicationStatusView />
    </Suspense>
  );
}
