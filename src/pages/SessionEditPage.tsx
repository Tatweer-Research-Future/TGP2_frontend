import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import { Pencil, UploadCloud } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getPortalSession,
  updatePortalSession,
  uploadPortalSessionContentFile,
  type PortalSession,
  type PortalAssignment,
  createPortalAssignment,
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
  const [creatingAssignment, setCreatingAssignment] = useState(false);

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
          setShowDescriptionEditor(
            Boolean(data.description && data.description.length > 0)
          );
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
      setSession(updated);
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

  async function onCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !assignmentTitle.trim()) return;
    try {
      setCreatingAssignment(true);
      const payload = {
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim() || null,
        due_date: assignmentDue ? new Date(assignmentDue).toISOString() : null,
      };
      await createPortalAssignment(sessionId, payload);
      const refreshed = await getPortalSession(String(sessionId));
      setSession(refreshed);
      setShowAssignmentForm(false);
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDue("");
      toast.success("Assignment added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add assignment");
    } finally {
      setCreatingAssignment(false);
    }
  }

  return (
    <div className="">
      <form onSubmit={onSaveSession}>
        <div className="flex items-start justify-between mb-6">
          <div className="w-full px-8">
            {isEditingTitle ? (
              <Input
                placeholder={session?.title}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl md:text-4xl font-bold h-auto py-2 shadow-none outline-none focus:outline-none focus:ring-0 px-3 border-b"
              />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold">
                {title.trim() || session?.title || "Session"}
              </h1>
            )}
            {dateRange && (
              <div className="text-sm text-muted-foreground mt-1">
                {dateRange}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsEditingTitle((v) => {
                const next = !v;
                if (next) {
                  setTitle((prev) =>
                    prev && prev.trim().length > 0 ? prev : session?.title ?? ""
                  );
                }
                return next;
              });
            }}
            className="rounded-full"
            aria-label="Edit title"
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader />
          </div>
        )}
        {error && <div className="text-destructive">{error}</div>}

        {!isLoading && !error && session && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Session details</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 gap-6">
                <Card className="overflow-hidden gap-0 border-none shadow-none">
                  <CardContent className="pt-2 space-y-6">
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldTitle>Description</FieldTitle>
                          <FieldContent>
                            {showDescriptionEditor ? (
                              <Textarea
                                placeholder="description for what will be covered this session"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                              />
                            ) : (
                              <Button
                                type="button"
                                variant="link"
                                className="text-primary px-0 h-auto"
                                onClick={() => setShowDescriptionEditor(true)}
                              >
                                + add description
                              </Button>
                            )}
                          </FieldContent>
                        </Field>

                        <FieldSeparator>
                          Upload lecture documents
                        </FieldSeparator>
                        <Field>
                          <FieldTitle>Upload lecture documents</FieldTitle>
                          <FieldContent>
                            <div
                              onDrop={handleDrop}
                              onDragOver={handleDragOver}
                              className="flex flex-col items-center justify-center border border-dashed rounded-md py-10 px-4 text-center bg-muted/30"
                            >
                              <UploadCloud className="h-8 w-8 text-muted-foreground" />
                              <div className="mt-3 font-medium">
                                Choose a file or drag & drop it here.
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                txt, docx, pdf, jpeg, xlsx - Up to 50MB
                              </div>
                              <div className="mt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleBrowseFiles}
                                >
                                  Browse files
                                </Button>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    setSelectedFile(e.target.files?.[0] || null)
                                  }
                                />
                              </div>
                              {selectedFile && (
                                <div className="text-sm mt-3">
                                  Selected: {selectedFile.name}
                                </div>
                              )}
                            </div>

                            <Input
                              placeholder="Optional title"
                              className="mt-3"
                              value={fileTitle}
                              onChange={(e) => setFileTitle(e.target.value)}
                            />

                            <div className="mt-3">
                              <Button
                                type="button"
                                disabled={!selectedFile || uploading}
                                onClick={onUploadContent}
                              >
                                {uploading ? "Uploading..." : "Upload"}
                              </Button>
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
                <Card className="overflow-hidden gap-0 border-none shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg">Assignments</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setShowAssignmentForm((v) => !v)}
                      >
                        {showAssignmentForm ? "Cancel" : "Add assignment"}
                      </Button>
                    </div>

                    {showAssignmentForm && (
                      <form onSubmit={onCreateAssignment} className="space-y-4">
                        <FieldSet>
                          <FieldGroup>
                            <Field>
                              <FieldTitle>Title</FieldTitle>
                              <FieldContent>
                                <Input
                                  value={assignmentTitle}
                                  onChange={(e) =>
                                    setAssignmentTitle(e.target.value)
                                  }
                                  placeholder="Assignment title"
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
                                  placeholder="Optional description"
                                  rows={3}
                                />
                              </FieldContent>
                            </Field>
                            <Field>
                              <FieldTitle>Due date</FieldTitle>
                              <FieldContent>
                                <Input
                                  type="datetime-local"
                                  value={assignmentDue}
                                  onChange={(e) =>
                                    setAssignmentDue(e.target.value)
                                  }
                                />
                              </FieldContent>
                            </Field>
                          </FieldGroup>
                        </FieldSet>
                        <div className="flex gap-3">
                          <Button type="submit" disabled={creatingAssignment}>
                            {creatingAssignment ? "Adding..." : "Add"}
                          </Button>
                        </div>
                      </form>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      {(session.assignments?.length ?? 0) === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No assignments yet.
                        </div>
                      )}
                      {(session.assignments ?? []).map(
                        (a: PortalAssignment) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="text-sm">
                              <div className="font-medium">{a.title}</div>
                              <div className="text-muted-foreground">
                                {a.due_date
                                  ? new Date(a.due_date).toLocaleString()
                                  : "No due"}
                              </div>
                            </div>
                            {/* Future: add edit/delete */}
                          </div>
                        )
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
    </div>
  );
}
