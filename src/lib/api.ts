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

// Helper for multipart/form-data requests (file uploads)
export async function apiFetchFormData<T>(
  path: string,
  formData: FormData,
  options: {
    method?: "POST" | "PUT" | "PATCH";
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = options.method ?? "POST";
  const url = joinUrl(apiBaseUrl, path);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };

  // CSRF for unsafe methods
  const token = await ensureCsrfToken();
  if (token) headers["X-CSRFToken"] = token;

  // Auth
  const accessToken = getAccessToken();
  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers, // Deliberately omit Content-Type so browser sets proper boundary
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch (_) {}

    const error = new Error(
      typeof detail === "object" && detail !== null
        ? JSON.stringify(detail)
        : response.statusText
    );
    (error as any).status = response.status;
    (error as any).data = detail;
    throw error;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

// --- Auth / Current user profile ---
export type CurrentUserResponse = {
  user_id: number;
  user_name: string;
  user_email: string;
  is_staff?: boolean;
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
  groups?: string[]; // User groups array
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

export async function getFormById(id: number | string): Promise<BackendForm> {
  return apiFetch<BackendForm>(`/forms/${id}`);
}

// Forms submissions summary API
export type FormSubmissionsSummary = {
  form: { id: number; title: string };
  totals: {
    entries_count: number;
    sum_final_scores: string; // decimal as string
    max_total_overall: string; // decimal as string
    max_total_per_entry: string; // decimal as string
  };
  fields: Array<
    | {
        id: number;
        label: string;
        type: "question";
        required: boolean;
        order: number;
        weight: string;
        responses_count: number;
        sum_weighted_score: string;
        max_possible: string;
        options: Array<{ id: number; label: string; count: number }>;
      }
    | {
        id: number;
        label: string;
        type: "text" | "email";
        required: boolean;
        order: number;
        weight: string;
        responses_count: number;
        texts: string[];
      }
  >;
  grouped_by_person_group?: Array<{
    group: {
      id: number;
      name: string;
    };
    totals: {
      entries_count: number;
      sum_final_scores: string;
      max_total_overall: string;
      max_total_per_entry: string;
    };
    fields: Array<
      | {
          id: number;
          label: string;
          type: "question";
          required: boolean;
          order: number;
          weight: string;
          responses_count: number;
          sum_weighted_score: string;
          max_possible: string;
          options: Array<{ id: number; label: string; count: number }>;
        }
      | {
          id: number;
          label: string;
          type: "text" | "email";
          required: boolean;
          order: number;
          weight: string;
          responses_count: number;
          texts: string[];
        }
    >;
  }>;
};

export async function getFormSubmissionsSummary(
  id: number | string
): Promise<FormSubmissionsSummary> {
  return apiFetch<FormSubmissionsSummary>(`/forms/${id}/submissions-summary/`);
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
    // Break-related fields provided by the attendance overview endpoint
    break_started_at?: string | null;
    break_time?: string | null;
    break_accumulated?: string | null;
    break_intervals?: Array<{
      start: string;
      end: string | null;
    }>;
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
  // Optional notes included in all attendance updates
  notes?: string;
};

// General-purpose attendance update payload for PUT /attendance/submit/
// Supports setting check-out time and/or starting/ending breaks.
export type AttendanceUpdatePayload = {
  candidate_id: number;
  event: number;
  attendance_date: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
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

// Submit a generic attendance update (check-out and/or break start/end)
export async function submitAttendanceUpdate(
  payload: AttendanceUpdatePayload
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
      const dateString = date.toISOString().split("T")[0];

      try {
        const overview = await getAttendanceOverview(dateString);
        console.log(`Checking date ${dateString}:`, overview);

        const user = overview.users.find(
          (u) => u.user_id.toString() === userId
        );
        console.log(`Found user for date ${dateString}:`, user);

        if (user) {
          user.events.forEach((event) => {
            if (event.check_in_time) {
              console.log(
                `Adding attendance log for date ${dateString}:`,
                event
              );
              logs.push({
                id: 0, // We don't have the actual log ID from overview
                trainee: {
                  id: user.user_id,
                  name: user.user_name,
                  email: user.user_email,
                },
                event: overview.events.find((e) => e.id === event.event_id) || {
                  id: event.event_id,
                  title: `Event ${event.event_id}`,
                  start_time: "",
                  end_time: "",
                },
                attendance_date: dateString,
                check_in_time: event.check_in_time,
                check_out_time: event.check_out_time,
                notes: "",
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
    searchParams.append("track", params.track);
  }
  if (params.event) {
    searchParams.append("event", params.event);
  }

  const response = await fetch(
    `${apiBaseUrl}/export-attendance-csv/?${searchParams}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }

  return response.blob();
}

// --- Portal (Tracks/Modules/Sessions) ---
export type PortalContent = {
  id: number;
  title: string;
  file: string | null;
  link: string | null;
  created_at: string;
};

export type PortalAssignment = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  type: string;
  is_gradable: boolean;
  link?: string | null;
  file?: string | null;
  my_submissions?: AssignmentSubmission[];
};

export type PortalSession = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  start_time: string | null;
  end_time: string | null;
  content: PortalContent[];
  assignments: PortalAssignment[];
};

export type PortalModule = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  type: string; // "WEEK"
  sessions: PortalSession[];
  // Optional embedded test summary for this module (single test per module)
  test?: ModuleTestSummary;
};

export type PortalTrack = {
  id: number;
  name: string;
  description: string | null;
  modules: PortalModule[];
};

export type PortalTracksResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: PortalTrack[];
};

export async function getPortalTracks(): Promise<PortalTracksResponse> {
  return apiFetch<PortalTracksResponse>(`/portal/tracks/`);
}

// Modules list (for My Track)
export type PortalModulesResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: PortalModule[];
};

export async function getPortalModules(): Promise<PortalModulesResponse> {
  // Prefer portal-scoped modules endpoint
  return apiFetch<PortalModulesResponse>(`/portal/modules/`);
}

export type UpdatePortalModulePayload = Partial<
  Pick<PortalModule, "title" | "description" | "order">
>;

export async function updatePortalModule(
  id: number | string,
  payload: UpdatePortalModulePayload
): Promise<PortalModule> {
  return apiFetch<PortalModule>(`/portal/modules/${id}/`, {
    method: "PUT",
    body: payload,
    requireCsrf: true,
  });
}

// --- Portal Sessions ---
export async function getPortalSession(
  id: number | string
): Promise<PortalSession> {
  return apiFetch<PortalSession>(`/portal/sessions/${id}/`);
}

export type UpdatePortalSessionPayload = Partial<
  Pick<PortalSession, "title" | "description" | "start_time" | "end_time">
>;

export async function updatePortalSession(
  id: number | string,
  payload: UpdatePortalSessionPayload
): Promise<PortalSession> {
  return apiFetch<PortalSession>(`/portal/sessions/${id}/`, {
    method: "PUT",
    body: payload,
    requireCsrf: true,
  });
}

export async function uploadPortalSessionContentFile(
  id: number | string,
  params: { file: File; title?: string; link?: string | null }
): Promise<PortalContent> {
  const form = new FormData();
  form.append("file", params.file);
  if (params.title) form.append("title", params.title);
  if (params.link !== undefined && params.link !== null) {
    form.append("link", params.link);
  }
  return apiFetchFormData<PortalContent>(
    `/portal/sessions/${id}/content/`,
    form,
    {
      method: "POST",
    }
  );
}

// Delete a session content item
export async function deletePortalSessionContent(
  sessionId: number | string,
  contentId: number | string
): Promise<void> {
  return apiFetch<void>(`/portal/sessions/${sessionId}/content/${contentId}/`, {
    method: "DELETE",
    requireCsrf: true,
  });
}

// --- Portal Assignments ---
export type CreatePortalAssignmentPayload = {
  title: string;
  description?: string | null;
  due_date?: string | null; // ISO string
  type?: string; // default NOT_GRADED
  is_gradable?: boolean;
  link?: string | null;
};

export async function createPortalAssignment(
  sessionId: number | string,
  payload: CreatePortalAssignmentPayload
): Promise<PortalAssignment> {
  const body = {
    type: "NOT_GRADED",
    is_gradable: false,
    session: sessionId,
    ...payload,
  } as Record<string, unknown>;
  return apiFetch<PortalAssignment>(`/portal/assignments/`, {
    method: "POST",
    body,
    requireCsrf: true,
  });
}

export type UpdatePortalAssignmentPayload = Partial<{
  title: string;
  description: string | null;
  due_date: string | null;
  type: string;
  is_gradable: boolean;
  link: string | null;
}>;

export async function updatePortalAssignment(
  assignmentId: number | string,
  payload: UpdatePortalAssignmentPayload
): Promise<PortalAssignment> {
  return apiFetch<PortalAssignment>(`/portal/assignments/${assignmentId}/`, {
    method: "PUT",
    body: payload,
    requireCsrf: true,
  });
}

// Create assignment with file support
export async function createPortalAssignmentWithFile(
  sessionId: number | string,
  params: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    type?: string;
    is_gradable?: boolean;
    link?: string | null;
    file?: File | null;
  }
): Promise<PortalAssignment> {
  const form = new FormData();
  form.append("title", params.title);
  if (params.description !== undefined && params.description !== null) {
    form.append("description", params.description);
  }
  if (params.due_date !== undefined && params.due_date !== null) {
    form.append("due_date", params.due_date);
  }
  if (params.type !== undefined) {
    form.append("type", params.type);
  }
  if (params.is_gradable !== undefined) {
    form.append("is_gradable", String(params.is_gradable));
  }
  if (params.link !== undefined && params.link !== null) {
    form.append("link", params.link);
  }
  if (params.file) {
    form.append("file", params.file);
  }
  form.append("session", String(sessionId));

  return apiFetchFormData<PortalAssignment>(`/portal/assignments/`, form, {
    method: "POST",
  });
}

// Update assignment with file support
export async function updatePortalAssignmentWithFile(
  assignmentId: number | string,
  params: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    type?: string;
    is_gradable?: boolean;
    link?: string | null;
    file?: File | null;
    session?: number | string;
  }
): Promise<PortalAssignment> {
  const form = new FormData();
  if (params.title !== undefined) {
    form.append("title", params.title);
  }
  if (params.description !== undefined && params.description !== null) {
    form.append("description", params.description);
  }
  if (params.due_date !== undefined && params.due_date !== null) {
    form.append("due_date", params.due_date);
  }
  if (params.type !== undefined) {
    form.append("type", params.type);
  }
  if (params.is_gradable !== undefined) {
    form.append("is_gradable", String(params.is_gradable));
  }
  if (params.link !== undefined && params.link !== null) {
    form.append("link", params.link);
  }
  if (params.file) {
    form.append("file", params.file);
  }
  if (params.session !== undefined) {
    form.append("session", String(params.session));
  }

  return apiFetchFormData<PortalAssignment>(
    `/portal/assignments/${assignmentId}/`,
    form,
    {
      method: "PUT",
    }
  );
}

export async function deletePortalAssignment(
  assignmentId: number | string
): Promise<void> {
  return apiFetch<void>(`/portal/assignments/${assignmentId}/`, {
    method: "DELETE",
    requireCsrf: true,
  });
}

// --- Assignment submission (trainee) ---
export type SubmitAssignmentPayload = {
  submitted_link: string;
  note?: string | null;
};

export type SubmitAssignmentResponse = {
  id: number;
  assignment: number;
  trainee: number;
  is_gradable: boolean;
  submitted_link: string;
  note: string | null;
  submitted_at: string;
};

export async function submitAssignment(
  assignmentId: number | string,
  payload: SubmitAssignmentPayload
): Promise<SubmitAssignmentResponse> {
  return apiFetch<SubmitAssignmentResponse>(
    `/portal/assignments/${assignmentId}/submit/`,
    {
      method: "POST",
      body: payload,
      requireCsrf: true,
    }
  );
}

export type PortalSubmission = {
  id: number;
  assignment: number;
  trainee: number;
  is_gradable: boolean;
  submitted_link: string;
  note: string | null;
  submitted_at: string;
};

export type CreatePortalSubmissionPayload = {
  assignment: number;
  submitted_link: string;
  note?: string | null;
};

export type UpdatePortalSubmissionPayload = Partial<{
  assignment: number;
  submitted_link: string;
  note: string | null;
}>;

export async function createOrUpdatePortalSubmission(
  payload: CreatePortalSubmissionPayload
): Promise<PortalSubmission> {
  return apiFetch<PortalSubmission>(`/portal/submissions/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

export async function getPortalSubmission(
  submissionId: number | string
): Promise<PortalSubmission> {
  return apiFetch<PortalSubmission>(`/portal/submissions/${submissionId}/`);
}

export async function updatePortalSubmission(
  submissionId: number | string,
  payload: UpdatePortalSubmissionPayload
): Promise<PortalSubmission> {
  return apiFetch<PortalSubmission>(`/portal/submissions/${submissionId}/`, {
    method: "PATCH",
    body: payload,
    requireCsrf: true,
  });
}

export async function deletePortalSubmission(
  submissionId: number | string
): Promise<void> {
  return apiFetch<void>(`/portal/submissions/${submissionId}/`, {
    method: "DELETE",
    requireCsrf: true,
  });
}

// --- Announcements API ---
export type Announcement = {
  id: number;
  title: string;
  body: string;
  scope: "GLOBAL" | "TRACK";
  track: number | null;
  publish_at: string;
  expire_at: string | null;
  is_disabled: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type AnnouncementsResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: Announcement[];
};

export async function getAnnouncements(params?: {
  track?: string;
  scope?: "GLOBAL" | "TRACK";
  include_inactive?: boolean;
}): Promise<AnnouncementsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.track) searchParams.append("track", params.track);
  if (params?.scope) searchParams.append("scope", params.scope);
  if (params?.include_inactive) searchParams.append("include_inactive", "1");

  const query = searchParams.toString();
  return apiFetch<AnnouncementsResponse>(
    `/portal/announcements/${query ? `?${query}` : ""}`
  );
}

export async function getAnnouncementById(id: number): Promise<Announcement> {
  return apiFetch<Announcement>(`/portal/announcements/${id}/`);
}

export type CreateAnnouncementPayload = {
  title: string;
  body: string;
  scope: "GLOBAL" | "TRACK";
  track?: number | null;
  publish_at: string;
  expire_at?: string | null;
  is_disabled?: boolean;
};

export type UpdateAnnouncementPayload = Partial<CreateAnnouncementPayload>;

export type CreateInstructorAnnouncementPayload = {
  title: string;
  body: string;
  track?: number | null;
  publish_at: string;
  expire_at?: string | null;
  is_disabled?: boolean;
};

export async function createAnnouncement(
  payload: CreateAnnouncementPayload
): Promise<Announcement> {
  return apiFetch<Announcement>(`/portal/announcements/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

export async function createInstructorAnnouncement(
  payload: CreateInstructorAnnouncementPayload
): Promise<Announcement> {
  return apiFetch<Announcement>(`/portal/announcements/instructor/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

export async function updateAnnouncement(
  id: number,
  payload: UpdateAnnouncementPayload
): Promise<Announcement> {
  return apiFetch<Announcement>(`/portal/announcements/${id}/`, {
    method: "PATCH",
    body: payload,
    requireCsrf: true,
  });
}

export async function deleteAnnouncement(id: number): Promise<void> {
  return apiFetch<void>(`/portal/announcements/${id}/`, {
    method: "DELETE",
    requireCsrf: true,
  });
}

// --- Announcement Reactions API ---
export type ReactionCount = {
  reaction: string;
  count: number;
};

export type AnnouncementReactionsResponse = {
  announcement: number;
  counts: ReactionCount[];
  total: number;
  my_reactions: string[];
};

export type AddReactionPayload = {
  reaction?: string;
  reactions?: string[];
};

export type RemoveReactionPayload = {
  reaction?: string;
  reactions?: string[];
};

export type AddReactionResponse = {
  announcement: number;
  created: number;
  counts: ReactionCount[];
  total: number;
  my_reactions: string[];
};

export type RemoveReactionResponse = {
  announcement: number;
  deleted: number;
  counts: ReactionCount[];
  total: number;
  my_reactions: string[];
};

export async function getAnnouncementReactions(
  announcementId: number
): Promise<AnnouncementReactionsResponse> {
  return apiFetch<AnnouncementReactionsResponse>(
    `/portal/announcements/${announcementId}/reactions/`
  );
}

export async function addAnnouncementReaction(
  announcementId: number,
  payload: AddReactionPayload
): Promise<AddReactionResponse> {
  return apiFetch<AddReactionResponse>(
    `/portal/announcements/${announcementId}/reactions/`,
    {
      method: "POST",
      body: payload,
      requireCsrf: true,
    }
  );
}

export async function removeAnnouncementReaction(
  announcementId: number,
  payload: RemoveReactionPayload
): Promise<RemoveReactionResponse> {
  return apiFetch<RemoveReactionResponse>(
    `/portal/announcements/${announcementId}/reactions/`,
    {
      method: "DELETE",
      body: payload,
      requireCsrf: true,
    }
  );
}

// --- Polls API ---
export type PollChoice = {
  id: number;
  text: string;
  votes: number;
};

export type Poll = {
  id: number;
  question: string;
  target_group: number | null;
  publish_at: string;
  expire_at: string | null;
  is_disabled: boolean;
  choices: PollChoice[];
  my_vote_choice_id: number | null;
};

export type PollsResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: Poll[];
};

export async function getPolls(params?: {
  group?: string;
  include_inactive?: boolean;
}): Promise<Poll[]> {
  const searchParams = new URLSearchParams();
  if (params?.group) searchParams.append("group", params.group);
  if (params?.include_inactive) searchParams.append("include_inactive", "1");

  const query = searchParams.toString();
  const response = await apiFetch<PollsResponse>(
    `/portal/polls/${query ? `?${query}` : ""}`
  );
  return response.results;
}

export async function getPollById(id: number): Promise<Poll> {
  return apiFetch<Poll>(`/portal/polls/${id}/`);
}

export type VotePayload = {
  choice: number;
};

export async function voteOnPoll(
  pollId: number,
  payload: VotePayload
): Promise<Poll> {
  return apiFetch<Poll>(`/portal/polls/${pollId}/vote/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

// --- Portal Tests (Pre/Post) ---
// New schema: single test per module, with separate PRE/POST schedules

export type ModuleTestSummary = {
  id: number;
  title: string;
  is_active_pre: boolean;
  is_active_post: boolean;
  has_submitted_pre: boolean;
  has_submitted_post: boolean;
  total_points: number;
};

export type ModuleTestListItem = {
  id: number;
  module: number;
  title: string;
  description: string;
  publish_at_pre: string | null;
  expire_at_pre: string | null;
  publish_at_post: string | null;
  expire_at_post: string | null;
  is_disabled: boolean;
  is_active_pre: boolean;
  is_active_post: boolean;
  total_points: number;
};

export type ModuleTestChoicePublic = { id: number; text: string };

export type ModuleTestQuestion = {
  id: number;
  title: string;
  text: string | null;
  image: string | null;
  order: number;
  choices: ModuleTestChoicePublic[];
};

export type ModuleTestDetail = {
  id: number;
  module: number;
  title: string;
  description: string;
  publish_at_pre: string | null;
  expire_at_pre: string | null;
  publish_at_post: string | null;
  expire_at_post: string | null;
  is_disabled: boolean;
  is_active_pre: boolean;
  is_active_post: boolean;
  total_points: number;
  has_submitted_pre?: boolean;
  has_submitted_post?: boolean;
  questions: ModuleTestQuestion[];
};

export type GetModuleTestsParams = {
  module?: number | string;
};

export async function getModuleTests(
  params?: GetModuleTestsParams
): Promise<ModuleTestListItem[]> {
  const search = new URLSearchParams();
  if (params?.module) search.append("module", String(params.module));
  const query = search.toString();
  return apiFetch<ModuleTestListItem[]>(
    `/portal/tests/${query ? `?${query}` : ""}`
  );
}

export async function getModuleTestById(
  id: number | string
): Promise<ModuleTestDetail> {
  return apiFetch<ModuleTestDetail>(`/portal/tests/${id}/`);
}

export async function deleteModuleTest(id: number | string): Promise<void> {
  return apiFetch<void>(`/portal/tests/${id}/`, {
    method: "DELETE",
    requireCsrf: true,
  });
}

export type CreateModuleTestPayload = {
  module: number;
  title: string;
  description?: string;
  publish_at_pre?: string | null;
  expire_at_pre?: string | null;
  publish_at_post?: string | null;
  expire_at_post?: string | null;
  is_disabled?: boolean;
  questions?: Array<{
    title: string;
    text?: string | null;
    order: number;
    choices: Array<{ text: string; is_correct: boolean }>; // 2+, exactly one true
    // Optional image file for this question; when present we send multipart/form-data
    image_file?: File | null;
  }>;
};

export async function createModuleTest(payload: CreateModuleTestPayload) {
  const hasFiles = payload.questions?.some((q) => q.image_file) ?? false;
  if (!hasFiles) {
    return apiFetch(`/portal/tests/`, {
      method: "POST",
      body: payload,
      requireCsrf: true,
    });
  }

  const form = new FormData();
  form.append("module", String(payload.module));
  form.append("title", payload.title);
  if (payload.description != null)
    form.append("description", payload.description);
  if (payload.publish_at_pre !== undefined && payload.publish_at_pre !== null)
    form.append("publish_at_pre", payload.publish_at_pre);
  if (payload.expire_at_pre !== undefined && payload.expire_at_pre !== null)
    form.append("expire_at_pre", payload.expire_at_pre);
  if (payload.publish_at_post !== undefined && payload.publish_at_post !== null)
    form.append("publish_at_post", payload.publish_at_post);
  if (payload.expire_at_post !== undefined && payload.expire_at_post !== null)
    form.append("expire_at_post", payload.expire_at_post);
  if (payload.is_disabled !== undefined)
    form.append("is_disabled", String(payload.is_disabled));

  (payload.questions ?? []).forEach((q, qi) => {
    form.append(`questions[${qi}][title]`, q.title);
    if (q.text !== undefined && q.text !== null)
      form.append(`questions[${qi}][text]`, String(q.text));
    form.append(`questions[${qi}][order]`, String(q.order));
    q.choices.forEach((c, ci) => {
      form.append(`questions[${qi}][choices][${ci}][text]`, c.text);
      form.append(
        `questions[${qi}][choices][${ci}][is_correct]`,
        String(Boolean(c.is_correct))
      );
    });
    if (q.image_file) {
      form.append(`questions[${qi}][image]`, q.image_file);
    }
  });

  return apiFetchFormData(`/portal/tests/`, form, { method: "POST" });
}

// Submit a test attempt (trainee)
export type SubmitModuleTestPayload = {
  kind: "PRE" | "POST";
  choice_ids: number[];
};

export async function submitModuleTest(
  id: number | string,
  payload: SubmitModuleTestPayload
) {
  return apiFetch(`/portal/tests/${id}/submit/`, {
    method: "POST",
    body: payload,
    requireCsrf: true,
  });
}

// --- Module Test Results (Pre/Post) ---
export type ModuleTestResult = {
  user_id: number;
  user_name: string;
  user_email?: string | null;
  pre_score?: number | null;
  pre_max?: number | null;
  post_score?: number | null;
  post_max?: number | null;
  // Optional fields if backend provides pre/post percentages or deltas
  pre_percentage?: number | null;
  post_percentage?: number | null;
  improvement_points?: number | null;
  improvement_percentage?: number | null;
};

export type ModuleTestSubmission = {
  id: number;
  submitted_at: string;
  score_total: number;
  score_max: number;
  trainee: { id: number; name: string; email: string };
};

export type ModuleTestResultsQuestion = {
  id: number;
  order: number;
  title: string;
  answers_count: number;
  correct_count: number;
  incorrect_count: number;
  choices: Array<{
    id: number;
    text: string;
    is_correct: boolean;
    count: number;
  }>;
};

export type ModuleTestResultsKindBucket = {
  submissions: ModuleTestSubmission[];
  totals: {
    submissions_count: number;
    sum_scores: number;
    sum_max: number;
  };
  questions: ModuleTestResultsQuestion[];
};

export type ModuleTestResultsResponse = {
  test: {
    id: number;
    title: string;
    module: { id: number; title?: string; order?: number } | number;
  };
  kinds: {
    PRE?: ModuleTestResultsKindBucket;
    POST?: ModuleTestResultsKindBucket;
  };
};

export async function getModuleTestResults(
  testId: number | string
): Promise<ModuleTestResultsResponse> {
  return apiFetch<ModuleTestResultsResponse>(
    `/portal/tests/${testId}/results/`
  );
}

// --- Assignments ---
export type AssignmentSubmission = {
  id: number;
  trainee: number;
  trainee_name: string;
  trainee_email: string;
  assignment_id: number;
  assignment_title: string;
  week_id: number;
  week_order: number;
  week_title: string;
  track_name: string;
  is_gradable: boolean;
  submitted_link: string | null;
  note: string | null;
  submitted_at: string;
  grade?: number | null;
  feedback?: string | null;
};

export type Assignment = {
  id: number;
  title: string;
  description: string | null;
  due_date: string;
  file: string | null;
  link: string | null;
  type: "NOT_GRADED" | "INDIVIDUAL" | "GROUP";
  is_gradable: boolean;
  my_submissions?: AssignmentSubmission[];
};

export type AssignmentDetail = Assignment & {
  submissions: AssignmentSubmission[];
};

export type AssignmentsListResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: Assignment[];
};

export async function getAssignments(): Promise<AssignmentsListResponse> {
  return apiFetch<AssignmentsListResponse>(`/portal/assignments/`);
}

export async function getAssignmentById(
  id: number | string
): Promise<AssignmentDetail> {
  return apiFetch<AssignmentDetail>(`/portal/assignments/${id}/`);
}

export type SubmissionsListResponse = {
  count: number;
  from: number;
  to: number;
  next: string | null;
  previous: string | null;
  results: AssignmentSubmission[];
};

export async function getSubmissions(): Promise<SubmissionsListResponse> {
  return apiFetch<SubmissionsListResponse>(`/portal/submissions/`);
}

// --- Trainee Orders (Per Module Ranking) ---
export type TraineeOrderItem = {
  user: number;
  user_en?: string | null;
  user_name: string;
  user_email: string;
  order: number | null;
  note: string;
  evaluated_by: number | null;
  evaluated_by_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TraineeOrdersResponse = {
  has_submitted: boolean;
  created_at: string | null;
  updated_at: string | null;
  items: TraineeOrderItem[];
};

export type SubmitTraineeOrderItem = {
  user: number;
  order: number;
  note?: string | null;
};

export async function getModuleTraineeOrders(
  moduleId: number | string
): Promise<TraineeOrdersResponse> {
  return apiFetch<TraineeOrdersResponse>(
    `/portal/modules/${moduleId}/trainee-orders/`
  );
}

export async function submitModuleTraineeOrders(
  moduleId: number | string,
  items: SubmitTraineeOrderItem[]
): Promise<TraineeOrdersResponse> {
  return apiFetch<TraineeOrdersResponse>(
    `/portal/modules/${moduleId}/trainee-orders/`,
    {
      method: "POST",
      body: { items },
      requireCsrf: true,
    }
  );
}
