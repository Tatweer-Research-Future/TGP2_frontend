import * as React from "react";
import { IconDashboard, IconFileDescription, IconInnerShadowTop, IconUsers } from "@tabler/icons-react";

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

const data = {
  // Nav items only; user comes from auth
  navMain: [
    {
      title: "Dashboard",
      url: "/overview",
      icon: IconDashboard,
    },
    {
      title: "Candidates",
      url: "/candidates",
      icon: IconUsers,
    },
    {
      title: "Forms",
      url: "/forms",
      icon: IconFileDescription,
    },
    // Summary merged into Dashboard
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={{ name: user.name, email: user.email }} />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
