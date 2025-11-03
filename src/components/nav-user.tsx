import {
  IconChevronUp,
  IconLogout,
  IconMoon,
  IconPalette,
  IconSun,
  IconUserCircle,
  IconLanguage,
} from "@tabler/icons-react";

import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { GlowingCard } from "@/components/ui/glowing-card";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Get glow color based on theme
  const glowColor = theme === "dark" ? "#8b5cf6" : "#6366f1";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <GlowingCard
            glowColor={glowColor}
            hoverEffect={true}
            className="w-full rounded-md overflow-hidden"
          >
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                style={{
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                className={cn(
                  "relative w-full",
                  "data-[state=open]:shadow-2xl data-[state=open]:shadow-primary/30",
                  // Pure glass effect - almost completely transparent
                  "!bg-transparent",
                  // Override all hover states to prevent grey background
                  "hover:!bg-transparent",
                  "active:!bg-transparent",
                  "data-[state=open]:hover:!bg-transparent",
                  "hover:!text-sidebar-foreground",
                  "data-[state=open]:hover:!text-sidebar-foreground",
                  "backdrop-blur-2xl backdrop-saturate-200",
                  "border border-white/20 dark:border-white/20",
                  "shadow-lg shadow-black/5 dark:shadow-black/20",
                  "animate-in fade-in slide-in-from-bottom-4 duration-500",
                  "rounded-md"
                )}
              >
                <div className="relative z-10 flex items-center gap-2.5 w-full">
                  <div className="relative">
                    <ConsistentAvatar
                      user={user}
                      className="h-8 w-8 rounded-lg ring-2 ring-sidebar-border/30 shadow-lg shadow-primary/10"
                      fallbackClassName="rounded-lg"
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-sidebar ring-2 ring-sidebar animate-pulse shadow-lg shadow-green-500/50" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {user.name}
                    </span>
                    <span className="text-sidebar-foreground/70 truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                  <IconChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50 transition-all duration-300 data-[state=open]:rotate-180" />
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </GlowingCard>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-white/20 shadow-2xl shadow-black/20 dark:shadow-black/40 bg-transparent backdrop-blur-2xl backdrop-saturate-200"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-3 py-3 bg-transparent rounded-lg border border-white/10 backdrop-blur-sm">
                <div className="relative">
                  <ConsistentAvatar
                    user={user}
                    className="h-10 w-10 rounded-lg ring-2 ring-primary/20 shadow-lg"
                    fallbackClassName="rounded-lg"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-sidebar ring-2 ring-sidebar" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    {user.name}
                  </span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2 bg-sidebar-border/50" />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => navigate("/account")}
                className="cursor-pointer transition-all duration-200 hover:bg-sidebar-accent/50 rounded-lg"
              >
                <IconUserCircle className="size-3.5" />
                <span>{t('navigation.account')}</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1 bg-sidebar-border/30" />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg transition-all duration-200 hover:bg-white/10 data-[state=open]:bg-white/10 cursor-pointer">
                  <IconPalette className="size-3.5" />
                  <span>{t(`theme.${theme}`)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-lg border-white/20 shadow-2xl shadow-black/20 dark:shadow-black/40 bg-transparent backdrop-blur-2xl backdrop-saturate-200">
                  <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className={cn(
                      "cursor-pointer rounded-lg transition-all duration-200",
                      theme === "light" ? "bg-white/20 text-sidebar-foreground font-medium backdrop-blur-sm" : "hover:bg-white/10"
                    )}
                  >
                    <IconSun className="size-3.5" />
                    <span>{t('theme.light')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "cursor-pointer rounded-lg transition-all duration-200",
                      theme === "dark" ? "bg-white/20 text-sidebar-foreground font-medium backdrop-blur-sm" : "hover:bg-white/10"
                    )}
                  >
                    <IconMoon className="size-3.5" />
                    <span>{t('theme.dark')}</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg transition-all duration-200 hover:bg-white/10 data-[state=open]:bg-white/10 cursor-pointer">
                  <IconLanguage className="size-3.5" />
                  <span>{t(`language.${i18n.language === 'ar' ? 'arabic' : 'english'}`)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-lg border-white/20 shadow-2xl shadow-black/20 dark:shadow-black/40 bg-transparent backdrop-blur-2xl backdrop-saturate-200">
                  <DropdownMenuItem 
                    onClick={() => i18n.changeLanguage('en')}
                    className={cn(
                      "cursor-pointer rounded-lg transition-all duration-200",
                      i18n.language === 'en' ? "bg-white/20 text-sidebar-foreground font-medium backdrop-blur-sm" : "hover:bg-white/10"
                    )}
                  >
                    <span>{t('language.english')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => i18n.changeLanguage('ar')}
                    className={cn(
                      "cursor-pointer rounded-lg transition-all duration-200",
                      i18n.language === 'ar' ? "bg-white/20 text-sidebar-foreground font-medium backdrop-blur-sm" : "hover:bg-white/10"
                    )}
                  >
                    <span>{t('language.arabic')}</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-2 bg-sidebar-border/50" />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await logout();
                  toast.success(t('auth.logoutSuccess'));
                } catch (e) {
                  // Even if backend fails, clear local state and continue
                } finally {
                  navigate("/login", { replace: true });
                }
              }}
              className="cursor-pointer rounded-lg transition-all duration-200 hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <IconLogout className="size-3.5" />
              <span>{t('auth.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
