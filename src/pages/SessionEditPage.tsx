import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
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

  // Content upload
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState<string>("");

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
        start_time: session?.start_time ?? null,
        end_time: session?.end_time ?? null,
      });
      setSession(updated);
      toast.success("Session saved");
      if (!title) {
        // keep placeholder behavior
        setTitle("");
      }
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
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm uppercase tracking-wider text-primary/80 mb-1">
            {session?.title || "Session"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Edit Session</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && session && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="overflow-hidden gap-0 border-none shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={onSaveSession} className="space-y-6">
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldTitle>Title</FieldTitle>
                      <FieldContent>
                        <Input
                          placeholder={session.title}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                        <FieldDescription>
                          Leave empty to keep original title.
                        </FieldDescription>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldTitle>Description</FieldTitle>
                      <FieldContent>
                        <Textarea
                          placeholder="description for what will be covered this session"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                        />
                      </FieldContent>
                    </Field>

                    <FieldSeparator>Lecture Content</FieldSeparator>
                    <Field>
                      <FieldTitle>Upload file</FieldTitle>
                      <FieldContent>
                        <Input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                        />
                        <Input
                          placeholder="Optional file title"
                          className="mt-2"
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

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Session"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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
                            onChange={(e) => setAssignmentTitle(e.target.value)}
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
                            onChange={(e) => setAssignmentDue(e.target.value)}
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
                {(session.assignments ?? []).map((a: PortalAssignment) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
