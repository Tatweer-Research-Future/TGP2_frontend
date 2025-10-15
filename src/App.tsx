import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { FormsPage } from "./pages/FormsPage";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AttendanceOverviewPage } from "./pages/AttendanceOverviewPage";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { CandidatesProvider } from "@/context/CandidatesContext";

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
                      <Route path="/" element={<AttendancePage />} />
                      <Route path="/overview" element={<DashboardPage />} />
                      <Route path="/candidates" element={<UsersPage />} />
                      <Route
                        path="/candidates/:id"
                        element={<UserDetailPage />}
                      />
                      <Route path="/forms" element={<FormsPage />} />
                      <Route path="/attendance" element={<AttendancePage />} />
                      <Route path="/attendance/overview" element={<AttendanceOverviewPage />} />
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
