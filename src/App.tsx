import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { FormsPage } from "./pages/FormsPage";
import { LoginPage } from "./pages/LoginPage";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rems-ui-theme">
      <Routes>
        {/* Login route - outside AppLayout */}
        <Route path="/login" element={<LoginPage />} />

        {/* Main app routes - inside AppLayout */}
        <Route
          path="/*"
          element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/candidates" element={<UsersPage />} />
                <Route path="/candidates/:id" element={<UserDetailPage />} />
                <Route path="/forms" element={<FormsPage />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
