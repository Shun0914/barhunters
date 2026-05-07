import { redirect } from "next/navigation";

// アプリの初期画面はダッシュボードに（spec.md §1.1 サイドナビ先頭項目）
export default function RootPage() {
  redirect("/dashboard");
}
