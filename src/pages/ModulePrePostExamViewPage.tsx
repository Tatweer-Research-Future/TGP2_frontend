import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getModuleTestById,
  getModuleTests,
  getPortalModules,
  deleteModuleTest,
  updateModuleTest,
  type ModuleTestDetail,
  type ModuleTestListItem,
  type ModuleTestQuestion,
  type PortalModule,
} from "@/lib/api";
import { toast } from "sonner";

type EditableChoice = {
  id?: number;
  text: string;
  is_correct: boolean;
};

type EditableQuestion = {
  id: number;
  order: number;
  title: string;
  text: string;
  choices: EditableChoice[];
};

const MIN_CHOICES = 2;

export default function ModulePrePostExamViewPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<ModuleTestDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EditableQuestion | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const moduleIdNum = useMemo(
    () => (moduleId ? Number(moduleId) : null),
    [moduleId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!moduleIdNum) return;
      try {
        setIsLoading(true);
        // 1) Prefer testId from navigation state
        const testIdFromState = (location as any)?.state?.testId as
          | number
          | undefined;
        let detail: ModuleTestDetail | null = null;
        if (testIdFromState) {
          detail = await getModuleTestById(testIdFromState);
        } else {
          // 2) Try to get module test id from modules listing
          try {
            const modulesResp = await getPortalModules();
            const mod = (modulesResp.results || []).find(
              (m: PortalModule) => m.id === moduleIdNum
            );
            if (mod?.test?.id) {
              detail = await getModuleTestById(mod.test.id);
            }
          } catch (_) {
            // ignore and fallback below
          }
          // 3) Fallback: list tests by module and pick first
          if (!detail) {
            const tests: ModuleTestListItem[] = await getModuleTests({
              module: moduleIdNum,
            });
            if (!tests || tests.length === 0) {
              if (!cancelled) setError("No exam found for this module");
              return;
            }
            detail = await getModuleTestById(tests[0].id);
          }
        }
        if (!cancelled) setTest(detail);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load exam");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [moduleIdNum, location]);

  async function handleDelete() {
    if (!test) return;
    try {
      setIsDeleting(true);
      await deleteModuleTest(test.id);
      setConfirmDeleteOpen(false);
      navigate("/modules");
    } catch (e: any) {
      setError(e?.message || "Failed to delete exam");
      setIsDeleting(false);
    }
  }

  function buildEditableQuestion(question: ModuleTestQuestion): EditableQuestion {
    const choices = question.choices.map((choice) => ({
      id: choice.id,
      text: choice.text ?? "",
      is_correct: Boolean(choice.is_correct),
    }));
    if (!choices.some((choice) => choice.is_correct) && choices.length > 0) {
      choices[0] = { ...choices[0], is_correct: true };
    }
    return {
      id: question.id,
      order: question.order,
      title: question.title,
      text: question.text ?? "",
      choices,
    };
  }

  function mutateEditingQuestion(
    updater: (prev: EditableQuestion) => EditableQuestion
  ) {
    setEditingQuestion((prev) => (prev ? updater(prev) : prev));
  }

  function startEditingQuestion(question: ModuleTestQuestion) {
    setEditingQuestion(buildEditableQuestion(question));
  }

  function cancelEditingQuestion() {
    if (isSavingQuestion) return;
    setEditingQuestion(null);
  }

  function addChoiceToEditing() {
    mutateEditingQuestion((prev) => ({
      ...prev,
      choices: [
        ...prev.choices,
        { text: "", is_correct: prev.choices.length === 0 },
      ],
    }));
  }

  function setChoiceText(index: number, value: string) {
    mutateEditingQuestion((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, i) =>
        i === index ? { ...choice, text: value } : choice
      ),
    }));
  }

  function markChoiceAsCorrect(index: number) {
    mutateEditingQuestion((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, i) => ({
        ...choice,
        is_correct: i === index,
      })),
    }));
  }

  function removeChoiceFromEditing(index: number) {
    mutateEditingQuestion((prev) => {
      if (prev.choices.length <= MIN_CHOICES) return prev;
      const newChoices = prev.choices
        .filter((_, i) => i !== index)
        .map((choice) => ({ ...choice }));
      if (!newChoices.some((choice) => choice.is_correct) && newChoices.length) {
        newChoices[0].is_correct = true;
      }
      return {
        ...prev,
        choices: newChoices,
      };
    });
  }

  function validateEditableQuestion(question: EditableQuestion): string | null {
    if (!question.title.trim()) return "Question title is required.";
    if (question.choices.length < MIN_CHOICES)
      return "At least two choices are required.";
    const correctCount = question.choices.filter((c) => c.is_correct).length;
    if (correctCount !== 1)
      return "Please mark exactly one choice as correct.";
    for (let i = 0; i < question.choices.length; i++) {
      if (!question.choices[i].text.trim()) {
        return `Choice ${i + 1} needs text.`;
      }
    }
    return null;
  }

  async function handleSaveEditedQuestion() {
    if (!test || !editingQuestion) return;
    const validationError = validateEditableQuestion(editingQuestion);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSavingQuestion(true);
    try {
      const questionsPayload = (test.questions || []).map((question) => {
        const isTarget = question.id === editingQuestion.id;
        const title = isTarget ? editingQuestion.title : question.title;
        const text = isTarget
          ? editingQuestion.text
          : question.text ?? "";
        const sourceChoices = isTarget
          ? editingQuestion.choices
          : question.choices.map((choice) => ({
              id: choice.id,
              text: choice.text,
              is_correct: Boolean(choice.is_correct),
            }));
        return {
          id: question.id,
          title: title.trim(),
          text: text.trim() ? text.trim() : null,
          order: question.order,
          choices: sourceChoices.map((choice) => ({
            id: choice.id,
            text: choice.text.trim(),
            is_correct: Boolean(choice.is_correct),
          })),
        };
      });

      await updateModuleTest(test.id, { questions: questionsPayload });
      const refreshed = await getModuleTestById(test.id);
      setTest(refreshed);
      toast.success("Question updated");
      setEditingQuestion(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update question");
    } finally {
      setIsSavingQuestion(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/modules")}
          className="h-8 px-2 text-sm"
        >
          Back to track
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && test && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">{test.title}</CardTitle>
                <Badge variant="secondary">PRE</Badge>
                {test.is_active_pre ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                <Badge variant="secondary">POST</Badge>
                {test.is_active_post ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                <Badge variant="secondary">Points: {test.total_points}</Badge>
                <div className="ml-auto">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigate(
                          `/modules/${moduleIdNum}/pre-post-exams/results`,
                          { state: { testId: test.id } }
                        );
                      }}
                    >
                      View Results
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(test.questions || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No questions.
                </div>
              ) : (
                <div className="space-y-6">
                  {test.questions.map((q, qi) => (
                    <div
                      key={q.id}
                      className="rounded-md border p-4 bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{qi + 1}</Badge>
                          <div className="font-medium">{q.title}</div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingQuestion(q)}
                        >
                          Edit
                        </Button>
                      </div>
                      {q.text && (
                        <div className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                          {q.text}
                        </div>
                      )}
                      {q.image && (
                        <div className="mt-3">
                          <img
                            src={q.image}
                            alt="Question"
                            className="max-h-64 rounded-md border"
                          />
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        {q.choices.map((c) => {
                          const isCorrect = Boolean(c.is_correct);
                          return (
                            <div
                              key={c.id}
                              className={
                                "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm " +
                                (isCorrect
                                  ? "bg-green-50 border-green-200 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-200"
                                  : "bg-background")
                              }
                            >
                              <div>{c.text}</div>
                              {isCorrect && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                                >
                                  Correct
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <Dialog
        open={Boolean(editingQuestion)}
        onOpenChange={(open) => {
          if (!open) {
            cancelEditingQuestion();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
            <DialogDescription>
              Update the question text and its answer choices.
            </DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="editing-question-title">Question</Label>
                <Input
                  id="editing-question-title"
                  value={editingQuestion.title}
                  onChange={(e) =>
                    mutateEditingQuestion((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter question prompt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editing-question-text">Additional text</Label>
                <Textarea
                  id="editing-question-text"
                  value={editingQuestion.text}
                  onChange={(e) =>
                    mutateEditingQuestion((prev) => ({
                      ...prev,
                      text: e.target.value,
                    }))
                  }
                  placeholder="Optional details or scenario"
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <Label>Answer choices</Label>
                <div className="space-y-3">
                  {editingQuestion.choices.map((choice, index) => (
                    <div
                      key={`choice-${choice.id ?? index}`}
                      className="rounded-md border p-3 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {String.fromCharCode(65 + index)}
                        </Badge>
                        <Input
                          value={choice.text}
                          onChange={(e) => setChoiceText(index, e.target.value)}
                          placeholder={`Choice ${index + 1}`}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <Button
                          type="button"
                          size="sm"
                          variant={choice.is_correct ? "default" : "outline"}
                          onClick={() => markChoiceAsCorrect(index)}
                        >
                          {choice.is_correct ? "Correct answer" : "Mark correct"}
                        </Button>
                        {editingQuestion.choices.length > MIN_CHOICES && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeChoiceFromEditing(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChoiceToEditing}
                    className="w-full"
                  >
                    Add choice
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={cancelEditingQuestion}
              disabled={isSavingQuestion}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditedQuestion}
              disabled={isSavingQuestion}
            >
              {isSavingQuestion ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirm delete exam dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete exam?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The exam will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
