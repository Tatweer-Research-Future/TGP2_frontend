import * as React from "react";
import {
  IconUsers,
  IconClock,
  IconPresentation,
  IconChartBar,
  IconBook,
  IconHome,
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
    "/home": IconHome,
    "/candidates": IconUsers,
    "/forms": IconPresentation,
    "/forms-results": IconPresentation,
    "/attendance": IconClock,
    "/overview": IconChartBar,
    "/modules": IconBook,
  };

  const titleMap: Record<string, string> = {
    "/home": t("navigation.home"),
    "/candidates": t("navigation.candidates"),
    "/forms": t("navigation.forms"),
    "/forms-results": t("navigation.forms_summary"),
    "/attendance": t("navigation.attendance"),
    "/overview": t("navigation.overview"),
    "/modules": t("navigation.my_track"),
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

  // Debug logging
  console.log("Permission based items:", permissionBasedItems);

  // Always include /home for everyone
  const homeItem = { url: "/home" };
  const allItems = [
    homeItem,
    ...permissionBasedItems.filter((item) => item.url !== "/home"),
  ];

  // If user is staff, ensure Forms Summary appears in nav
  if ((user as any)?.is_staff) {
    const exists = allItems.some((it) => it.url === "/forms-results");
    if (!exists) {
      allItems.push({ url: "/forms-results" } as any);
    }
  }

  // Transform permission-based items to include icons and proper titles
  const navItems = allItems.map((item) => {
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
