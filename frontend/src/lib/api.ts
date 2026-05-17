/** バックエンド API のベース URL（末尾スラッシュなし）。 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return raw.replace(/\/$/, "");
}

/** デモ: ログイン後に左下で別ユーザーとして API を叩く（backend ALLOW_DEV_AUTH_HEADER 要）。 */
export function isDevUserSwitchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEV_USER_SWITCH === "true";
}

/** API 共通の HTTP エラー。 */
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

const DEV_USER_STORAGE_KEY = "barhunters:devUserId";

export function getDevUserId(): string | null {
  if (!isDevUserSwitchEnabled()) return null;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEV_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDevUserId(id: string | null): void {
  if (!isDevUserSwitchEnabled()) return;
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(DEV_USER_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(DEV_USER_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/** API ベースで JSON を fetch するヘルパー（クライアントコンポーネント向け）。 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const devUserId = getDevUserId();
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(devUserId ? { "X-Dev-User-Id": devUserId } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
