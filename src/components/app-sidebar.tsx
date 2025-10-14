import * as React from "react";
import { IconInnerShadowTop, IconUsers, IconClock, IconCalendar } from "@tabler/icons-react";

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
  const baseItems = [
    {
      title: "Candidates",
      url: "/candidates",
      icon: IconUsers,
    },
  ];

  if (isAttendanceTracker) {
    baseItems.push(
      {
        title: "My Attendance",
        url: "/attendance",
        icon: IconClock,
      },
      {
        title: "Attendance Overview",
        url: "/attendance/overview",
        icon: IconCalendar,
      }
    );
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
