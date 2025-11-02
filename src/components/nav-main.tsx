import { type Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon?: Icon;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

export function NavMain({
  items,
  groups,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
}) {
  const location = useLocation();
  const { t } = useTranslation();

  // If groups are provided, use them; otherwise fall back to flat items list
  const organizedGroups: NavGroup[] = groups || (items ? [{ items }] : []);

  return (
    <>
      {organizedGroups.map((group, groupIndex) => (
        <SidebarGroup key={group.label || `group-${groupIndex}`} className={group.label ? "px-2 pt-1 pb-0.5" : "px-2 py-1"}>
          {group.label && (
            <SidebarGroupLabel className="px-2 py-0.5 h-auto mb-0 text-xs font-semibold text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex flex-col">
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(item.url + "/") ||
                  (location.pathname === "/" && item.url === "/overview");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      className={
                        isActive
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                          : ""
                      }
                    >
                      <Link to={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
