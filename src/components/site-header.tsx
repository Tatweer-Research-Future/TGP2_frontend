import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useLocation } from "react-router-dom";
import { Fragment, useMemo } from "react";
import { useCandidates } from "@/context/CandidatesContext";

export function SiteHeader() {
  const location = useLocation();
  const { getCandidateById } = useCandidates();

  const crumbs = useMemo(() => {
    const path = location.pathname;
    const items: { label: string; to?: string }[] = [];
    if (path === "/" || path === "/dashboard") {
      items.push({ label: "Dashboard" });
    } else if (path === "/candidates") {
      items.push({ label: "Candidates" });
    } else if (path.startsWith("/candidates/")) {
      items.push({ label: "Candidates", to: "/candidates" });
      const id = path.match(/^\/candidates\/([^/]+)/)?.[1];
      if (id) {
        const candidate = getCandidateById(id);
        items.push({ label: candidate?.fullName ?? `Candidate #${id}` });
      }
    } else if (path.startsWith("/forms")) {
      items.push({ label: "Forms" });
    } else {
      items.push({ label: "Dashboard" });
    }
    return items;
  }, [location.pathname, getCandidateById]);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, idx) => (
              <Fragment key={`crumb-${idx}`}>
                <BreadcrumbItem>
                  {c.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={c.to}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto" />
      </div>
    </header>
  );
}
