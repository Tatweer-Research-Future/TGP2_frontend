import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Pencil,
  UploadCloud,
  ExternalLink,
  FileText,
  Plus,
  MoreVertical,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getPortalSession,
  updatePortalSession,
  uploadPortalSessionContentFile,
  deletePortalSessionContent,
  type PortalSession,
  type PortalAssignment,
  createPortalAssignment,
  updatePortalAssignment,
  deletePortalAssignment,
} from "@/lib/api";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldTitle,
  FieldSeparator,
} from "@/components/ui/field";

export default function SessionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PortalSession | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // UI state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);

  // Content upload
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Assignment mini-form
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDue, setAssignmentDue] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>(
    undefined
  );
  const [assignmentDueTime, setAssignmentDueTime] =
    useState<string>("10:30:00");
  const [assignmentLink, setAssignmentLink] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentType, setAssignmentType] = useState<string>("Individual");
  const [editingAssignment, setEditingAssignment] =
    useState<PortalAssignment | null>(null);

  // Delete confirmations
  const [confirmDeleteContentId, setConfirmDeleteContentId] = useState<
    number | null
  >(null);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] =
    useState<PortalAssignment | null>(null);
  const [deletingContent, setDeletingContent] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  const sessionId = useMemo(() => (id ? Number(id) : null), [id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await getPortalSession(String(sessionId));
        if (!cancelled) {
          setSession(data);
          setTitle("");
          setDescription(data.description ?? "");
          // Start in view mode; editor opens via pencil or + add description
          setShowDescriptionEditor(false);
        }
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

  async function onSaveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    try {
      setIsSaving(true);
      // Backend allows PUT; send full minimal shape to be safe
      const updated = await updatePortalSession(sessionId, {
        title:
          title && title.trim().length > 0
            ? title.trim()
            : session?.title ?? "",
        description: description?.trim() || null,
        // Intentionally omit start_time and end_time so dates remain unchanged
      } as any);
      // Ensure we keep full session fields (like start/end) after save
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed ?? updated);
      toast.success("Session saved");
      if (!title) {
        // keep placeholder behavior
        setTitle("");
      }
      setIsEditingTitle(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save session");
    } finally {
      setIsSaving(false);
    }
  }

  async function onUploadContent(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !selectedFile) return;
    try {
      setUploading(true);
      await uploadPortalSessionContentFile(sessionId, {
        file: selectedFile,
        title: fileTitle || selectedFile.name,
      });
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed);
      setSelectedFile(null);
      setFileTitle("");
      toast.success("Content uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload content");
    } finally {
      setUploading(false);
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
    items.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta; // newest first
    });
    return items;
  }, [session?.content]);

  function handleBrowseFiles() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function onCreateAssignment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!sessionId || !assignmentTitle.trim()) return;
    try {
      setCreatingAssignment(true);
      // Build ISO from date + time if provided
      let dueIso: string | null = null;
      if (assignmentDueDate || assignmentDueTime) {
        const date = assignmentDueDate ?? new Date();
        const [hh = "00", mm = "00", ss = "00"] = (
          assignmentDueTime || "00:00:00"
        ).split(":");
        const composed = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          Number(hh),
          Number(mm),
          Number(ss)
        );
        dueIso = composed.toISOString();
      }

      const payload = {
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim() || null,
        due_date: dueIso,
        link: assignmentLink.trim() ? assignmentLink.trim() : null,
        is_gradable: sessionId === 5,
        ...(sessionId === 5 ? { type: assignmentType } : {}),
      } as const;
      if (editingAssignment) {
        await updatePortalAssignment(editingAssignment.id, {
          ...payload,
          session: sessionId,
        } as any);
      } else {
        await createPortalAssignment(sessionId, payload as any);
      }
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed);
      setShowAssignmentForm(false);
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDue("");
      setAssignmentDueDate(undefined);
      setAssignmentDueTime("10:30:00");
      setAssignmentLink("");
      setAssignmentType("Individual");
      setEditingAssignment(null);
      toast.success(
        editingAssignment ? "Assignment updated" : "Assignment added"
      );
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingAssignment
            ? "Failed to update assignment"
            : "Failed to add assignment")
      );
    } finally {
      setCreatingAssignment(false);
    }
  }

  function onCancelAssignment() {
    // Hide and reset without submitting anything
    setShowAssignmentForm(false);
    setAssignmentTitle("");
    setAssignmentDescription("");
    setAssignmentDue("");
    setAssignmentDueDate(undefined);
    setAssignmentDueTime("10:30:00");
    setAssignmentLink("");
    setAssignmentType("Individual");
    setEditingAssignment(null);
  }

  function onEditAssignment(a: PortalAssignment) {
    setEditingAssignment(a);
    setShowAssignmentForm(true);
    setAssignmentTitle(a.title || "");
    setAssignmentDescription(a.description || "");
    if (a.due_date) {
      const d = new Date(a.due_date);
      setAssignmentDueDate(d);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      setAssignmentDueTime(`${hh}:${mm}:${ss}`);
    } else {
      setAssignmentDueDate(undefined);
      setAssignmentDueTime("10:30:00");
    }
    if (sessionId === 5 && a.type) {
      setAssignmentType(a.type);
    }
  }

  async function onDeleteAssignment(a: PortalAssignment) {
    try {
      await deletePortalAssignment(a.id);
      if (sessionId) {
        const refreshed = await getPortalSession(String(sessionId));
        setSession(refreshed);
      }
      toast.success("Assignment deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete assignment");
    }
  }

  async function onDeleteContent(contentId: number) {
    if (!sessionId) return;
    try {
      await deletePortalSessionContent(sessionId, contentId);
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed);
      toast.success("Document deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete document");
    }
  }

  async function handleConfirmDeleteContent() {
    if (!sessionId || confirmDeleteContentId == null) return;
    try {
      setDeletingContent(true);
      await deletePortalSessionContent(sessionId, confirmDeleteContentId);
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed);
      toast.success("Document deleted");
      setConfirmDeleteContentId(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete document");
    } finally {
      setDeletingContent(false);
    }
  }

  async function handleConfirmDeleteAssignment() {
    if (!confirmDeleteAssignment) return;
    try {
      setDeletingAssignment(true);
      await deletePortalAssignment(confirmDeleteAssignment.id);
      if (sessionId) {
        const refreshed = await getPortalSession(String(sessionId));
        setSession(refreshed);
      }
      toast.success("Assignment deleted");
      setConfirmDeleteAssignment(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete assignment");
    } finally {
      setDeletingAssignment(false);
    }
  }

  return (
    <div className="">
      <div className="px-8 pt-0">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/track")}
          className="h-8 px-2 text-sm inline-flex items-center gap-1"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to track
        </Button>
      </div>
      <form onSubmit={onSaveSession}>
        <div className="my-6">
          <div className="w-full px-12">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={session?.title}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-3xl md:text-4xl font-bold h-auto w-auto py-2 shadow-none outline-none focus:outline-none focus:ring-0 px-3 border-b bg-muted/30"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold">
                  {title.trim() || session?.title || "Session"}
                </h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditingTitle((v) => {
                      const next = !v;
                      if (next) {
                        setTitle((prev) =>
                          prev && prev.trim().length > 0
                            ? prev
                            : session?.title ?? ""
                        );
                      }
                      return next;
                    });
                  }}
                  className="rounded-full -mt-1"
                  aria-label="Edit title"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              </div>
            )}
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
        {error && <div className="text-destructive">{error}</div>}

        {!isLoading && !error && session && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="pl-8">
              <TabsTrigger value="details">Session details</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 gap-6">
                <Card className="overflow-hidden gap-0 border-none shadow-none p-6 pt-0">
                  <CardContent className="pt-2 space-y-6">
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldContent>
                            <div className="mb-1 flex justify-end">
                              <Button
                                type="button"
                                variant="link"
                                className="text-primary px-0 py-0 h-auto text-xs inline-flex items-center gap-1"
                                onClick={() =>
                                  setShowDescriptionEditor((v) => !v)
                                }
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit description</span>
                              </Button>
                            </div>
                            <div className="rounded-md border px-4 py-3">
                              {showDescriptionEditor ? (
                                <Textarea
                                  placeholder="description for what will be covered this session"
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  rows={4}
                                  className="bg-muted/30"
                                />
                              ) : description?.trim() ? (
                                <div className="max-w-none text-foreground/90">
                                  <ReactMarkdown
                                    components={{
                                      ul: ({ node, ...props }) => (
                                        <ul className="list-disc ml-6 my-2 space-y-1" {...props} />
                                      ),
                                      ol: ({ node, ...props }) => (
                                        <ol className="list-decimal ml-6 my-2 space-y-1" {...props} />
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
                                      code: ({ node, className, children, ...props }) => (
                                        <code
                                          className={`bg-muted px-1.5 py-0.5 rounded text-[0.9em] ${className || ""}`}
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
                                    {description}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No description yet.
                                </div>
                              )}
                            </div>
                          </FieldContent>
                        </Field>

                        <Field>
                          <FieldContent>
                            <div className="text-base font-semibold mb-2">
                              Upload session documents
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.jpeg,.jpg,.png,.xlsx,.xls"
                                onChange={(e) =>
                                  setSelectedFile(e.target.files?.[0] || null)
                                }
                                className="bg-muted/30 w-auto file:mr-3 file:bg-primary/10 file:text-primary px-0 file:px-2 file:h-full p-0 file:font-medium file:hover:bg-primary/15 file:cursor-pointer"
                              />
                              <Button
                                type="button"
                                disabled={!selectedFile || uploading}
                                onClick={onUploadContent}
                                className="shrink-0"
                              >
                                {uploading ? "Uploading..." : "Upload"}
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0 mb-6">
                              You can upload PDF, DOCX, TXT, JPEG, XLSX (max
                              50MB).
                            </div>
                            <div className="text-base font-semibold mb-2">
                              Uploaded documents
                            </div>
                            {/* Uploaded content list */}
                            <div className="mt-2">
                              {sortedContent.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                  No uploaded documents yet.
                                </div>
                              ) : (
                                <div className="divide-y rounded-md border bg-muted/30">
                                  {sortedContent.map((c) => {
                                    const href = c.link || c.file || undefined;
                                    return (
                                      <div
                                        key={c.id}
                                        className="flex items-center justify-between gap-3 p-3"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                          <div className="min-w-0">
                                            <div className="truncate font-medium text-sm">
                                              {c.title ||
                                                (c.file
                                                  ? c.file.split("/").pop()
                                                  : "Untitled")}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Uploaded{" "}
                                              {new Date(
                                                c.created_at
                                              ).toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="inline-flex items-center gap-1 shrink-0">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                aria-label="More options"
                                              >
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {href && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    window.open(
                                                      href,
                                                      "_blank",
                                                      "noopener,noreferrer"
                                                    )
                                                  }
                                                >
                                                  View
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                  setConfirmDeleteContentId(
                                                    c.id
                                                  )
                                                }
                                              >
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </FieldContent>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assignments">
              <div className="grid grid-cols-1 gap-6">
                <Card className="overflow-hidden gap-0 border-none shadow-none p-6">
                  <CardHeader className="pb-0 flex items-center justify-between">
                    <CardTitle className="text-lg">Assignments</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        showAssignmentForm
                          ? onCancelAssignment()
                          : setShowAssignmentForm(true)
                      }
                      className={
                        showAssignmentForm ? "" : "border-primary text-primary"
                      }
                    >
                      {showAssignmentForm ? (
                        "Cancel"
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Plus className="h-4 w-4" />
                          <span>Add assignment</span>
                        </span>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-4">
                    <div
                      className={
                        "overflow-hidden transition-all duration-300 ease-in-out " +
                        (showAssignmentForm ? "max-h-[700px]" : "max-h-0")
                      }
                    >
                      <div
                        className={
                          "transition-all duration-300 " +
                          (showAssignmentForm
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-1")
                        }
                      >
                        <div>
                          <FieldSet>
                            <FieldGroup className="flex flex-col gap-6 pb-3">
                              <Field>
                                <FieldTitle>Title</FieldTitle>
                                <FieldContent>
                                  <Input
                                    value={assignmentTitle}
                                    onChange={(e) =>
                                      setAssignmentTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.preventDefault();
                                    }}
                                    placeholder="Assignment title"
                                    className="w-auto"
                                  />
                                </FieldContent>
                              </Field>
                              <Field>
                                <FieldTitle>Description</FieldTitle>
                                <FieldContent>
                                  <Textarea
                                    value={assignmentDescription}
                                    onChange={(e) =>
                                      setAssignmentDescription(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.preventDefault();
                                    }}
                                    placeholder="Optional description"
                                    rows={3}
                                  />
                                </FieldContent>
                              </Field>
                              {sessionId === 5 && (
                                <Field>
                                  <FieldTitle>Type</FieldTitle>
                                  <FieldContent>
                                    <Select
                                      value={assignmentType}
                                      onValueChange={setAssignmentType}
                                    >
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Individual">
                                          Individual
                                        </SelectItem>
                                        <SelectItem value="Group">
                                          Group
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FieldContent>
                                </Field>
                              )}
                              <Field>
                                <FieldTitle>Due date</FieldTitle>
                                <FieldContent>
                                  <div className="flex gap-4">
                                    <div className="flex flex-col gap-2">
                                      <Label
                                        htmlFor="assignment-date"
                                        className="px-1 text-xs"
                                      >
                                        Date
                                      </Label>
                                      <Popover
                                        open={calendarOpen}
                                        onOpenChange={setCalendarOpen}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            id="assignment-date"
                                            className="w-32 justify-between font-normal"
                                            type="button"
                                          >
                                            {assignmentDueDate
                                              ? assignmentDueDate.toLocaleDateString()
                                              : "Select date"}
                                            <ChevronDownIcon className="h-4 w-4" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-auto overflow-hidden p-0"
                                          align="start"
                                        >
                                          <Calendar
                                            mode="single"
                                            selected={assignmentDueDate}
                                            captionLayout="dropdown"
                                            onSelect={(d) => {
                                              setAssignmentDueDate(
                                                d ?? undefined
                                              );
                                              setCalendarOpen(false);
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Label
                                        htmlFor="assignment-time"
                                        className="px-1 text-xs"
                                      >
                                        Time
                                      </Label>
                                      <Input
                                        type="time"
                                        id="assignment-time"
                                        step="1"
                                        value={assignmentDueTime}
                                        onChange={(e) =>
                                          setAssignmentDueTime(e.target.value)
                                        }
                                        className="bg-background w-auto appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                      />
                                    </div>
                                  </div>
                                </FieldContent>
                              </Field>
                              <Field>
                                <FieldTitle>Link</FieldTitle>
                                <FieldContent>
                                  <Input
                                    type="url"
                                    className="w-auto"
                                    placeholder="https://..."
                                    value={assignmentLink}
                                    onChange={(e) =>
                                      setAssignmentLink(e.target.value)
                                    }
                                  />
                                </FieldContent>
                              </Field>
                            </FieldGroup>
                          </FieldSet>
                          <div className="flex gap-3 pb-3">
                            <Button
                              type="button"
                              onClick={() => onCreateAssignment()}
                              disabled={creatingAssignment}
                            >
                              {creatingAssignment
                                ? editingAssignment
                                  ? "Updating..."
                                  : "Adding..."
                                : editingAssignment
                                ? "Update"
                                : "Add"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={onCancelAssignment}
                            >
                              Cancel
                            </Button>
                          </div>
                          <Separator />
                        </div>
                      </div>
                    </div>

                    <div>
                      {(session.assignments?.length ?? 0) === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No assignments yet.
                        </div>
                      ) : (
                        <table className="w-full border-collapse text-sm md:text-base">
                          <tbody>
                            {(session.assignments ?? [])
                              .slice()
                              .sort((a, b) => {
                                const at = a.due_date
                                  ? new Date(a.due_date).getTime()
                                  : 0;
                                const bt = b.due_date
                                  ? new Date(b.due_date).getTime()
                                  : 0;
                                return at - bt;
                              })
                              .map((a) => (
                                <tr
                                  key={a.id}
                                  className="group border-b-1 border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors"
                                >
                                  <td className="px-2 md:px-4 py-3 whitespace-nowrap">
                                    <div className="font-medium">{a.title}</div>
                                  </td>
                                  <td className="px-2 md:px-4 py-3 whitespace-nowrap text-muted-foreground">
                                    {a.due_date
                                      ? new Date(a.due_date).toLocaleString()
                                      : "No due"}
                                  </td>
                                  <td className="px-2 md:px-4 py-3 whitespace-nowrap text-muted-foreground">
                                    {a.type || "NOT_GRADED"}
                                  </td>
                                  <td className="px-2 md:px-4 py-3 text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => onEditAssignment(a)}
                                        >
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() =>
                                            setConfirmDeleteAssignment(a)
                                          }
                                        >
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
        {/* Sticky save button bottom-right */}
        <div className="fixed bottom-6 right-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Confirm delete document dialog */}
      <Dialog
        open={confirmDeleteContentId != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteContentId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The document will be permanently
              removed from this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteContentId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingContent}
              onClick={handleConfirmDeleteContent}
            >
              {deletingContent ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete assignment dialog */}
      <Dialog
        open={confirmDeleteAssignment != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteAssignment(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete assignment?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The assignment and its details will
              be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteAssignment(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAssignment}
              onClick={handleConfirmDeleteAssignment}
            >
              {deletingAssignment ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
