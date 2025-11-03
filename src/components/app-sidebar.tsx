import * as React from "react";
import {
  IconUsers,
  IconClock,
  IconPresentation,
  IconChartBar,
  IconBook,
  IconHome,
  IconFileText,
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
    "/trainee-monitoring": IconUsers,
    "/forms": IconPresentation,
    "/forms-results": IconPresentation,
    "/attendance": IconClock,
    "/overview": IconChartBar,
    "/modules": IconBook,
    "/assignments": IconFileText,
  };

  const titleMap: Record<string, string> = {
    "/home": t("navigation.home"),
    "/candidates": t("navigation.candidates"),
    "/trainee-monitoring": t("navigation.trainee_monitoring"),
    "/forms": t("navigation.forms"),
    "/forms-results": t("navigation.forms_summary"),
    "/attendance": t("navigation.attendance"),
    "/overview": t("navigation.overview"),
    "/modules": t("navigation.my_track"),
    "/assignments": t("navigation.assignments"),
  };

  return {
    icon: iconMap[url],
    title: titleMap[url] || url,
  };
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { getNavigationItems } = useUserGroups();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRTL = (i18n.language || "en").startsWith("ar");

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

  // Organize items into logical groups with labels
  const organizeNavItems = (items: typeof navItems) => {
    const groups: Array<{ label?: string; items: typeof navItems }> = [];

    // Main/Home section
    const mainItems = items.filter(
      (item) => item.url === "/home" || item.url === "/overview"
    );
    if (mainItems.length > 0) {
      groups.push({ items: mainItems });
    }

    // Candidates section
    const candidatesItems = items.filter(
      (item) =>
        item.url === "/candidates" || item.url === "/trainee-monitoring"
    );
    if (candidatesItems.length > 0) {
      groups.push({
        label: t("navigation.groups.candidates", "Candidates"),
        items: candidatesItems,
      });
    }

    // Forms section
    const formsItems = items.filter(
      (item) => item.url === "/forms" || item.url === "/forms-results"
    );
    if (formsItems.length > 0) {
      groups.push({
        label: t("navigation.groups.forms", "Forms"),
        items: formsItems,
      });
    }

    // Learning/Track section
    const learningItems = items.filter((item) => item.url === "/modules" || item.url === "/assignments");
    if (learningItems.length > 0) {
      groups.push({
        label: t("navigation.groups.learning", "Learning"),
        items: learningItems,
      });
    }

    // Analytics/Tracking section
    const analyticsItems = items.filter((item) => item.url === "/attendance");
    if (analyticsItems.length > 0) {
      groups.push({
        label: t("navigation.groups.analytics", "Analytics"),
        items: analyticsItems,
      });
    }

    // Any remaining items go to main (shouldn't happen, but fallback)
    const remainingItems = items.filter(
      (item) =>
        !mainItems.includes(item) &&
        !candidatesItems.includes(item) &&
        !formsItems.includes(item) &&
        !learningItems.includes(item) &&
        !analyticsItems.includes(item)
    );
    if (remainingItems.length > 0) {
      groups.push({ items: remainingItems });
    }

    return groups;
  };

  const organizedGroups = organizeNavItems(navItems);

  return (
    <Sidebar collapsible="offcanvas" {...props} side={isRTL ? "right" : "left"}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 animate-in fade-in slide-in-from-top-2 duration-500 pointer-events-none"
            >
              <div className="block transition-transform duration-300 hover:scale-105 active:scale-95">
                <img
                  src={theme === "dark" ? logoWhiteImage : logoImage}
                  alt="TGP Logo"
                  className="h-24 w-auto drop-shadow-sm"
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0.5">
        <NavMain groups={organizedGroups} />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={{ name: user.name, email: user.email }} />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
