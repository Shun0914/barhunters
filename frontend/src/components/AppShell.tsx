import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 bg-white text-slate-800">
      <Sidebar />
      {/* min-h-0 + overflow-y-auto: Flex 配下での縦スクロール用フォールバック（理想はコンテンツをビューポート収め、cascade で高密度化）。 */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
        {children}
      </main>
    </div>
  );
}
