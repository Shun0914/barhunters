"use client";

import { CascadeBoard } from "@/components/cascade/CascadeBoard";
import { PageHeader } from "@/components/PageHeader";

export function CascadePageClient() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="因果ストーリー" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-brand-bg-page px-6 pb-4 pt-2">
        <CascadeBoard />
      </div>
    </div>
  );
}
