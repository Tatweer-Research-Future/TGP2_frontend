import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserGroups } from "@/hooks/useUserGroups";

export function StaffOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { getHomePage } = useUserGroups();

  const isAllowed = Boolean((user as any)?.is_staff);

  if (!isAllowed) {
    const home = getHomePage();
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}


