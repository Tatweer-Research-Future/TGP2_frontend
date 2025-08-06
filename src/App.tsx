import "./App.css";
import { AppLayout } from "./components/layout/app-layout";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rems-ui-theme">
      <AppLayout>
        <div className="px-4 lg:px-6">
          <div className="flex flex-col items-center justify-center min-h-96">
            <h1 className="text-3xl font-bold mb-4">Welcome to REMS</h1>
            <p className="text-muted-foreground">
              Real Estate Management System
            </p>
          </div>
        </div>
      </AppLayout>
    </ThemeProvider>
  );
}

export default App;
