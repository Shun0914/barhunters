import { apiFetch } from "@/lib/api";
import type {
  ActivityGenre,
  ApplicationStatusTab,
  ApprovalRoute,
  PointApplication,
  PointApplicationDraftIn,
} from "@/lib/api/types";

export function fetchActivityGenres(): Promise<ActivityGenre[]> {
  return apiFetch<ActivityGenre[]>("/api/masters/activity-genres");
}

export function fetchApprovalRoute(
  applicantUserId?: string,
): Promise<ApprovalRoute> {
  const qs = applicantUserId
    ? `?applicant_user_id=${encodeURIComponent(applicantUserId)}`
    : "";
  return apiFetch<ApprovalRoute>(`/api/users/approval-route${qs}`);
}

export function fetchLatestDraft(): Promise<PointApplication | null> {
  return apiFetch<PointApplication[]>(
    "/api/point-applications?status=draft&limit=1&order=updated_at_desc",
  ).then((arr) => (arr.length > 0 ? arr[0] : null));
}

export function createDraft(
  payload: PointApplicationDraftIn,
): Promise<PointApplication> {
  return apiFetch<PointApplication>("/api/point-applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDraft(
  id: string,
  payload: PointApplicationDraftIn,
): Promise<PointApplication> {
  return apiFetch<PointApplication>(`/api/point-applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitApplication(id: string): Promise<PointApplication> {
  return apiFetch<PointApplication>(`/api/point-applications/${id}/submit`, {
    method: "POST",
  });
}

export function fetchApplications(params: {
  tab?: ApplicationStatusTab;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<PointApplication[]> {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.q) search.set("q", params.q);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiFetch<PointApplication[]>(
    `/api/point-applications${qs ? `?${qs}` : ""}`,
  );
}

export function withdrawApplication(id: string): Promise<PointApplication> {
  return apiFetch<PointApplication>(
    `/api/point-applications/${id}/withdraw`,
    { method: "POST" },
  );
}
