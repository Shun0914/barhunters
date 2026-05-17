import { apiFetch, getApiBaseUrl } from "@/lib/api";
import type { IndicatorMetaMap } from "./meta";
import type { CascadeResponse, PointsInput } from "./types";

export async function simulateCascade(
  points: PointsInput,
  signal?: AbortSignal,
): Promise<CascadeResponse> {
  const url = `${getApiBaseUrl()}/api/cascade/simulate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST /api/cascade/simulate ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as CascadeResponse;
}

/**
 * 指標の説明メタを取得する。
 * backend/data/indicator_meta.json が単一の正（Issue #28）。
 */
export async function fetchIndicatorMeta(
  signal?: AbortSignal,
): Promise<IndicatorMetaMap> {
  const url = `${getApiBaseUrl()}/api/cascade/indicator-meta`;
  const res = await fetch(url, { method: "GET", cache: "no-store", signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GET /api/cascade/indicator-meta ${res.status}: ${body || res.statusText}`,
    );
  }
  return (await res.json()) as IndicatorMetaMap;
}

/** 承認済みポイントの9セル集計（全社固定）。 */
export async function fetchAggregatedPoints(
  signal?: AbortSignal,
): Promise<PointsInput> {
  return apiFetch<PointsInput>("/api/cascade/aggregated-points?scope=company", {
    method: "GET",
    signal,
  });
}
