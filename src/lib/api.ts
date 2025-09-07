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

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      // Clear invalid tokens and user data
      setAccessToken(null);
      localStorage.removeItem("auth_user");

      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
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

// Candidate API types and functions
export type BackendCandidate = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  interviewed_by_me: boolean;
  full_name?: string;
};

export type CandidatesResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: BackendCandidate[];
};

export async function getCandidates(
  groupId: number = 1
): Promise<CandidatesResponse> {
  return apiFetch<CandidatesResponse>(`/users/?group_id=${groupId}`);
}

export async function getCandidateById(id: string): Promise<BackendCandidate> {
  return apiFetch<BackendCandidate>(`/users/${id}/`);
}

// Add: Detailed user API response and fetcher
export type BackendUserDetail = {
  id: number;
  email: string;
  name: string;
  interviewed_by_me: boolean;
  forms_entries?: Array<{
    form: { id: number; title: string };
    entries: Array<{
      id: number;
      submitted_by: { id: number; name: string };
      final_score: number;
      fields: Array<
        | { label: string; option: string; score: number }
        | { label: string; text: string }
      >;
    }>;
  }>;
  additional_fields?: {
    cert?: string;
    lang?: string;
    phone?: string | null;
    github?: string | null;
    phone2?: string | null;
    linkedin?: string | null;
    full_name?: string | null;
    other_city?: string | null;
    reached_by?: string | null;
    nationality?: string | null;
    other_files?: string[] | string | null;
    full_name_en?: string | null;
    aditional_info?: string | null;
    graduation_year?: string | null;
    iq_exam_score?: string | null;
    english_exam_score?: string | null;
    city_job_commitment?: string | null;
    full_time_commitment?: string | null;
    other_specialization?: string | null;
    statement_of_purpose?: string | null;
    additional_information?: {
      gpa?: string | null;
      city?: string | null;
      gender?: string | null;
      birthdate?: string | null;
      resumeUrl?: string | null;
      coursesTaken?: Array<{
        date: string | null;
        name: string | null;
        entity: string | null;
      }> | null;
      fieldOfStudy?: string | null;
      fieldsChosen?: string[] | null;
      qualification?: string | null;
      workExperience?: Array<{
        project?: string | null;
        company?: string | null;
        duration?: string | null;
      }> | null;
      englishProficiency?: string | null;
      institutionName?: string | null;
      technicalSkills?: Array<{
        skill?: string | null;
        medium?: string | null;
        proficiency?: string | null;
      }> | null;
    } | null;
  } | null;
};

export async function getUserDetailById(
  id: string
): Promise<BackendUserDetail> {
  return apiFetch<BackendUserDetail>(`/users/${id}/`);
}

// Forms API
export type BackendFormsList = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: number;
    title: string;
    expairy_date: string;
  }>;
};

export type BackendFormOption = {
  id: number;
  label: string;
  score: string; // numeric as string
  order: number;
};

export type BackendFormScale = {
  id: number;
  name: string;
  options: BackendFormOption[];
};

export type BackendFormField = {
  id: number;
  label: string;
  type: "email" | "question" | "text";
  required: boolean;
  order: number;
  scale: BackendFormScale | null;
  weight: string; // numeric as string
  suggested_questions?: string;
};

export async function getForms(): Promise<BackendFormsList> {
  return apiFetch<BackendFormsList>(`/forms/`);
}

export async function getFormById(
  id: number | string
): Promise<BackendFormField[]> {
  return apiFetch<BackendFormField[]>(`/forms/${id}`);
}

// Submit completed form
export type SubmitFormPayload = {
  form_id: number;
  targeted_user_id: number;
  form_fields: Array<{
    form_field_id: number;
    selected_option_id: number | null;
    text_field_entry: string;
  }>;
};

export type SubmitFormResponse = {
  detail?: string;
  success?: boolean;
  [key: string]: unknown;
};

export async function submitForm(
  payload: SubmitFormPayload
): Promise<SubmitFormResponse> {
  return apiFetch<SubmitFormResponse>(`/forms/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}
