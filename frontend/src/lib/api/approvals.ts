import { apiFetch } from "@/lib/api";
import type { PointApplication, UserBrief } from "@/lib/api/types";

export type ApprovalTab = "waiting" | "completed" | "all";

export function fetchApprovals(params: {
  tab?: ApprovalTab;
  applicantUserId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<PointApplication[]> {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.applicantUserId)
    search.set("applicant_user_id", params.applicantUserId);
  if (params.q) search.set("q", params.q);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiFetch<PointApplication[]>(`/api/approvals${qs ? `?${qs}` : ""}`);
}

export function fetchApprovalApplicants(): Promise<UserBrief[]> {
  return apiFetch<UserBrief[]>("/api/approvals/applicants");
}

export function approveApplication(id: string): Promise<PointApplication> {
  return apiFetch<PointApplication>(`/api/approvals/${id}/approve`, {
    method: "POST",
  });
}

export function returnApplication(id: string): Promise<PointApplication> {
  return apiFetch<PointApplication>(`/api/approvals/${id}/return`, {
    method: "POST",
  });
}
