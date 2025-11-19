import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconChevronRight,
  IconChevronLeft,
  IconPencil,
  IconCode,
  IconNetwork,
  IconLoader2,
} from "@tabler/icons-react";
import { RiBardFill } from "react-icons/ri";
import { Loader } from "@/components/ui/loader";
import {
  getPortalModules,
  updatePortalModule,
  type PortalModule,
} from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useTranslation } from "react-i18next";

export function TrackPage() {
  const navigate = useNavigate();
  const { groupId, groups } = useUserGroups();
  const { t, i18n } = useTranslation();
  const isRTL = (i18n.language || "en").startsWith("ar");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<PortalModule[] | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState("");
  const [savingModuleId, setSavingModuleId] = useState<number | null>(null);
  const [moduleErrors, setModuleErrors] = useState<Record<number, string>>({});
  const moduleTitleInputRef = useRef<HTMLInputElement | null>(null);

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
      } catch (e: unknown) {
        let message = "Failed to load tracks";
        if (
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          typeof (e as { message?: unknown }).message === "string"
        ) {
          message = (e as { message: string }).message;
        }
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (editingModuleId !== null) {
      moduleTitleInputRef.current?.focus();
      moduleTitleInputRef.current?.select();
    }
  }, [editingModuleId]);

  function clearModuleError(id: number) {
    setModuleErrors((prev) => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function handleStartEditingModule(mod: PortalModule) {
    clearModuleError(mod.id);
    setEditingModuleId(mod.id);
    setModuleTitleDraft(mod.title);
  }

  function handleCancelEditingModule(id?: number) {
    if (typeof id === "number") {
      clearModuleError(id);
    }
    setEditingModuleId(null);
    setModuleTitleDraft("");
  }

  async function handleModuleTitleSubmit(mod: PortalModule) {
    if (savingModuleId === mod.id) return;

    const trimmed = moduleTitleDraft.trim();
    if (!trimmed) {
      setModuleErrors((prev) => ({
        ...prev,
        [mod.id]: "Title is required",
      }));
      return;
    }

    if (trimmed === mod.title) {
      handleCancelEditingModule(mod.id);
      return;
    }

    setSavingModuleId(mod.id);
    try {
      const updatedModule = await updatePortalModule(mod.id, {
        title: trimmed,
      });
      setModules((prev) => {
        if (!prev) return prev;
        return prev.map((m) => {
          if (m.id !== mod.id) return m;
          const merged = updatedModule
            ? {
                ...m,
                ...updatedModule,
              }
            : {
                ...m,
                title: trimmed,
              };
          return {
            ...merged,
            sessions: merged.sessions ?? m.sessions,
            test: merged.test ?? m.test,
          };
        });
      });
      handleCancelEditingModule(mod.id);
    } catch (err: unknown) {
      let message = "Failed to update module title";
      if (typeof err === "object" && err !== null) {
        const withData = err as { data?: unknown; message?: unknown };
        if (typeof withData.data === "string") {
          message = withData.data;
        } else if (
          typeof withData.data === "object" &&
          withData.data !== null
        ) {
          const detail = (withData.data as { detail?: unknown }).detail;
          if (typeof detail === "string") {
            message = detail;
          } else {
            const titleVal = (withData.data as { title?: unknown }).title;
            if (Array.isArray(titleVal) && typeof titleVal[0] === "string") {
              message = titleVal[0];
            } else if (typeof titleVal === "string") {
              message = titleVal;
            }
          }
        } else if (typeof withData.message === "string") {
          message = withData.message;
        }
      }

      setModuleErrors((prev) => ({
        ...prev,
        [mod.id]: message,
      }));
    } finally {
      setSavingModuleId((prev) => (prev === mod.id ? null : prev));
    }
  }

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
                    ? t("track.instructor_description")
                    : t("track.student_description")}
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
              const isOpen = openWeeks[mod.id] ?? false;
              const moduleError = moduleErrors[mod.id];
              const isEditingModule =
                isInstructor && editingModuleId === mod.id;
              return (
                <Card
                  key={mod.id}
                  className="overflow-hidden gap-0 border-none shadow-none py-2"
                >
                  <CardHeader className="p-0">
                    {isEditingModule ? (
                      <form
                        className="w-full"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleModuleTitleSubmit(mod);
                        }}
                      >
                        <div className="flex items-center gap-3 rounded-md bg-[#6d5cff]/10 px-4 py-2 focus-within:bg-[#6d5cff]/15">
                          <input
                            ref={moduleTitleInputRef}
                            className="flex-1 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground"
                            value={moduleTitleDraft}
                            onChange={(event) => {
                              setModuleTitleDraft(event.target.value);
                              if (moduleError) clearModuleError(mod.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                handleCancelEditingModule(mod.id);
                              }
                            }}
                            placeholder="Enter module title"
                            disabled={savingModuleId === mod.id}
                          />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden md:inline">
                              Press Enter to save
                            </span>
                            {savingModuleId === mod.id && (
                              <IconLoader2 className="size-4 animate-spin text-[#6d5cff]" />
                            )}
                          </div>
                          <button type="submit" className="sr-only">
                            Save
                          </button>
                        </div>
                        {moduleError && (
                          <p className="px-4 pt-2 text-sm text-destructive">
                            {moduleError}
                          </p>
                        )}
                      </form>
                    ) : (
                      <div className="group flex w-full items-center rounded-md bg-[#6d5cff]/10 transition-colors hover:bg-[#6d5cff]/15 focus-within:bg-[#6d5cff]/15">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenWeeks((p) => ({ ...p, [mod.id]: !isOpen }))
                          }
                          className="flex flex-1 items-center px-4 py-3 text-left outline-none focus-visible:outline-none focus-visible:ring-0"
                        >
                          <div className="flex flex-1 items-center">
                            {isRTL ? (
                              <IconChevronLeft
                                className={`me-2 size-4 text-[#6d5cff] transition-transform ${
                                  isOpen ? "-rotate-90" : "rotate-0"
                                }`}
                              />
                            ) : (
                              <IconChevronRight
                                className={`me-2 size-4 text-[#6d5cff] transition-transform ${
                                  isOpen ? "rotate-90" : "rotate-0"
                                }`}
                              />
                            )}
                            <span className="mx-2 h-5 w-px bg-[#6d5cff]/30" />
                            <CardTitle className="m-0 p-0 text-base font-medium">
                              {mod.title}
                            </CardTitle>
                          </div>
                        </button>
                        {isInstructor && (
                          <div className="ms-auto flex items-center gap-2 px-4 py-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/modules/${mod.id}/ranking`, {
                                  state: {
                                    weekOrder: mod.order,
                                    moduleTitle: mod.title,
                                  },
                                });
                              }}
                            >
                              Rank Trainees
                            </Button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleStartEditingModule(mod);
                              }}
                              className="text-[#6d5cff] opacity-0 transition-opacity duration-150 group-hover:opacity-80 focus-visible:opacity-100"
                              aria-label={`Edit ${mod.title}`}
                            >
                              <IconPencil className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!isEditingModule && moduleError && (
                      <p className="px-4 pt-2 text-sm text-destructive">
                        {moduleError}
                      </p>
                    )}
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
                                      {isInstructor ? (
                                        <IconPencil className="inline size-4 opacity-0 transition-opacity group-hover:opacity-60 text-muted-foreground" />
                                      ) : (
                                        <IconChevronRight className="inline size-4 opacity-0 transition-opacity group-hover:opacity-60 text-muted-foreground" />
                                      )}
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
                                    <div className="flex items-center justify-end gap-2">
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
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(
                                            `/modules/${mod.id}/pre-post-exams/results`,
                                            { state: { testId: mod.test?.id } }
                                          );
                                        }}
                                      >
                                        View Results
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {!isInstructor &&
                                mod.test &&
                                (mod.test.is_active_pre ||
                                  mod.test.is_active_post) && (
                                  <tr className="border-b-0">
                                    <td
                                      colSpan={3}
                                      className="px-4 py-3 text-right"
                                    >
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const kind = mod.test!.is_active_pre
                                            ? "PRE"
                                            : "POST";
                                          navigate(
                                            `/modules/${mod.id}/exam/take`,
                                            {
                                              state: { kind },
                                            }
                                          );
                                        }}
                                      >
                                        {mod.test.is_active_pre
                                          ? "Take Pre-Exam"
                                          : "Take Post-Exam"}
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
