/*
 Centralized API client for the app.
 - Reads base URL from Vite env (VITE_API_BASE_URL)
 - Sends credentials for cookie-based auth
 - Handles CSRF token retrieval/attachment for unsafe HTTP methods
 - Attaches Authorization header when access token is available (fallback)
*/

const defaultBaseUrl = "https://cbl.futr.ly/api/v1";

export const apiBaseUrl: string =
  (import.meta as any).env?.VITE_API_BASE_URL ?? defaultBaseUrl;

let cachedCsrfToken: string | null = null;

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;

  // Try from cookie (common name csrftoken)
  const cookieToken = getCookieValue("csrftoken");
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  // Fallback: call CSRF endpoint which also sets cookie
  const response = await fetch(joinUrl(apiBaseUrl, "/csrf_token"), {
    method: "GET",
    credentials: "include",
  });
  // Don't throw on non-200; try to parse
  try {
    const data = (await response.json()) as { csrfToken?: string } | undefined;
    if (data?.csrfToken) {
      cachedCsrfToken = data.csrfToken;
      return data.csrfToken;
    }
  } catch (_) {
    // ignore
  }

  // Try cookie again after request
  const cookieTokenAfter = getCookieValue("csrftoken");
  if (cookieTokenAfter) {
    cachedCsrfToken = cookieTokenAfter;
    return cookieTokenAfter;
  }

  // As last resort, return empty (some endpoints may not require CSRF for JWT-only setups)
  return "";
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  // If true, will force fetching CSRF token before the request, regardless of method
  requireCsrf?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const url = joinUrl(apiBaseUrl, path);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };

  const needsCsrf =
    options.requireCsrf || ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (needsCsrf) {
    const token = await ensureCsrfToken();
    if (token) {
      // Common header names: X-CSRFToken (Django), X-CSRF-Token
      headers["X-CSRFToken"] = token;
    }
  }

  const accessToken = getAccessToken();
  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch (_) {
      // ignore
    }
    const error = new Error(
      typeof detail === "object" && detail !== null
        ? JSON.stringify(detail)
        : response.statusText
    );
    // Attach for consumer
    (error as any).status = response.status;
    (error as any).data = detail;
    throw error;
  }

  // Some responses (204) have no body
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = (await response.json()) as T;
  return data;
}

function joinUrl(base: string, path: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift() || null;
  return null;
}
