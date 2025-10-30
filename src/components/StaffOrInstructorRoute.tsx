import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserGroups } from "@/hooks/useUserGroups";

export function StaffOrInstructorRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { getHomePage } = useUserGroups();

  const groups = (user?.groups || []).map((g) => g.toLowerCase());
  const isAllowed = groups.some(
    (g) =>
      g.includes("instructor") ||
      g.includes("data") ||
      g.includes("hr") ||
      g.includes("tech") ||
      g.includes("staff")
  );

  if (!isAllowed) {
    const home = getHomePage();
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
