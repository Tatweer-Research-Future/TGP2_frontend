import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  ExternalLink,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import {
  createOrUpdatePortalSubmission,
  getPortalSession,
  type PortalAssignment,
  type PortalSession,
  type PortalSubmission,
} from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { useUserGroups } from "@/hooks/useUserGroups";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SessionViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groupId, groups } = useUserGroups();
  const { t, i18n } = useTranslation();
  const isRTL = (i18n.language || "en").startsWith("ar");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [submissionAssignment, setSubmissionAssignment] =
    useState<PortalAssignment | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionRecords, setSubmissionRecords] = useState<
    Record<number, PortalSubmission>
  >({});

  const sessionId = useMemo(() => (id ? Number(id) : null), [id]);

  const isInstructor = useMemo(() => {
    const g = groups || [];
    const hasInstructor = g.some((x) => x.toLowerCase().includes("instructor"));
    return groupId === 5 || hasInstructor;
  }, [groupId, groups]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await getPortalSession(String(sessionId));
        if (!cancelled) setSession(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load session");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    if (sessionId) load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function closeSubmissionDialog() {
    setSubmissionAssignment(null);
    setSubmissionLink("");
    setSubmissionNote("");
    setSubmissionError(null);
  }

  function openSubmissionDialog(assignment: PortalAssignment) {
    setSubmissionAssignment(assignment);
    const existing = submissionRecords[assignment.id];
    setSubmissionLink(existing?.submitted_link ?? "");
    setSubmissionNote(existing?.note ?? "");
    setSubmissionError(null);
  }

  async function handleSubmitSubmission(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!submissionAssignment) return;

    if (!submissionLink.trim()) {
      setSubmissionError("Submission link is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOrUpdatePortalSubmission({
        assignment: submissionAssignment.id,
        submitted_link: submissionLink.trim(),
        note: submissionNote.trim() ? submissionNote.trim() : null,
      });

      setSubmissionRecords((prev) => ({
        ...prev,
        [submissionAssignment.id]: response,
      }));

      toast.success("Submission saved");
      closeSubmissionDialog();
    } catch (error) {
      const detail = (error as any)?.data?.detail || (error as any)?.message;
      const message =
        typeof detail === "string" && detail.trim().length > 0
          ? detail
          : "Failed to submit assignment";
      setSubmissionError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const dateRange = useMemo(() => {
    const formatDate = (value?: string | null) => {
      if (!value) return null;
      const d = new Date(value);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };
    const start = formatDate(session?.start_time ?? null);
    const end = formatDate(session?.end_time ?? null);
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
    return "";
  }, [session?.start_time, session?.end_time]);

  const sortedContent = useMemo(() => {
    const items = session?.content ? [...session.content] : [];
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return items;
  }, [session?.content]);

  const activeSubmission = submissionAssignment
    ? submissionRecords[submissionAssignment.id] ?? null
    : null;

  return (
    <Dialog
      open={Boolean(submissionAssignment)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          closeSubmissionDialog();
        }
      }}
    >
      <div className="relative">
        <div className="px-8 pt-0 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/modules")}
            className="h-8 px-2 text-sm inline-flex items-center gap-1"
          >
            {isRTL ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
            {t("navigation.back_to_track")}
          </Button>

          {isInstructor && id && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`/modules/session/${id}/edit`)}
            >
              {t("common.buttons.edit")}
            </Button>
          )}
        </div>

        <div className="my-6">
          <div className="w-full px-12">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold">
                {session?.title || "Session"}
              </h1>
            </div>
            {dateRange && (
              <div className="text-sm text-muted-foreground mt-1">
                {dateRange}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader />
          </div>
        )}
        {error && <div className="text-destructive px-12">{error}</div>}

        {!isLoading && !error && session && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList
              className={`ps-8 ${isRTL ? "justify-end flex-row-reverse" : ""}`}
            >
              <TabsTrigger value="details">
                {t("sessions.session_details")}
              </TabsTrigger>
              <TabsTrigger value="assignments">
                {t("sessions.assignments")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 gap-6">
                <Card
                  className="overflow-hidden gap-0 border-none shadow-none p-6 pt-0"
                  style={{ background: "none" }}
                >
                  <CardContent className="pt-2 space-y-6">
                    <div>
                      <div className="rounded-md border px-4 py-3">
                        {session.description?.trim() ? (
                          <div className="max-w-none text-foreground/90">
                            <ReactMarkdown
                              components={{
                                ul: ({ node, ...props }) => (
                                  <ul
                                    className="list-disc ml-6 my-2 space-y-1"
                                    {...props}
                                  />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol
                                    className="list-decimal ml-6 my-2 space-y-1"
                                    {...props}
                                  />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="leading-6" {...props} />
                                ),
                                a: ({ node, ...props }) => (
                                  <a
                                    className="text-primary underline underline-offset-2 hover:opacity-80"
                                    target="_blank"
                                    rel="noreferrer"
                                    {...props}
                                  />
                                ),
                                code: ({
                                  node,
                                  className,
                                  children,
                                  ...props
                                }) => (
                                  <code
                                    className={`bg-muted px-1.5 py-0.5 rounded text-[0.9em] ${
                                      className || ""
                                    }`}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                ),
                                p: ({ node, ...props }) => (
                                  <p className="mb-3" {...props} />
                                ),
                              }}
                            >
                              {session.description}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No description yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-base font-semibold my-4">
                        {t("sessions.uploaded_documents")}
                      </div>
                      <div className="mt-2">
                        {sortedContent.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No uploaded documents yet.
                          </div>
                        ) : (
                          <div className="divide-y rounded-md border bg-muted/30">
                            {sortedContent.map((c) => {
                              const href = c.link || c.file || undefined;
                              const title =
                                c.title ||
                                (c.file ? c.file.split("/").pop() : "Untitled");
                              return (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between gap-3 p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-sm">
                                        {title}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Uploaded{" "}
                                        {new Date(
                                          c.created_at
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  {href && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="inline-flex items-center gap-1"
                                      onClick={() =>
                                        window.open(
                                          href,
                                          "_blank",
                                          "noopener,noreferrer"
                                        )
                                      }
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      View
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assignments">
              <div className="grid grid-cols-1 gap-6">
                <Card
                  className="overflow-hidden gap-0 border-none shadow-none p-6"
                  style={{ background: "none" }}
                >
                  {/* <CardHeader className="pb-0">
                    <CardTitle className="text-lg">Assignments</CardTitle>
                  </CardHeader> */}
                  <CardContent className="pt-3">
                    {(session.assignments?.length ?? 0) === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No assignments yet.
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y px-4">
                        <Accordion type="single" collapsible className="w-full">
                          {session.assignments
                            ?.slice()
                            .sort((a, b) => {
                              const at = a.due_date
                                ? new Date(a.due_date).getTime()
                                : 0;
                              const bt = b.due_date
                                ? new Date(b.due_date).getTime()
                                : 0;
                              return at - bt;
                            })
                            .map((a) => {
                              const due = a.due_date
                                ? new Date(a.due_date).toLocaleString()
                                : null;
                              const added = (a as any)?.created_at
                                ? new Date(
                                    (a as any).created_at
                                  ).toLocaleString()
                                : null;
                              const submission = submissionRecords[a.id];
                              return (
                                <AccordionItem key={a.id} value={`a-${a.id}`}>
                                  <AccordionTrigger>
                                    <div className="flex w-full items-center justify-between gap-3 pr-2">
                                      <div className="flex flex-col items-start gap-1">
                                        <span className="font-medium text-sm sm:text-base">
                                          {a.title}
                                        </span>
                                        {due && (
                                          <span className="text-[11px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            Due: {due}
                                          </span>
                                        )}
                                      </div>
                                      {added && (
                                        <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                          Added {added}
                                        </span>
                                      )}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="flex flex-col gap-3 p-2 sm:p-3">
                                      {a.description?.trim() && (
                                        <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                                          {a.description}
                                        </div>
                                      )}
                                      {submission && (
                                        <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                          <span>
                                            Submitted{" "}
                                            {new Date(
                                              submission.submitted_at
                                            ).toLocaleString()}
                                          </span>
                                          {submission.submitted_link && (
                                            <Button
                                              type="button"
                                              variant="link"
                                              className="h-auto px-0 text-xs"
                                              onClick={() =>
                                                window.open(
                                                  submission.submitted_link,
                                                  "_blank",
                                                  "noopener,noreferrer"
                                                )
                                              }
                                            >
                                              View submission
                                            </Button>
                                          )}
                                          {submission.note &&
                                            submission.note.trim() && (
                                              <span className="whitespace-pre-wrap">
                                                Note: {submission.note}
                                              </span>
                                            )}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-2">
                                        {a.link && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="inline-flex items-center gap-1"
                                            onClick={() =>
                                              window.open(
                                                a.link as string,
                                                "_blank",
                                                "noopener,noreferrer"
                                              )
                                            }
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            View assignment
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="default"
                                          onClick={() =>
                                            openSubmissionDialog(a)
                                          }
                                        >
                                          {submission
                                            ? "Update submission"
                                            : "Submit assignment"}
                                        </Button>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                        </Accordion>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <DialogContent className="flex flex-col gap-6">
        <DialogHeader>
          <DialogTitle>
            {submissionAssignment
              ? `Submit ${submissionAssignment.title}`
              : "Submit assignment"}
          </DialogTitle>
          <DialogDescription>
            Add the link to your work and an optional note for reviewers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmitSubmission} className="flex flex-col gap-4">
          <div className="grid gap-4">
            {activeSubmission && (
              <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Last submitted{" "}
                {new Date(activeSubmission.submitted_at).toLocaleString()}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="submission-link">Submission link</Label>
              <Input
                id="submission-link"
                type="url"
                placeholder="https://..."
                value={submissionLink}
                onChange={(event) => setSubmissionLink(event.target.value)}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="submission-note">Note (optional)</Label>
              <Textarea
                id="submission-note"
                rows={3}
                placeholder="Anything you'd like reviewers to know"
                value={submissionNote}
                onChange={(event) => setSubmissionNote(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {submissionError && (
              <p className="text-sm text-destructive">{submissionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeSubmissionDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : activeSubmission
                ? "Update submission"
                : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
