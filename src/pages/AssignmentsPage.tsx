import { useEffect, useMemo, useState } from "react";
import {
  IconCode,
  IconNetwork,
  IconChevronRight,
  IconChevronLeft,
  IconExternalLink,
  IconCalendar,
  IconFile,
} from "@tabler/icons-react";
import { RiBardFill } from "react-icons/ri";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAssignments,
  getSubmissions,
  type Assignment,
  type AssignmentSubmission,
} from "@/lib/api";

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

// Parse week and session from assignment title
function parseWeekAndSession(title: string): { week: number; session: number } {
  const weekMatch = title.match(/Week\s+(\d+)/i);
  const sessionMatch = title.match(/Session\s+(\d+)/i);
  return {
    week: weekMatch ? parseInt(weekMatch[1], 10) : 0,
    session: sessionMatch ? parseInt(sessionMatch[1], 10) : 0,
  };
}


// Create a structure: week -> sessions -> assignments -> submissions
type WeekData = {
  weekOrder: number;
  weekTitle: string;
  sessions: SessionData[];
};

type SessionData = {
  sessionNumber: number;
  assignments: AssignmentSubmissionGroup[];
};

type AssignmentSubmissionGroup = {
  assignmentId: number;
  assignmentTitle: string;
  submissions: AssignmentSubmission[];
  assignment?: Assignment;
};

