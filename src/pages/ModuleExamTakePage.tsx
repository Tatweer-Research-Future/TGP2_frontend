import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import {
  getPortalModules,
  getModuleTests,
  getModuleTestById,
  submitModuleTest,
  type ModuleTestDetail,
  type PortalModule,
} from "@/lib/api";
import { useUserGroups } from "@/hooks/useUserGroups";

type ExamKind = "PRE" | "POST";

export default function ModuleExamTakePage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { id: moduleIdParam } = useParams();

  const { groups } = useUserGroups();
  const trackTitle = useMemo(() => {
    const g = (groups || []).map((x) => x.trim());
    const arrow = g.find((x) => x.includes("->"));
    if (arrow) return arrow.split("->").pop()!.trim();
    const generic = [
      "trainee",
      "candidate",
      "instructor",
      "staff",
      "support",
      "attendance_tracker",
    ];
    const domain = g.find((x) => !generic.some((k) => x.toLowerCase().includes(k)));
    return domain || "My Track";
  }, [groups]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleObj, setModuleObj] = useState<PortalModule | null>(null);
  const [testDetail, setTestDetail] = useState<ModuleTestDetail | null>(null);
  const [selectedKind, setSelectedKind] = useState<ExamKind | null>(null);

  const [started, setStarted] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(600);
  const timerRef = useRef<number | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const moduleIdNum = useMemo(() => (moduleIdParam ? Number(moduleIdParam) : null), [moduleIdParam]);

  // Load module and test detail
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!moduleIdNum) return;
      try {
        setIsLoading(true);
        setError(null);

        // Try to get module (for week/order and embedded test id)
        let mod: PortalModule | null = null;
        try {
          const modulesResp = await getPortalModules();
          mod = (modulesResp.results || []).find((m) => m.id === moduleIdNum) ?? null;
        } catch (_) {}
        if (mod) setModuleObj(mod);

        let testId: number | null = mod?.test?.id ?? null;
        if (!testId) {
          // fallback: list tests by module and pick first
          const list = await getModuleTests({ module: moduleIdNum });
          if (list && list.length > 0) testId = list[0].id;
        }
        if (!testId) {
          if (!cancelled) setError("No exam found for this module.");
          return;
        }
        const detail = await getModuleTestById(testId);
        if (cancelled) return;
        setTestDetail(detail);

        // Determine selected kind: prefer navigation state, else infer from flags
        const stateKind = location?.state?.kind as ExamKind | undefined;
        let kind: ExamKind | null = stateKind ?? null;
        if (!kind) {
          if (detail.is_active_pre) kind = "PRE";
          else if (detail.is_active_post) kind = "POST";
          else kind = null;
        }
        setSelectedKind(kind);
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

  // Timer effect
  useEffect(() => {
    if (!started) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setTimeLeftSec(600);
    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          timerRef.current = null;
          // Auto submit on expiry
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const totalQuestions = testDetail?.questions?.length ?? 0;
  const answeredCount = useMemo(
    () => Object.keys(selectedChoices).length,
    [selectedChoices]
  );

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function onSelect(questionId: number, choiceId: number) {
    setSelectedChoices((prev) => ({ ...prev, [questionId]: choiceId }));
  }

  function canStart(): boolean {
    if (!testDetail || !selectedKind) return false;
    if (selectedKind === "PRE" && testDetail.has_submitted_pre) return false;
    if (selectedKind === "POST" && testDetail.has_submitted_post) return false;
    if (selectedKind === "PRE" && !testDetail.is_active_pre) return false;
    if (selectedKind === "POST" && !testDetail.is_active_post) return false;
    return true;
  }

  async function handleSubmit(isAuto = false) {
    if (!testDetail || !selectedKind) return;
    if (!isAuto && answeredCount < totalQuestions) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    // Build ordered choice_ids by question order
    const ordered = [...(testDetail.questions || [])].sort((a, b) => a.order - b.order);
    const choiceIds: number[] = [];
    for (const q of ordered) {
      const cid = selectedChoices[q.id];
      if (!cid) {
        if (!isAuto) {
          toast.error("Please answer all questions before submitting.");
          return;
        }
      } else {
        choiceIds.push(cid);
      }
    }
    try {
      setSubmitting(true);
      await submitModuleTest(testDetail.id, { kind: selectedKind, choice_ids: choiceIds });
      toast.success("Exam submitted successfully.");
      navigate("/modules");
    } catch (e: any) {
      const msg =
        e?.data && typeof e.data === "object"
          ? (e.data.detail || JSON.stringify(e.data))
          : e?.message || "Failed to submit exam.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  const weekLabel = useMemo(() => {
    if (!moduleObj) return "";
    return `Week ${moduleObj.order}${moduleObj.title ? `: ${moduleObj.title}` : ""}`;
  }, [moduleObj]);

  const alreadySubmitted = useMemo(() => {
    if (!testDetail || !selectedKind) return false;
    return selectedKind === "PRE"
      ? Boolean(testDetail.has_submitted_pre)
      : Boolean(testDetail.has_submitted_post);
  }, [testDetail, selectedKind]);

  const isInactive = useMemo(() => {
    if (!testDetail || !selectedKind) return true;
    return selectedKind === "PRE" ? !testDetail.is_active_pre : !testDetail.is_active_post;
  }, [testDetail, selectedKind]);

  return (
    <div className="px-4 md:px-8 py-6">
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && !isLoading && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && testDetail && (
        <div className="max-w-4xl mx-auto">
          {/* Sticky header with title and timer */}
          <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-lg md:text-xl font-semibold">
                {testDetail.title}
              </CardTitle>
              {selectedKind && (
                <Badge variant="secondary">{selectedKind === "PRE" ? "Pre-Exam" : "Post-Exam"}</Badge>
              )}
              {weekLabel && <Badge variant="outline">{weekLabel}</Badge>}
              {trackTitle && <Badge variant="outline">{trackTitle}</Badge>}
              <div className="ml-auto flex items-center gap-2">
                {started ? (
                  <Badge className={timeLeftSec <= 60 ? "bg-destructive text-destructive-foreground" : ""}>
                    {formatTime(timeLeftSec)}
                  </Badge>
                ) : (
                  <Badge variant="outline">10:00</Badge>
                )}
                <Badge variant="secondary">
                  {answeredCount}/{totalQuestions} answered
                </Badge>
              </div>
            </div>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <div className="text-sm text-muted-foreground">
                Please answer each question exactly once. You have 10 minutes to complete the exam.
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!started && (
                <div className="flex flex-col items-center justify-center py-12">
                  {alreadySubmitted && (
                    <div className="mb-4 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2 text-sm">
                      You have already submitted this {selectedKind === "PRE" ? "Pre" : "Post"} exam.
                    </div>
                  )}
                  {isInactive && (
                    <div className="mb-4 text-muted-foreground text-sm">
                      This exam is not currently active.
                    </div>
                  )}
                  <Button
                    size="lg"
                    className="min-w-[180px]"
                    disabled={!canStart()}
                    onClick={() => setStarted(true)}
                  >
                    Take Exam
                  </Button>
                </div>
              )}

              {started && (
                <div className="space-y-6">
                  {testDetail.questions.map((q, idx) => (
                    <div key={q.id} className="rounded-md border p-4 bg-muted/20">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline">Q{idx + 1}</Badge>
                        <div className="font-medium flex-1">{q.title}</div>
                      </div>
                      {q.text && (
                        <div className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                          {q.text}
                        </div>
                      )}
                      {q.image && (
                        <div className="mt-3">
                          <img src={q.image} alt="Question" className="max-h-64 rounded-md border" />
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        {q.choices.map((c) => (
                          <label
                            key={c.id}
                            className={
                              "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer bg-background hover:bg-muted/40 " +
                              (selectedChoices[q.id] === c.id ? "ring-1 ring-primary" : "")
                            }
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={c.id}
                              checked={selectedChoices[q.id] === c.id}
                              onChange={() => onSelect(q.id, c.id)}
                              className="w-4 h-4"
                            />
                            <span>{c.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      disabled={submitting || answeredCount < totalQuestions}
                      onClick={() => handleSubmit(false)}
                      className="min-w-[160px]"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


