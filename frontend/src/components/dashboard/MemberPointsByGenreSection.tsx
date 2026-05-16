"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchOrgMemberPointsByGenre } from "@/lib/api/pointsBreakdown";
import type { OrgMemberPointsByGenreResponse } from "@/lib/api/types";

type Props = { fyLabel: string; month: number };

type GenreCol = { id: number; name: string; sort: number };

function buildPivot(rows: OrgMemberPointsByGenreResponse["rows"]) {
  const memberOrder: { id: string; name: string }[] = [];
  const seenMember = new Set<string>();
  for (const r of rows) {
    if (!seenMember.has(r.applicant_user_id)) {
      seenMember.add(r.applicant_user_id);
      memberOrder.push({ id: r.applicant_user_id, name: r.applicant_name });
    }
  }
  memberOrder.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  const genreMap = new Map<number, GenreCol>();
  for (const r of rows) {
    genreMap.set(r.activity_genre_id, {
      id: r.activity_genre_id,
      name: r.activity_genre_name,
      sort: r.genre_sort_order,
    });
  }
  const genreCols = [...genreMap.values()].sort((a, b) =>
    a.sort !== b.sort ? a.sort - b.sort : a.id - b.id,
  );

  const cell = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (!cell.has(r.applicant_user_id)) {
      cell.set(r.applicant_user_id, new Map());
    }
    cell.get(r.applicant_user_id)!.set(r.activity_genre_id, r.points);
  }

  const rowTotals = new Map<string, number>();
  for (const m of memberOrder) {
    let sum = 0;
    for (const g of genreCols) {
      sum += cell.get(m.id)?.get(g.id) ?? 0;
    }
    rowTotals.set(m.id, sum);
  }

  return { memberOrder, genreCols, cell, rowTotals };
}

export function MemberPointsByGenreSection({ fyLabel, month }: Props) {
  const [data, setData] = useState<OrgMemberPointsByGenreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrgMemberPointsByGenre(fyLabel, month)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 403) {
          setData(null);
          setError(null);
          return;
        }
        setData(null);
        setError(
          e instanceof ApiError
            ? `部署別内訳の取得に失敗（${e.status}）`
            : "部署別内訳の取得に失敗しました",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [fyLabel, month]);

  const pivoted = useMemo(() => {
    if (!data || data.rows.length === 0) return null;
    return buildPivot(data.rows);
  }, [data]);

  if (error) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {error}
      </div>
    );
  }

  if (!data || data.rows.length === 0 || !pivoted) {
    return null;
  }

  const { memberOrder, genreCols, cell, rowTotals } = pivoted;

  return (
    <section className="rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-2">
        <h2 className="text-[14px] font-semibold text-ink-primary">部署メンバー×活動ジャンル（pt）</h2>
        <span className="text-[11px] text-slate-500">
          {data.fy} 〜 {data.month}月末累計／承認済みのみ／自所属のみ
        </span>
      </div>
      <div className="max-h-[min(360px,50vh)] overflow-auto">
        <table className="w-full border-collapse text-left text-[11px] text-slate-800">
          <thead className="sticky top-0 z-[1] bg-white shadow-sm">
            <tr className="border-b border-slate-200">
              <th className="whitespace-nowrap py-2 pl-2 pr-3 font-medium">氏名</th>
              {genreCols.map((g) => (
                <th
                  key={g.id}
                  className="min-w-[4.5rem] whitespace-nowrap py-2 px-1 text-center font-normal text-[10px] leading-tight text-slate-600"
                  title={g.name}
                >
                  {g.name}
                </th>
              ))}
              <th className="py-2 pr-2 text-right font-medium tabular-nums">計</th>
            </tr>
          </thead>
          <tbody>
            {memberOrder.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="whitespace-nowrap py-1.5 pl-2 pr-3">{m.name}</td>
                {genreCols.map((g) => {
                  const val = cell.get(m.id)?.get(g.id) ?? 0;
                  return (
                    <td key={g.id} className="py-1.5 text-center tabular-nums">
                      {val > 0 ? val : "—"}
                    </td>
                  );
                })}
                <td className="py-1.5 pr-2 text-right font-medium tabular-nums">
                  {rowTotals.get(m.id)!.toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
