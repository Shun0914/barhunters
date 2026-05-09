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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">barhunters</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        スプリント1疎通: サーバー側で{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">
          {getApiBaseUrl()}/api/hello
        </code>{" "}
        を取得しています。
      </p>
      <pre className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        {JSON.stringify(data, null, 2)}
      </pre>
      <a
        href="/cascade"
        className="inline-flex w-fit items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
      >
        因果ストーリーへ →
      </a>
    </main>
  );
}
