import * as React from "react";
import { IconUsers, IconClock } from "@tabler/icons-react";
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

const getNavItems = (isAttendanceTracker: boolean, t: any) => {
  const baseItems = [];

  // Only show Candidates for non-attendance trackers
  if (!isAttendanceTracker) {
    baseItems.push({
      title: t('navigation.candidates'),
      url: "/candidates",
      icon: IconUsers,
    });
  }

  // Show Attendance for attendance trackers
  if (isAttendanceTracker) {
    baseItems.push({
      title: t('navigation.attendance'),
      url: "/attendance",
      icon: IconClock,
    });
  }

  return baseItems;
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { isAttendanceTracker } = useUserGroups();
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  const navItems = getNavItems(isAttendanceTracker, t);
  
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
