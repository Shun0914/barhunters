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
    <AuthGate>
      <div className="flex h-screen min-h-0 bg-white text-slate-800">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
