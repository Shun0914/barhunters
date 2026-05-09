import { getApiBaseUrl } from "@/lib/api";
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
