import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import backgroundSvg from "@/assets/background.svg";
// removed light-mode SVG background; using CSS gradient on body instead

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme();
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundImage: isDark ? `url(${backgroundSvg})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Page backdrop */}
        <div
          className={
            isDark
              ? "absolute inset-0 bg-background/85 backdrop-blur-sm pointer-events-none rounded-xl"
              : "absolute inset-0 bg-white pointer-events-none rounded-xl"
          }
        />
        <div className="relative z-10">
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
