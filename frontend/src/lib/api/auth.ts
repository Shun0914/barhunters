import { apiFetch } from "@/lib/api";
import type { UserBrief } from "@/lib/api/types";

export type LoginResponse = { user: UserBrief };

export function login(loginId: string, password: string) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password }),
  });
}

export function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export function fetchSession() {
  return apiFetch<UserBrief>("/api/auth/session");
}
