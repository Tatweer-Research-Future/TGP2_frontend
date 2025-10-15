import * as React from "react";
import {
  IconUsers,
  IconClock,
  IconPresentation,
  IconChartBar,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import logoImage from "@/assets/logo.png";
import logoWhiteImage from "@/assets/logo-white.png";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useTheme } from "@/components/theme-provider";

// Map route paths to icons and translated titles
const getNavItemDetails = (url: string, t: any) => {
  const iconMap: Record<string, any> = {
    "/candidates": IconUsers,
    "/forms": IconPresentation,
    "/attendance": IconClock,
    "/overview": IconChartBar,
  };

  const titleMap: Record<string, string> = {
    "/candidates": t("navigation.candidates"),
    "/forms": t("navigation.forms"),
    "/attendance": t("navigation.attendance"),
    "/overview": t("navigation.overview"),
  };

  return {
    icon: iconMap[url],
    title: titleMap[url] || url,
  };
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { getNavigationItems } = useUserGroups();
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Get navigation items based on user permissions
  const permissionBasedItems = getNavigationItems();

  // Transform permission-based items to include icons and proper titles
  const navItems = permissionBasedItems.map((item) => {
    const details = getNavItemDetails(item.url, t);
    return {
      title: details.title,
      url: item.url,
      icon: details.icon,
    };
  });

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <img
                  src={theme === "dark" ? logoWhiteImage : logoImage}
                  alt="TGP Logo"
                  className="h-24 w-auto"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={{ name: user.name, email: user.email }} />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
