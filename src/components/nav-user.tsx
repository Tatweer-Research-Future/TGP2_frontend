import {
  IconDeviceDesktop,
  IconDotsVertical,
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
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <ConsistentAvatar
                user={user}
                className="h-8 w-8 rounded-lg"
                fallbackClassName="rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <ConsistentAvatar
                  user={user}
                  className="h-8 w-8 rounded-lg"
                  fallbackClassName="rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/account")}>
                <IconUserCircle />
                {t('navigation.account')}
              </DropdownMenuItem>
              {/** Billing and Notifications removed */}

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconPalette />
                  <span>{t(`theme.${theme}`)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className={theme === "light" ? "bg-accent text-accent-foreground" : ""}
                  >
                    <IconSun />
                    {t('theme.light')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className={theme === "dark" ? "bg-accent text-accent-foreground" : ""}
                  >
                    <IconMoon />
                    {t('theme.dark')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconLanguage />
                  <span>{t(`language.${i18n.language === 'ar' ? 'arabic' : 'english'}`)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem 
                    onClick={() => i18n.changeLanguage('en')}
                    className={i18n.language === 'en' ? "bg-accent text-accent-foreground" : ""}
                  >
                    {t('language.english')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => i18n.changeLanguage('ar')}
                    className={i18n.language === 'ar' ? "bg-accent text-accent-foreground" : ""}
                  >
                    {t('language.arabic')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
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
            >
              <IconLogout />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
