"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ApiError } from "@/lib/api";
import { fetchMyPointsByGenre } from "@/lib/api/pointsBreakdown";
import type { MyPointsByGenreResponse } from "@/lib/api/types";

function parseMonth(v: string | null): number {
  const n = Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return 5;
}

export function MyPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const fy = sp.get("fy") ?? "FY2026";
  const month = parseMonth(sp.get("month"));

  const [data, setData] = useState<MyPointsByGenreResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyPointsByGenre(fy, month)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setErr(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData(null);
          setErr(e instanceof ApiError ? `読み込みに失敗（${e.status}）` : "読み込みに失敗しました");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fy, month]);

  function setPeriod(nextFy: string, nextMonth: number) {
    const p = new URLSearchParams();
    p.set("fy", nextFy);
    p.set("month", String(nextMonth));
    router.replace(`/mypage?${p.toString()}`);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="マイページ" />

      <div className="flex-1 bg-[#faf8f5] px-8 py-6">
        <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="mp-fy">
                年度
              </label>
              <select
                id="mp-fy"
                value={fy}
                onChange={(e) => setPeriod(e.target.value, month)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="FY2024">FY2024</option>
                <option value="FY2025">FY2025</option>
                <option value="FY2026">FY2026</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="mp-mon">
                月（累計の末尾）
              </label>
              <select
                id="mp-mon"
                value={month}
                onChange={(e) => setPeriod(fy, Number(e.target.value))}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              ポイントは承認済み申請のみ。期間はダッシュボードと同様（決裁日ベース）。
            </p>
          </div>

          {err ? <p className="text-sm text-red-600">{err}</p> : null}

          {!err && data ? (
            <>
              <div className="mb-4 text-sm text-slate-600">
                集計結果（{data.fy} 〜 {data.month}月末累計）
              </div>
              {data.rows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  該当期間・ジャンルで承認済みのポイントはありません。
                </p>
              ) : (
                <>
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="py-2 pr-4 font-medium">活動ジャンル</th>
                        <th className="py-2 pr-4 text-right font-medium tabular-nums">ポイント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.activity_genre_id} className="border-b border-slate-100">
                          <td className="py-2 pr-4">{r.activity_genre_name}</td>
                          <td className="py-2 text-right tabular-nums font-medium">
                            {r.points.toLocaleString("ja-JP")} pt
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="pt-3">合計</td>
                        <td className="pt-3 text-right tabular-nums">
                          {data.total_points.toLocaleString("ja-JP")} pt
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </>
          ) : null}

          <div className="mt-8 border-t border-slate-100 pt-4">
            <Link href="/dashboard" className="text-sm text-[#0178C8] hover:underline">
              ダッシュボードへ戻る
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
