import { apiFetch, setAccessToken } from "@/lib/api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: {
    id: number;
    email: string;
    name: string;
  };
  access: string;
  refresh: string;
};

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/login/", {
    method: "POST",
    body: credentials,
    requireCsrf: true,
  });

  // Persist access token (optional; cookies are also set by backend)
  if (data?.access) setAccessToken(data.access);
  return data;
}

export async function logout(): Promise<{ detail: string }> {
  const data = await apiFetch<{ detail: string }>("/logout/", {
    method: "POST",
    requireCsrf: true,
  });
  setAccessToken(null);
  return data;
}
