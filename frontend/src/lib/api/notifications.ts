import { apiFetch } from "@/lib/api";
import type { Notification, NotificationTab } from "@/lib/api/types";

// 通知の未読/既読が変化したときに発火するブラウザ内イベント。
// 通知ベル（NotificationBell）が listen して即座にバッジを更新する。
export const NOTIFICATIONS_CHANGED_EVENT = "barhunters:notifications:changed";

export function emitNotificationsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
  }
}

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
