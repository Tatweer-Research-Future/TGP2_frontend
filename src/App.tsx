import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { FormsPage } from "./pages/FormsPage";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { AttendancePage } from "./pages/AttendancePage";
import { TrackPage } from "./pages/TrackPage";
import SessionEditPage from "./pages/SessionEditPage";
import SessionViewPage from "./pages/SessionViewPage";
import { HomePage } from "./pages/HomePage";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { CandidatesProvider } from "@/context/CandidatesContext";
import {
  PermissionProtectedRoute,
  HomeRedirect,
} from "@/components/PermissionProtectedRoute";
import { StaffOrInstructorRoute } from "@/components/StaffOrInstructorRoute";
import { StaffOnlyRoute } from "@/components/StaffOnlyRoute";
// Removed PrePostExamsPage
import PrePostExamCreatePage from "@/pages/PrePostExamCreatePage";
import FormsResultsPage from "@/pages/FormsResultsPage";
import ModuleExamEditPage from "@/pages/ModuleExamEditPage";
import ModuleExamResultsPage from "@/pages/ModuleExamResultsPage";
import ModuleExamTakePage from "@/pages/ModuleExamTakePage";
import ModulePrePostExamViewPage from "@/pages/ModulePrePostExamViewPage";

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

                      {/* Home page - accessible to all authenticated users */}
                      <Route path="/home" element={<HomePage />} />

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
                        path="/forms-results"
                        element={
                          <StaffOnlyRoute>
                            <FormsResultsPage />
                          </StaffOnlyRoute>
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

                      <Route
                        path="/modules"
                        element={
                          <PermissionProtectedRoute requiredPage="/modules">
                            <TrackPage />
                          </PermissionProtectedRoute>
                        }
                      />

                      <Route
                        path="/modules/session/:id"
                        element={
                          <PermissionProtectedRoute requiredPage="/modules/session/:id">
                            <SessionViewPage />
                          </PermissionProtectedRoute>
                        }
                      />

                      <Route
                        path="/modules/session/:id/edit"
                        element={
                          <PermissionProtectedRoute requiredPage="/modules/session/:id/edit">
                            <SessionEditPage />
                          </PermissionProtectedRoute>
                        }
                      />

                      {/* Pre/Post Exam creation for a specific module */}
                      <Route
                        path="/modules/:moduleId/pre-post-exams/new"
                        element={
                          <StaffOrInstructorRoute>
                            <PrePostExamCreatePage />
                          </StaffOrInstructorRoute>
                        }
                      />
                      {/* Pre/Post Exam read-only view for a specific module */}
                      <Route
                        path="/modules/:moduleId/pre-post-exams/view"
                        element={
                          <StaffOrInstructorRoute>
                            <ModulePrePostExamViewPage />
                          </StaffOrInstructorRoute>
                        }
                      />
                      <Route
                        path="/modules/:id/exam/edit"
                        element={
                          <StaffOrInstructorRoute>
                            <ModuleExamEditPage />
                          </StaffOrInstructorRoute>
                        }
                      />
                      <Route
                        path="/modules/:id/exam/results"
                        element={
                          <StaffOrInstructorRoute>
                            <ModuleExamResultsPage />
                          </StaffOrInstructorRoute>
                        }
                      />
                      <Route
                        path="/modules/:id/exam/take"
                        element={
                          <PermissionProtectedRoute requiredPage="/modules/:id/exam/take">
                            <ModuleExamTakePage />
                          </PermissionProtectedRoute>
                        }
                      />
                      {/* Legacy global create route removed in favor of module-scoped */}

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
