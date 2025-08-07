import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconFileDescription,
  IconFolder,
  IconInnerShadowTop,
  IconUsers,
} from "@tabler/icons-react";

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

// Sample users to demonstrate consistent avatar assignment
const users = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
  },
  {
    name: "Alex Chen",
    email: "alex.chen@example.com",
  },
  {
    name: "Maria Rodriguez",
    email: "maria@example.com",
  },
  {
    name: "John Smith",
    email: "john.smith@example.com",
  },
];

// Get a random user from the sample users
// In a real app, this would be your authenticated user
const randomUser = users[Math.floor(Math.random() * users.length)] || users[0];

const data = {
  user: {
    name: randomUser.name,
    email: randomUser.email,
    // No avatar provided - our ConsistentAvatar component will assign one
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Users",
      url: "/users",
      icon: IconUsers,
    },
    {
      title: "Forms",
      url: "/forms",
      icon: IconFileDescription,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
