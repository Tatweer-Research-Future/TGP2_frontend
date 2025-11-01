import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
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
  type ModuleTestDetail,
  type ModuleTestListItem,
  type PortalModule,
} from "@/lib/api";

export default function ModulePrePostExamViewPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<ModuleTestDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
                          const isCorrect = Boolean((c as any).is_correct);
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
