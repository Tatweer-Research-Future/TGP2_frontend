import { Navigate, useLocation } from "react-router-dom";
import { useUserGroups } from "@/hooks/useUserGroups";

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPage: string;
}

export function PermissionProtectedRoute({
  children,
  requiredPage,
}: PermissionProtectedRouteProps) {
  const { canAccessPage, getHomePage } = useUserGroups();
  const location = useLocation();

  // Check if user can access the current page
  if (!canAccessPage(requiredPage)) {
    // Redirect to user's home page
    const homePage = getHomePage();
    return <Navigate to={homePage} replace />;
  }

  return <>{children}</>;
}

// Component to redirect to home page
export function HomeRedirect() {
  const { getHomePage } = useUserGroups();
  const homePage = getHomePage();

  return <Navigate to={homePage} replace />;
}
