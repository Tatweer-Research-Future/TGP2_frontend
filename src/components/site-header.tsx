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
import { Fragment, useEffect, useMemo, useState } from "react";
import { useCandidates } from "@/context/CandidatesContext";
import { getPortalSession } from "@/lib/api";

export function SiteHeader() {
  const location = useLocation();
  const { getCandidateById } = useCandidates();
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);

  // Load session title for breadcrumb when on a session route
  useEffect(() => {
    setSessionTitle(null);
    const path = location.pathname;
    const m = path.match(/^\/modules\/session\/([^/]+)/);
    if (!m) return;
    const id = m[1];
    const stateTitle = (location as any).state?.sessionTitle as string | undefined;
    if (stateTitle) {
      setSessionTitle(stateTitle);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await getPortalSession(id);
        if (!cancelled) setSessionTitle(s.title || null);
      } catch (_) {
        if (!cancelled) setSessionTitle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const crumbs = useMemo(() => {
    const path = location.pathname;
    const items: { label: string; to?: string }[] = [];
    if (path === "/" || path === "/dashboard") {
      items.push({ label: "Home" });
    } else if (path === "/candidates") {
      items.push({ label: "Trainees" });
    } else if (path.startsWith("/candidates/")) {
      items.push({ label: "Trainees", to: "/candidates" });
      const id = path.match(/^\/candidates\/([^/]+)/)?.[1];
      if (id) {
        const candidate = getCandidateById(id);
        items.push({ label: candidate?.fullName ?? `Trainee #${id}` });
      }
    } else if (path.startsWith("/forms")) {
      items.push({ label: "Forms" });
    } else if (path === "/modules") {
      items.push({ label: "My Track" });
    } else if (/^\/modules\/session\/.+/.test(path)) {
      items.push({ label: "My Track", to: "/modules" });
      items.push({ label: "Sessions" });
      items.push({ label: sessionTitle ?? "Session" });
    } else if (/^\/modules\/\d+\/pre-post-exams\/new$/.test(path)) {
      items.push({ label: "My Track", to: "/modules" });
      items.push({ label: "Create Pre/Post Exam" });
    } else if (/^\/modules\/\d+\/pre-post-exams\/view$/.test(path)) {
      items.push({ label: "My Track", to: "/modules" });
      items.push({ label: "Pre/Post Exam" });
      items.push({ label: "View" });
    } else if (/^\/modules\/\d+\/exam\/(create|edit|results|take)$/.test(path)) {
      items.push({ label: "My Track", to: "/modules" });
      items.push({ label: "Exam" });
      if (path.endsWith("/create")) items.push({ label: "Create" });
      else if (path.endsWith("/edit")) items.push({ label: "Edit" });
      else if (path.endsWith("/results")) items.push({ label: "Results" });
      else if (path.endsWith("/take")) items.push({ label: "Take" });
    } else {
      items.push({ label: "Home" });
    }
    return items;
  }, [location.pathname, getCandidateById, sessionTitle]);

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