function organizeSubmissions(
  submissions: AssignmentSubmission[],
  assignments: Assignment[]
): WeekData[] {
  // First, group submissions by week_order -> assignment_id
  const byWeek: Record<
    number,
    { weekTitle: string; byAssignment: Record<number, AssignmentSubmission[]> }
  > = {};

  submissions.forEach((sub) => {
    const weekOrder = sub.week_order;
    const weekTitle = sub.week_title || `Week ${weekOrder}`;
    const assignmentId = sub.assignment_id;

    if (!byWeek[weekOrder]) {
      byWeek[weekOrder] = { weekTitle, byAssignment: {} };
    }

    if (!byWeek[weekOrder].byAssignment[assignmentId]) {
      byWeek[weekOrder].byAssignment[assignmentId] = [];
    }

    byWeek[weekOrder].byAssignment[assignmentId].push(sub);
  });

  // Create assignment map
  const assignmentMap = new Map<number, Assignment>();
  assignments.forEach((a) => assignmentMap.set(a.id, a));

  // Also include assignments that have my_submissions but may not be in the submissions array
  // This ensures assignments with submissions are displayed even if they're not in the submissions list
  assignments.forEach((assignment) => {
    if (assignment.my_submissions && assignment.my_submissions.length > 0) {
      const firstSub = assignment.my_submissions[0];
      const weekOrder = firstSub.week_order;
      const weekTitle = firstSub.week_title || `Week ${weekOrder}`;
      const assignmentId = assignment.id;

      if (!byWeek[weekOrder]) {
        byWeek[weekOrder] = { weekTitle, byAssignment: {} };
      }

      // Add the assignment to the week structure if not already present
      // This ensures assignments with my_submissions are included
      if (!byWeek[weekOrder].byAssignment[assignmentId]) {
        byWeek[weekOrder].byAssignment[assignmentId] = assignment.my_submissions;
      }
    }
  });

  // Now organize into sessions by parsing assignment titles
  const weeks: WeekData[] = Object.entries(byWeek)
    .map(([weekOrderStr, weekData]) => {
      const weekOrder = parseInt(weekOrderStr, 10);

      // Group assignments by session
      const bySession: Record<number, AssignmentSubmissionGroup[]> = {};

      Object.entries(weekData.byAssignment).forEach(([assignmentIdStr, subs]) => {
        const assignmentId = parseInt(assignmentIdStr, 10);
        const assignment = assignmentMap.get(assignmentId);
        
        // Use my_submissions if available, otherwise use the subs array
        const finalSubmissions = assignment?.my_submissions && assignment.my_submissions.length > 0
          ? assignment.my_submissions
          : subs;
        
        const assignmentTitle =
          assignment?.title ||
          finalSubmissions[0]?.assignment_title ||
          `Assignment ${assignmentId}`;

        // Parse session from assignment title
        const { session } = parseWeekAndSession(assignmentTitle);
        const sessionNum = session || 0;

        if (!bySession[sessionNum]) {
          bySession[sessionNum] = [];
        }

        bySession[sessionNum].push({
          assignmentId,
          assignmentTitle,
          submissions: finalSubmissions,
          assignment,
        });
      });

      // Convert to SessionData array
      const sessions: SessionData[] = Object.entries(bySession)
        .map(([sessionStr, assignmentGroups]) => ({
          sessionNumber: parseInt(sessionStr, 10),
          assignments: assignmentGroups.sort((a, b) =>
            a.assignmentTitle.localeCompare(b.assignmentTitle)
          ),
        }))
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      return {
        weekOrder,
        weekTitle: weekData.weekTitle,
        sessions,
      };
    })
    .sort((a, b) => a.weekOrder - b.weekOrder);

  return weeks;
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssignmentsPage() {
  const { groups } = useUserGroups();
  const { t, i18n } = useTranslation();
  const isRTL = (i18n.language || "en").startsWith("ar");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  // Derive user-facing track title from /me groups (same logic as TrackPage)
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

  const theme = getTrackTheme(trackTitle);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const [assignmentsData, submissionsData] = await Promise.all([
          getAssignments(),
          getSubmissions(),
        ]);
        if (!cancelled) {
          setAssignments(assignmentsData.results ?? []);
          setSubmissions(submissionsData.results ?? []);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message || "Failed to load assignments");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Organize submissions by week -> session -> assignment
  const organizedWeeks = useMemo(() => {
    return organizeSubmissions(submissions, assignments);
  }, [submissions, assignments]);

  return (
    <div className="px-4 lg:px-6">
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
              {t("track.instructor_description")}
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && organizedWeeks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {organizedWeeks.map((weekData) => {
            const isOpen = openWeeks[weekData.weekOrder] ?? false;
            return (
              <Card
                key={weekData.weekOrder}
                className="overflow-hidden gap-0 border-none shadow-none py-2"
              >
                <CardHeader className="p-0">
                  <div className="group flex w-full items-center rounded-md bg-[#6d5cff]/10 transition-colors hover:bg-[#6d5cff]/15">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenWeeks((p) => ({
                          ...p,
                          [weekData.weekOrder]: !isOpen,
                        }))
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
                          {weekData.weekTitle} (Week {weekData.weekOrder})
                        </CardTitle>
                      </div>
                    </button>
                  </div>
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
                      <div className="space-y-4">
                        {weekData.sessions.map((session) => (
                          <div key={session.sessionNumber} className="space-y-2">
                            <h3 className="px-4 pt-2 text-sm font-semibold text-muted-foreground">
                              Session {session.sessionNumber}
                            </h3>
                            <table className="w-full border-collapse text-sm md:text-base">
                              <tbody>
                                {session.assignments.map((assignmentGroup) => {
                                  // Check both assignment.my_submissions and use the assignment from the map
                                  const assignmentFromMap = assignments.find(a => a.id === assignmentGroup.assignmentId);
                                  const mySubmissions = assignmentFromMap?.my_submissions || assignmentGroup.assignment?.my_submissions || [];
                                  return (
                                    <>
                                      <tr
                                        key={assignmentGroup.assignmentId}
                                        className="group cursor-pointer border-b-1 border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors"
                                        onClick={() =>
                                          assignmentGroup.assignment &&
                                          setSelectedAssignment(
                                            assignmentGroup.assignment
                                          )
                                        }
                                      >
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {assignmentGroup.assignmentTitle}
                                            </span>
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {assignmentGroup.submissions.length}{" "}
                                              {assignmentGroup.submissions.length ===
                                              1
                                                ? "submission"
                                                : "submissions"}
                                            </Badge>
                                            {assignmentGroup.assignment
                                              ?.is_gradable && (
                                              <Badge
                                                variant="default"
                                                className="text-xs"
                                              >
                                                Graded
                                              </Badge>
                                            )}
                                            {assignmentGroup.assignment?.type ===
                                              "NOT_GRADED" && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                Not Graded
                                              </Badge>
                                            )}
                                          </div>
                                          {assignmentGroup.assignment
                                            ?.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                              {
                                                assignmentGroup.assignment
                                                  .description
                                              }
                                            </p>
                                          )}
                                          {(assignmentGroup.assignment?.file || assignmentGroup.assignment?.link) && (
                                            <div className="mt-1">
                                              {assignmentGroup.assignment.file ? (
                                                <a
                                                  href={assignmentGroup.assignment.file}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                >
                                                  <IconFile className="size-3" />
                                                  <span className="truncate max-w-[200px]">
                                                    {assignmentGroup.assignment.file.split("/").pop() || "View file"}
                                                  </span>
                                                </a>
                                              ) : assignmentGroup.assignment.link ? (
                                                <a
                                                  href={assignmentGroup.assignment.link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                >
                                                  <IconExternalLink className="size-3" />
                                                  <span className="truncate max-w-[200px]">
                                                    Assignment link
                                                  </span>
                                                </a>
                                              ) : null}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                          {assignmentGroup.assignment && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <IconCalendar className="size-4" />
                                              <span className="text-xs">
                                                {formatDate(
                                                  assignmentGroup.assignment
                                                    .due_date
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                      {mySubmissions.length > 0 && (
                                        <tr key={`${assignmentGroup.assignmentId}-submissions`} className="border-b-1 border-border/60">
                                          <td colSpan={2} className="px-4 py-2 bg-muted/20">
                                            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Your Submissions:
                                              </p>
                                              {mySubmissions.map((submission) => (
                                                <div key={submission.id} className="text-sm space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs">
                                                      Submitted:
                                                    </span>
                                                    <span className="text-xs">
                                                      {formatDate(submission.submitted_at)}
                                                    </span>
                                                  </div>
                                                  {submission.submitted_link && (
                                                    <div>
                                                      <a
                                                        href={submission.submitted_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 text-primary hover:underline text-xs"
                                                        onClick={(e) => e.stopPropagation()}
                                                      >
                                                        <IconExternalLink className="size-3" />
                                                        View Submission
                                                      </a>
                                                    </div>
                                                  )}
                                                  {submission.note && (
                                                    <div className="bg-muted/50 rounded px-2 py-1 text-xs">
                                                      <span className="font-medium">Note: </span>
                                                      {submission.note}
                                                    </div>
                                                  )}
                                                  {submission.grade !== null && submission.grade !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs font-medium">Grade:</span>
                                                      <Badge variant="default" className="text-xs">
                                                        {submission.grade}
                                                      </Badge>
                                                    </div>
                                                  )}
                                                  {submission.feedback && (
                                                    <div className="bg-muted/50 rounded px-2 py-1 text-xs">
                                                      <span className="font-medium">Feedback: </span>
                                                      {submission.feedback}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assignment Detail Dialog */}
      <Dialog
        open={!!selectedAssignment}
        onOpenChange={(open) => !open && setSelectedAssignment(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAssignment.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-4 mt-2">
                  {selectedAssignment.description && (
                    <span>{selectedAssignment.description}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <IconCalendar className="size-4" />
                    <span className="text-sm">
                      Due: {formatDate(selectedAssignment.due_date)}
                    </span>
                  </div>
                  {selectedAssignment.file ? (
                    <a
                      href={selectedAssignment.file}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      <IconFile className="size-4" />
                      <span className="truncate max-w-[200px]">
                        {selectedAssignment.file.split("/").pop() || "View file"}
                      </span>
                    </a>
                  ) : selectedAssignment.link ? (
                    <a
                      href={selectedAssignment.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      <IconExternalLink className="size-4" />
                      Assignment Link
                    </a>
                  ) : null}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Submissions (
                  {submissions.filter(
                    (s) => s.assignment_id === selectedAssignment.id
                  ).length}
                  )
                </h3>
                {submissions.filter(
                  (s) => s.assignment_id === selectedAssignment.id
                ).length === 0 ? (
                  <p className="text-muted-foreground">No submissions yet.</p>
                ) : (
                  <div className="space-y-4">
                    {submissions
                      .filter((s) => s.assignment_id === selectedAssignment.id)
                      .map((submission) => (
                      <Card key={submission.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">
                                  {submission.trainee_name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {submission.trainee_email}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(submission.submitted_at)}
                                </p>
                                <Badge variant="outline" className="mt-1">
                                  {submission.track_name}
                                </Badge>
                              </div>
                            </div>
                            {submission.submitted_link && (
                              <div>
                                <a
                                  href={submission.submitted_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                                >
                                  <IconExternalLink className="size-4" />
                                  View Submission
                                </a>
                              </div>
                            )}
                            {submission.note && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <p className="text-sm">
                                  <span className="font-medium">Note: </span>
                                  {submission.note}
                                </p>
                              </div>
                            )}
                            {submission.grade !== null &&
                              submission.grade !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    Grade:
                                  </span>
                                  <Badge variant="default">
                                    {submission.grade}
                                  </Badge>
                                </div>
                              )}
                            {submission.feedback && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <p className="text-sm">
                                  <span className="font-medium">Feedback: </span>
                                  {submission.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
