import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-white text-slate-800">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden bg-white">{children}</main>
    </div>
  );
}
