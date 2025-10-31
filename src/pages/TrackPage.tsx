import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconChevronRight,
  IconPencil,
  IconCode,
  IconNetwork,
} from "@tabler/icons-react";
import { RiBardFill } from "react-icons/ri";
import { Loader } from "@/components/ui/loader";
import { getPortalModules, type PortalModule } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useUserGroups } from "@/hooks/useUserGroups";

export function TrackPage() {
  const navigate = useNavigate();
  const { groupId, groups } = useUserGroups();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<PortalModule[] | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});

  // Map track names to a visual theme (gradient + background icon)
  function getTrackTheme(trackName?: string) {
    const name = (trackName || "").toLowerCase();
    if (name.includes("ai") || name.includes("data")) {
      return {
        gradient: "bg-gradient-to-br from-[#34d399] via-[#06b6d4] to-[#3b82f6]",
        icon: "star4" as const,
      };
    }
    if (
      name.includes("software") ||
      name.includes("app") ||
      name.includes("development")
    ) {
      return {
        gradient: "bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#d946ef]",
        icon: "code" as const,
      };
    }
    if (name.includes("network") || name.includes("communication")) {
      return {
        gradient: "bg-gradient-to-br from-[#0ea5e9] via-[#22d3ee] to-[#34d399]",
        icon: "network" as const,
      };
    }
    // Fallback theme
    return {
      gradient:
        "bg-gradient-to-br from-primary/20 via-primary/10 to-background",
      icon: "code" as const,
    };
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await getPortalModules();
        if (!cancelled) setModules(data.results ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load tracks");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive user-facing track title from /me groups
  const trackTitle = useMemo(() => {
    const g = (groups || []).map((x) => x.trim());
    // Prefer patterns like "instructor -> X"
    const arrow = g.find((x) => x.includes("->"));
    if (arrow) return arrow.split("->").pop()!.trim();
    // Prefer domain-like group names over generic ones
    const generic = [
      "trainee",
      "candidate",
      "instructor",
      "staff",
      "support",
      "attendance_tracker",
    ];
    const domain = g.find(
      (x) => !generic.some((k) => x.toLowerCase().includes(k))
    );
    return domain || "My Track";
  }, [groups]);

  const isInstructor = useMemo(() => {
    const g = groups || [];
    const hasInstructor = g.some((x) => x.toLowerCase().includes("instructor"));
    return groupId === 5 || hasInstructor;
  }, [groupId, groups]);

  // removed unused toggleWeek helper; we toggle inline on the header button

  return (
    <div className="px-4 lg:px-6">
      {(() => {
        const theme = getTrackTheme(trackTitle);
        return (
          <div
            className={
              "relative overflow-hidden rounded-2xl border border-border/40 p-8 mb-6 text-white " +
              theme.gradient
            }
          >
            {/* Background icon (cropped, faded) */}
            <div
              className="pointer-events-none absolute -left-10 -top-12 opacity-20"
              aria-hidden="true"
            >
              {theme.icon === "star4" && (
                <RiBardFill className="size-[280px] md:size-[250px]" />
              )}
              {theme.icon === "code" && (
                <IconCode
                  className="size-[280px] md:size-[340px]"
                  stroke={1.25}
                />
              )}
              {theme.icon === "network" && (
                <IconNetwork
                  className="size-[280px] md:size-[340px]"
                  stroke={1.25}
                />
              )}
            </div>

            {/* Right-aligned title/content */}
            <div className="relative">
              <div className="ml-auto text-right max-w-[48rem]">
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
                  {trackTitle || "My Track"}
                </h1>
                <p className="mt-2 text-white/80">
                  {isInstructor
                    ? "Plan, organize, and edit weekly learning modules."
                    : "View content, assignments, and track your learning progress."}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && (modules?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {modules!
            .sort((a, b) => a.order - b.order)
            .map((mod) => {
              const isOpen = openWeeks[mod.id] ?? true;
              return (
                <Card
                  key={mod.id}
                  className="overflow-hidden gap-0 border-none shadow-none py-2"
                >
                  <CardHeader className="p-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenWeeks((p) => ({ ...p, [mod.id]: !isOpen }))
                      }
                      className="w-full flex items-center rounded-md bg-[#6d5cff]/10 hover:bg-[#6d5cff]/15 px-4 py-3 transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 active:outline-none"
                    >
                      <IconChevronRight
                        className={`mr-2 size-4 text-[#6d5cff] transition-transform ${
                          isOpen ? "rotate-90" : "rotate-0"
                        }`}
                      />
                      <span className="mx-2 h-5 w-px bg-[#6d5cff]/30" />
                      <CardTitle className="m-0 p-0 text-base font-medium">
                        {mod.title}
                      </CardTitle>
                    </button>
                  </CardHeader>
                  <div
                    className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100 translate-y-0"
                        : "grid-rows-[0fr] opacity-95 -translate-y-0.5"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <CardContent className="px-0">
                        <div>
                          <table className="w-full border-collapse text-sm md:text-base">
                            <tbody>
                              {mod.sessions
                                .sort((a, b) => a.order - b.order)
                                .map((session) => (
                                  <tr
                                    key={session.id}
                                    className="group cursor-pointer border-b-1 border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors"
                                    onClick={() =>
                                      navigate(
                                        `/modules/session/${session.id}`,
                                        {
                                          state: {
                                            sessionTitle: session.title,
                                          },
                                        }
                                      )
                                    }
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-muted-foreground">
                                        Day {session.order}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {session.title}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <IconPencil className="inline size-4 opacity-0 transition-opacity group-hover:opacity-60 text-muted-foreground" />
                                    </td>
                                  </tr>
                                ))}
                              {isInstructor && !mod.test && (
                                <tr className="border-b-0">
                                  <td
                                    colSpan={3}
                                    className="px-4 py-3 text-right"
                                  >
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/modules/${mod.id}/pre-post-exams/new`
                                        );
                                      }}
                                    >
                                      Create Exam
                                    </Button>
                                  </td>
                                </tr>
                              )}
                              {isInstructor && mod.test && (
                                <tr className="border-b-0">
                                  <td
                                    colSpan={3}
                                    className="px-4 py-3 text-right"
                                  >
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/modules/${mod.id}/pre-post-exams/view`,
                                          { state: { testId: mod.test?.id } }
                                        );
                                      }}
                                    >
                                      View Exam
                                    </Button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default TrackPage;
