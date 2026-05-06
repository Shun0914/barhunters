/** バックエンド API のベース URL（末尾スラッシュなし）。 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  return raw.replace(/\/$/, "");
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

/** 開発用のダミーログインユーザー切替（spec.md §5.0 / Q-50）。
 *  バックエンドの auth.py が `X-Dev-User-Id` を見て current user を解決する。
 *  ブラウザの localStorage にユーザー ID を保存し、毎リクエストでヘッダ付与。 */
const DEV_USER_STORAGE_KEY = "barhunters:devUserId";

export function getDevUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEV_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDevUserId(id: string | null): void {
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
