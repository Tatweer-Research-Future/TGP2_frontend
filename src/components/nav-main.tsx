import { type Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconSparkles, IconBell } from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useNewAnnouncements } from "@/hooks/useNewAnnouncements";

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
  const hasNewAnnouncements = useNewAnnouncements();

  // If groups are provided, use them; otherwise fall back to flat items list
  const organizedGroups: NavGroup[] = groups || (items ? [{ items }] : []);

  return (
    <>
      {organizedGroups.map((group, groupIndex) => (
        <SidebarGroup 
          key={group.label || `group-${groupIndex}`} 
          className={cn(
            group.label ? "px-2 pt-1 pb-0.5" : "px-2 py-1",
            "animate-in fade-in slide-in-from-left-2 duration-300",
            "delay-100"
          )}
          style={{ animationDelay: `${groupIndex * 50}ms` }}
        >
          {group.label && (
            <SidebarGroupLabel className="px-2 py-0.5 h-auto mb-0 text-xs font-semibold text-muted-foreground animate-in fade-in duration-300">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex flex-col gap-1">
            <SidebarMenu>
              {group.items.map((item, itemIndex) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(item.url + "/") ||
                  (location.pathname === "/" && item.url === "/overview");
                
                const isHome = item.url === "/home";

                return (
                  <SidebarMenuItem 
                    key={item.title}
                    className="animate-in fade-in slide-in-from-left-4 duration-300"
                    style={{ animationDelay: `${(groupIndex * 50) + (itemIndex * 30)}ms` }}
                  >
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      className={cn(
                        "relative transition-[background-color,transform,box-shadow] duration-300 ease-out",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        "group/item",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                        isHome && isActive && "ring-2 ring-primary/30 ring-offset-2 ring-offset-sidebar"
                      )}
                    >
                      <Link to={item.url} className="relative flex items-center gap-2 w-full">
                        {item.icon && (
                          <span className={cn(
                            "relative z-10 transition-transform duration-300",
                            isActive && "scale-110",
                            isHome && isActive && "animate-pulse"
                          )}>
                            <item.icon className={cn(
                              "size-3.5",
                              isHome && isActive && "drop-shadow-lg"
                            )} />
                          </span>
                        )}
                        <span className={cn(
                          "relative z-10 font-medium flex-1",
                          isActive ? "text-primary-foreground" : "text-sidebar-foreground"
                        )}>
                          {item.title}
                        </span>
                        {/* Notification bell icon at the end when there are new announcements */}
                        {isHome && hasNewAnnouncements && (
                          <span className="relative z-10 ml-auto mr-1">
                            <IconBell className={cn(
                              "size-3.5",
                              isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                            )} />
                            {/* Smaller circular notification indicator */}
                            <span className="absolute -top-0.5 -right-0.5 z-20 flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex h-full w-full rounded-full bg-red-500 ring-1 ring-background" />
                            </span>
                          </span>
                        )}
                        {isHome && isActive && (
                          <>
                            {!hasNewAnnouncements && (
                              <IconSparkles className="absolute right-2 size-3.5 text-primary-foreground/70 animate-pulse" />
                            )}
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-foreground/50 to-primary-foreground/30 rounded-r-full animate-pulse" />
                          </>
                        )}
                        {isActive && !isHome && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full animate-in slide-in-from-left duration-300" />
                        )}
                        {/* Hover effect overlay */}
                        <span className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-md" />
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
