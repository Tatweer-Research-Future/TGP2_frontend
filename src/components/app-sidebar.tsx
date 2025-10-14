import * as React from "react";
import { IconInnerShadowTop, IconUsers, IconClock } from "@tabler/icons-react";

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

const getNavItems = (isAttendanceTracker: boolean) => {
  const baseItems = [];

  // Only show Candidates for non-attendance trackers
  if (!isAttendanceTracker) {
    baseItems.push({
      title: "Candidates",
      url: "/candidates",
      icon: IconUsers,
    });
  }

  // Show Attendance for attendance trackers
  if (isAttendanceTracker) {
    baseItems.push({
      title: "Attendance",
      url: "/attendance",
      icon: IconClock,
    });
  }

  return baseItems;
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { isAttendanceTracker } = useUserGroups();
  
  const navItems = getNavItems(isAttendanceTracker);
  
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
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">TGP</span>
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
