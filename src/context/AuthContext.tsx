import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  login as loginService,
  logout as logoutService,
  getMe,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
} from "@/services/auth";
import { getCurrentUser, type CurrentUserResponse } from "@/lib/api";
import { inferGroupIdFromGroups } from "@/lib/permissions";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_staff?: boolean;
  groups?: string[]; // e.g., ["instructor -> Data"], ["Trainee"]
  group_id?: number; // Numeric group ID for permission system
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        setUser(parsed);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const resp = await loginService(credentials);
      // Fetch user details including groups from /me endpoint
      // After successful login, fetch current user profile (with groups)
      let profile: CurrentUserResponse | null = null;
      try {
        profile = await getCurrentUser();
      } catch (_) {
        // ignore; fallback to resp.user
      }
      const nextUser: AuthUser = profile
        ? {
            id: profile.user_id,
            email: profile.user_email,
            name: profile.user_name || resp.user?.name || resp.user?.email,
            is_staff: (profile as any).is_staff === true,
            groups: Array.isArray(profile.groups) ? profile.groups : [],
            group_id:
              profile.group_id ||
              inferGroupIdFromGroups(profile.groups) ||
              undefined,
          }
        : resp.user;
      setUser(nextUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      return resp;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutService();
    } finally {
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
