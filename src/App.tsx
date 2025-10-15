import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { FormsPage } from "./pages/FormsPage";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { CandidatesProvider } from "@/context/CandidatesContext";
import {
  PermissionProtectedRoute,
  HomeRedirect,
} from "@/components/PermissionProtectedRoute";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rems-ui-theme">
      <AuthProvider>
        <CandidatesProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      {/* Redirect root to user's home page */}
                      <Route path="/" element={<HomeRedirect />} />

                      {/* Permission-protected routes */}
                      <Route
                        path="/overview"
                        element={
                          <PermissionProtectedRoute requiredPage="/overview">
                            <DashboardPage />
                          </PermissionProtectedRoute>
                        }
                      />
                      <Route
                        path="/candidates"
                        element={
                          <PermissionProtectedRoute requiredPage="/candidates">
                            <UsersPage />
                          </PermissionProtectedRoute>
                        }
                      />
                      <Route
                        path="/candidates/:id"
                        element={
                          <PermissionProtectedRoute requiredPage="/candidates/:id">
                            <UserDetailPage />
                          </PermissionProtectedRoute>
                        }
                      />
                      <Route
                        path="/forms"
                        element={
                          <PermissionProtectedRoute requiredPage="/forms">
                            <FormsPage />
                          </PermissionProtectedRoute>
                        }
                      />
                      <Route
                        path="/attendance"
                        element={
                          <PermissionProtectedRoute requiredPage="/attendance">
                            <AttendancePage />
                          </PermissionProtectedRoute>
                        }
                      />

                      {/* Account page - accessible to all authenticated users */}
                      <Route path="/account" element={<AccountPage />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster richColors position="top-right" />
        </CandidatesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
