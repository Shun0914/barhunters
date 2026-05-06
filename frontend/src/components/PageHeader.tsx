import type { ReactNode } from "react";

/**
 * メインエリア上部のヘッダーバー（spec.md / Figma 準拠）。
 * - 高さ 80px / 背景 #faf8f5
 * - 左寄せにページタイトル（24px / #334155）
 * - `inline`: タイトルの右隣に並べる要素（例: 申請者フィルタ）
 * - `children`: 右端に寄せる要素（例: 検索バー）
 */
export function PageHeader({
  title,
  inline,
  children,
}: {
  title: string;
  inline?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-20 shrink-0 items-center bg-[#faf8f5] px-8">
      <h1 className="text-2xl font-normal text-[#334155]">{title}</h1>
      {inline ? <div className="ml-24 flex items-center">{inline}</div> : null}
      {children ? <div className="ml-auto flex items-center">{children}</div> : null}
    </header>
  );
}
