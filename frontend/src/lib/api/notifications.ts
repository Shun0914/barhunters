import { apiFetch } from "@/lib/api";
import type { Notification, NotificationTab } from "@/lib/api/types";

export function fetchNotifications(params: {
  tab?: NotificationTab;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.q) search.set("q", params.q);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiFetch<Notification[]>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function fetchRecentNotifications(limit = 4): Promise<Notification[]> {
  return apiFetch<Notification[]>(
    `/api/notifications/recent?limit=${limit}`,
  );
}

export function fetchUnreadCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiFetch<Notification>(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}
