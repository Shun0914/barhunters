"use client";

import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/AuthGate";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen min-h-0 bg-white text-slate-800">
      <Sidebar />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  );
}
