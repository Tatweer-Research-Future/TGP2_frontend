/*
 Centralized API client for the app.
 - Reads base URL from Vite env (VITE_API_BASE_URL)
 - Sends credentials for cookie-based auth
 - Handles CSRF token retrieval/attachment for unsafe HTTP methods
 - Attaches Authorization header when access token is available (fallback)
*/

/* permissions

HR, TECH , PRESENTATION -- 3  (see UserDetailPage and UsersPage only, UserDetailPage home)
PRESENTATION -- 4 (UserDetailPage and UsersPage only, UserDetailPage home)
INSTRUCTOR,DATA -- 5 (UserDetailPage and UsersPage and FormsPage only, FormsPage home)
TRAINEE -- 8 (FormsPage only, is home)
SUPPORT -- 9 (AttendancePage only, is home)
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

// --- Auth / Current user profile ---
export type CurrentUserResponse = {
  user_id: number;
  user_name: string;
  user_email: string;
  groups: string[];
  group_id?: number; // Add group_id field for permission system
};

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiFetch<CurrentUserResponse>(`/me`);
}

// Candidate API types and functions
export type BackendCandidate = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  full_name?: string;
  forms?: Array<{ id: number; title: string; forms_by_me: boolean }>; // updated API
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
  return apiFetch<CandidatesResponse>(`/users/?group_id=${groupId}`); //TODO: remove this group_id
}

export async function getCandidateById(id: string): Promise<BackendCandidate> {
  return apiFetch<BackendCandidate>(`/users/${id}/`);
}

// Add: Detailed user API response and fetcher
export type BackendUserDetail = {
  id: number;
  email: string;
  name: string;
  ai_analysis?: string | null;
  forms?: Array<{ id: number; title: string; forms_by_me: boolean }>; // updated API
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
  // Optional attendance log returned by backend for this user
  attendance_log?: {
    attendance_days: number;
    absent_days: number;
    details: Array<{
      date: string;
      event: string;
      check_in: string | null;
      check_out: string | null;
      status: string | null;
      notes: string | null;
    }>;
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
    has_submitted: boolean;
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

export type BackendForm = {
  id: number;
  title: string;
  is_sub_questions: boolean;
  fields: BackendFormField[];
};

export async function getForms(): Promise<BackendFormsList> {
  return apiFetch<BackendFormsList>(`/forms/`);
}

export async function getFormById(
  id: number | string
): Promise<BackendForm> {
  return apiFetch<BackendForm>(`/forms/${id}`);
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

// Attendance API types and functions
export type AttendanceEvent = {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
};

export type AttendanceLog = {
  id: number;
  trainee: { id: number; name: string; email: string };
  event: AttendanceEvent;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  notes: string;
};

export type AttendanceOverviewUser = {
  user_id: number;
  user_name: string;
  user_email: string;
  events: Array<{
    event_id: number;
    event_title: string;
    has_log: boolean;
    check_in_time: string | null;
    check_out_time: string | null;
    notes: string | null;
    log_id: number | null;
  }>;
};

export type AttendanceOverviewResponse = {
  date: string;
  events: AttendanceEvent[];
  users: AttendanceOverviewUser[];
  count: number;
};

export type CheckInPayload = {
  candidate_id: number;
  event: number;
  attendance_date: string;
  check_in_time: string;
  notes?: string;
};

export type CheckOutPayload = {
  candidate_id: number;
  event: number;
  attendance_date: string;
  check_out_time: string;
  notes?: string;
};

export type AttendanceSubmitResponse = {
  total: number;
  success: number;
  errors: number;
  results: Array<{
    identifier: number;
    status: "success" | "error";
    message: string;
    candidate?: { id: number; email: string; name: string };
    data?: any;
    errors?: any;
  }>;
};

// Attendance API functions
export async function getEvents(): Promise<AttendanceEvent[]> {
  const response = await apiFetch<{ results: AttendanceEvent[] }>(
    "/attendance/events/"
  );
  return response.results;
}

export async function submitCheckIn(
  payload: CheckInPayload
): Promise<AttendanceSubmitResponse> {
  return apiFetch<AttendanceSubmitResponse>("/attendance/submit/", {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

export async function submitCheckOut(
  payload: CheckOutPayload
): Promise<AttendanceSubmitResponse> {
  return apiFetch<AttendanceSubmitResponse>("/attendance/submit/", {
    method: "PUT",
    body: payload,
    requireCsrf: true,
  });
}

export async function getMyLogs(date?: string): Promise<AttendanceLog[]> {
  const url = date
    ? `/attendance/my-logs/?date=${date}`
    : "/attendance/my-logs/";
  const response = await apiFetch<{ results: AttendanceLog[] }>(url);
  return response.results;
}

export async function getAttendanceOverview(
  date?: string
): Promise<AttendanceOverviewResponse> {
  const url = date
    ? `/attendance/overview/?date=${date}`
    : "/attendance/overview/";
  return apiFetch<AttendanceOverviewResponse>(url);
}

export async function getUserAttendanceHistory(
  userId: string
): Promise<AttendanceLog[]> {
  const response = await apiFetch<{ results: AttendanceLog[] }>(
    `/attendance/user-logs/${userId}/`
  );
  return response.results;
}

// Alternative: Get user attendance from overview data
export async function getUserAttendanceFromOverview(
  userId: string
): Promise<AttendanceLog[]> {
  try {
    console.log("Getting attendance for user:", userId);

    // Get attendance overview for the last 30 days to find user's attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs: AttendanceLog[] = [];

    // Check last 30 days for attendance data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      try {
        const overview = await getAttendanceOverview(dateString);
        console.log(`Checking date ${dateString}:`, overview);

        const user = overview.users.find(u => u.user_id.toString() === userId);
        console.log(`Found user for date ${dateString}:`, user);

        if (user) {
          user.events.forEach(event => {
            if (event.check_in_time) {
              console.log(`Adding attendance log for date ${dateString}:`, event);
              logs.push({
                id: 0, // We don't have the actual log ID from overview
                trainee: {
                  id: user.user_id,
                  name: user.user_name,
                  email: user.user_email
                },
                event: overview.events.find(e => e.id === event.event_id) || {
                  id: event.event_id,
                  title: `Event ${event.event_id}`,
                  start_time: '',
                  end_time: ''
                },
                attendance_date: dateString,
                check_in_time: event.check_in_time,
                check_out_time: event.check_out_time,
                notes: ''
              });
            }
          });
        }
      } catch (error) {
        // Skip dates that don't have data
        console.log(`No data for date ${dateString}:`, error);
        continue;
      }
    }

    console.log("Final logs:", logs);
    return logs;
  } catch (error) {
    console.error("Failed to get user attendance from overview:", error);
    return [];
  }
}
// --- AI analysis storage ---
export type AiAnalysisResponse = {
  ai_analysis: string | null;
};

export async function getUserAiAnalysis(
  userId: string | number
): Promise<AiAnalysisResponse> {
  const user = await getUserDetailById(String(userId));
  return { ai_analysis: user.ai_analysis ?? null } as AiAnalysisResponse;
}

export async function patchUserAiAnalysis(
  userId: string | number,
  aiText: string
): Promise<AiAnalysisResponse> {
  return apiFetch<AiAnalysisResponse>(`/users/${userId}/ai-analysis/`, {
    method: "PATCH",
    body: { ai_analysis: aiText },
    requireCsrf: true,
  });
}

// Export attendance CSV from backend
export async function exportAttendanceCSV(params: {
  from_date: string;
  to_date: string;
  track?: string;
  event?: string;
}): Promise<Blob> {
  const searchParams = new URLSearchParams({
    from_date: params.from_date,
    to_date: params.to_date,
  });

  if (params.track) {
    searchParams.append('track', params.track);
  }
  if (params.event) {
    searchParams.append('event', params.event);
  }

  const response = await fetch(`${apiBaseUrl}/export-attendance-csv/?${searchParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }

  return response.blob();
}