import Link from "next/link";

import { getApiBaseUrl } from "@/lib/api";

type HelloResponse = { message: string; database: string };

async function fetchHello(): Promise<HelloResponse | { error: string }> {
  try {
    const url = `${getApiBaseUrl()}/api/hello`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    return (await res.json()) as HelloResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { error: msg };
  }
}

export default async function Home() {
  const data = await fetchHello();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        barhunters
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        人的資本・挑戦活動の可視化とポイント申請のための社内プロダクト。
      </p>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-base font-medium">利用可能な画面（MVP）</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/applications/new"
              className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              ポイント申請フォーム
            </Link>
            {" "}— Issue #15
          </li>
          <li className="text-zinc-500">
            申請状況・承認・通知 — Issue #21 / #22 で実装予定
          </li>
          <li className="text-zinc-500">
            ダッシュボード・因果ストーリー — トラック①で実装予定
          </li>
        </ul>
      </div>

      <details className="rounded border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
          API 疎通確認（{getApiBaseUrl()}/api/hello）
        </summary>
        <pre className="mt-2 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </main>
  );
}
