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
  type LoginRequest,
  type LoginResponse,
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
  avatar?: string | null;
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

// Helper: map /me response to AuthUser used in the app
function mapProfileToAuthUser(
  profile: CurrentUserResponse,
  fallback?: Partial<AuthUser> | null
): AuthUser {
  return {
    id: profile.user_id,
    email: profile.user_email,
    name:
      profile.user_name ||
      fallback?.name ||
      fallback?.email ||
      profile.user_email,
    is_staff: (profile as any).is_staff === true,
    groups: Array.isArray(profile.groups) ? profile.groups : [],
    group_id:
      profile.group_id ||
      inferGroupIdFromGroups(profile.groups) ||
      undefined,
    avatar: profile.avatar ?? fallback?.avatar ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);

      // 1) Hydrate from localStorage for fast initial render
      let storedUser: AuthUser | null = null;
      try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        if (raw) {
          storedUser = JSON.parse(raw) as AuthUser;
          if (isMounted) {
            setUser(storedUser);
          }
        }
      } catch {
        // ignore JSON/localStorage errors
      }

      // 2) Always try to refresh from backend /me so permission changes are picked up
      try {
        const profile = await getCurrentUser();
        if (!isMounted) return;

        const nextUser = mapProfileToAuthUser(profile, storedUser);
        setUser(nextUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } catch (error: any) {
        // If we are unauthorized, clear any stale user
        if (error?.status === 401 || error?.status === 403) {
          localStorage.removeItem(USER_STORAGE_KEY);
          if (isMounted) {
            setUser(null);
          }
        }
        // For other errors (network, 5xx), keep whatever we had from storage
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initAuth();

    return () => {
      isMounted = false;
    };
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
        ? mapProfileToAuthUser(profile, resp.user)
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
