import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "ダッシュボード | barhunters",
};

// 暫定プレースホルダ（DASH-01 トラックでの本実装を待つ）
export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="ダッシュボード" />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 text-center">
        <div className="text-sm text-[#64748b]">
          ダッシュボードは現在準備中です。
          <br />
          サイドバーから他のメニューをご利用ください。
        </div>
      </div>
    </div>
  );
}
