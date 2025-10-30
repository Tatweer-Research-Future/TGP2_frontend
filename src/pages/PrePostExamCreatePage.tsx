import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getPortalTracks,
  type PortalTrack,
  createModuleTest,
  type CreateModuleTestPayload,
  type ModuleTestKind,
} from "@/lib/api";
import { toast } from "sonner";

type ModuleOption = {
  id: number;
  label: string;
  trackName: string;
  order: number;
};

type DraftChoice = { text: string; is_correct: boolean };
type DraftQuestion = {
  title: string;
  text: string;
  imageFile: File | null;
  choices: DraftChoice[];
};

export default function PrePostExamCreatePage() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<PortalTrack[] | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);

  const [moduleId, setModuleId] = useState<string>("");
  const [kind, setKind] = useState<ModuleTestKind>("PRE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishAt, setPublishAt] = useState<string>(""); // datetime-local
  const [expireAt, setExpireAt] = useState<string>(""); // datetime-local
  const [isDisabled, setIsDisabled] = useState(false);

  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPortalTracks().then((resp) => {
      if (!mounted) return;
      setTracks(resp.results);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!tracks) return;
    const opts: ModuleOption[] = [];
    for (const t of tracks) {
      for (const m of t.modules) {
        const label = `${t.name} – Week ${m.order}${
          m.title ? `: ${m.title}` : ""
        }`;
        opts.push({ id: m.id, label, trackName: t.name, order: m.order });
      }
    }
    opts.sort(
      (a, b) => a.trackName.localeCompare(b.trackName) || a.order - b.order
    );
    setModules(opts);
  }, [tracks]);

  const moduleLabel = useMemo(() => {
    const idNum = Number(moduleId);
    return modules.find((m) => m.id === idNum)?.label || "";
  }, [modules, moduleId]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        title: "",
        text: "",
        imageFile: null,
        choices: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
        ],
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(
    index: number,
    updater: (q: DraftQuestion) => DraftQuestion
  ) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updater(q) : q)));
  }

  function addChoice(qi: number) {
    updateQuestion(qi, (q) => ({
      ...q,
      choices: [...q.choices, { text: "", is_correct: false }],
    }));
  }

  function removeChoice(qi: number, ci: number) {
    updateQuestion(qi, (q) => ({
      ...q,
      choices: q.choices.filter((_, i) => i !== ci),
    }));
  }

  function setChoiceText(qi: number, ci: number, text: string) {
    updateQuestion(qi, (q) => ({
      ...q,
      choices: q.choices.map((c, i) => (i === ci ? { ...c, text } : c)),
    }));
  }

  function setChoiceCorrect(qi: number, ci: number) {
    updateQuestion(qi, (q) => ({
      ...q,
      choices: q.choices.map((c, i) => ({ ...c, is_correct: i === ci })),
    }));
  }

  function setQuestionImage(qi: number, file: File | null) {
    updateQuestion(qi, (q) => ({ ...q, imageFile: file }));
  }

  function validate(): string | null {
    if (!moduleId) return "Please select a week.";
    if (!title.trim()) return "Please enter a title.";
    if (publishAt && expireAt && new Date(publishAt) >= new Date(expireAt)) {
      return "Publish time must be before expire time.";
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) return `Question ${i + 1}: title is required.`;
      if (q.choices.length < 2)
        return `Question ${i + 1}: at least two choices required.`;
      const correctCount = q.choices.filter((c) => c.is_correct).length;
      if (correctCount !== 1)
        return `Question ${i + 1}: exactly one correct choice required.`;
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].text.trim())
          return `Question ${i + 1}, choice ${j + 1}: text is required.`;
      }
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const payload: CreateModuleTestPayload = {
      module: Number(moduleId),
      kind,
      title: title.trim(),
      description: description || undefined,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      expire_at: expireAt ? new Date(expireAt).toISOString() : null,
      is_disabled: isDisabled || undefined,
      questions: questions.length
        ? questions.map((q, idx) => ({
            title: q.title.trim(),
            text: q.text || null,
            order: idx + 1,
            choices: q.choices.map((c) => ({
              text: c.text.trim(),
              is_correct: c.is_correct,
            })),
            image_file: q.imageFile || undefined,
          }))
        : undefined,
    };
    setSubmitting(true);
    try {
      await createModuleTest(payload);
      toast.success("Test created successfully.");
      navigate("/pre-post-exams");
    } catch (error: any) {
      const message =
        error?.data && typeof error.data === "object"
          ? error.data.detail || JSON.stringify(error.data)
          : error?.message || "Failed to create test.";
      toast.error(String(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between" />

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>
              Fill in the basic information for the test.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Week</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {moduleId && (
                <p className="text-xs text-muted-foreground">
                  Selected: {moduleLabel}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as ModuleTestKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRE">PRE</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 1 Pre-test"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>Publish at</Label>
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expire at</Label>
              <Input
                type="datetime-local"
                value={expireAt}
                onChange={(e) => setExpireAt(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="disabled"
                checked={isDisabled}
                onCheckedChange={(v) => setIsDisabled(Boolean(v))}
              />
              <Label htmlFor="disabled">Disabled</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions (optional)</CardTitle>
                <CardDescription>
                  Add multiple choice questions; each must have exactly one
                  correct choice.
                </CardDescription>
              </div>
              <Button type="button" onClick={addQuestion} variant="secondary">
                + Add question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No questions added yet.
              </p>
            )}
            {questions.map((q, qi) => (
              <Card key={qi}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Question {qi + 1} title</Label>
                      <Input
                        value={q.title}
                        onChange={(e) =>
                          updateQuestion(qi, (prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeQuestion(qi)}
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Text (optional)</Label>
                    <Textarea
                      value={q.text}
                      onChange={(e) =>
                        updateQuestion(qi, (prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image (optional)</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input
                        type="file"
                        accept=".jpeg,.jpg,.png,.webp,.gif"
                        onChange={(e) =>
                          setQuestionImage(qi, e.target.files?.[0] || null)
                        }
                        className="bg-muted/30 w-auto file:mr-3 file:bg-primary/10 file:text-primary px-0 file:px-2 file:h-full p-0 file:font-medium file:hover:bg-primary/15 file:cursor-pointer"
                      />
                      {q.imageFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setQuestionImage(qi, null)}
                        >
                          Remove image
                        </Button>
                      )}
                    </div>
                    {q.imageFile && (
                      <div className="text-xs text-muted-foreground">
                        Selected: {q.imageFile.name}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Choices</Label>
                    <div className="space-y-3">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-3">
                          <input
                            aria-label="Correct"
                            type="radio"
                            name={`q-${qi}-correct`}
                            checked={c.is_correct}
                            onChange={() => setChoiceCorrect(qi, ci)}
                          />
                          <Input
                            value={c.text}
                            onChange={(e) =>
                              setChoiceText(qi, ci, e.target.value)
                            }
                            placeholder={`Choice ${ci + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeChoice(qi, ci)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => addChoice(qi)}
                      >
                        + Add choice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardFooter className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link to="/pre-post-exams">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || !moduleId || !title.trim()}
            >
              {submitting ? "Creating…" : "Create Test"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
