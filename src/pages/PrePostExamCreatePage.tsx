import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  getPortalTracks,
  type PortalTrack,
  createModuleTest,
  type CreateModuleTestPayload,
} from "@/lib/api";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FileQuestion,
  ListPlus,
  Plus,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<PortalTrack[] | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);

  const params = useParams();
  const [moduleId, setModuleId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishAtPre, setPublishAtPre] = useState<string>(""); // datetime-local
  const [expireAtPre, setExpireAtPre] = useState<string>(""); // datetime-local
  const [publishAtPost, setPublishAtPost] = useState<string>(""); // datetime-local
  const [expireAtPost, setExpireAtPost] = useState<string>(""); // datetime-local
  const [isDisabled, setIsDisabled] = useState(false);

  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);

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

  // Prefill module if route param provided
  useEffect(() => {
    const idFromRoute = params.moduleId;
    if (idFromRoute) {
      setModuleId(String(idFromRoute));
    }
  }, [params.moduleId]);

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

  // Auto-prefill publish times to 08:30 for PRE (first session day) and POST (last session day)
  useEffect(() => {
    if (!tracks || !moduleId) return;
    const idNum = Number(moduleId);
    for (const t of tracks) {
      const mod = t.modules.find((m) => m.id === idNum);
      if (!mod) continue;
      const sessionTimes = (mod.sessions || [])
        .map((s) => s.start_time)
        .filter(Boolean) as string[];
      if (sessionTimes.length === 0) return;
      const dates = sessionTimes
        .map((iso) => new Date(iso))
        .sort((a, b) => a.getTime() - b.getTime());
      const first = new Date(dates[0]);
      const last = new Date(dates[dates.length - 1]);
      const set0830 = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(8, 30, 0, 0);
        // Convert to yyyy-MM-ddTHH:mm for datetime-local
        const pad = (n: number) => `${n}`.padStart(2, "0");
        const yyyy = copy.getFullYear();
        const mm = pad(copy.getMonth() + 1);
        const dd = pad(copy.getDate());
        const hh = pad(copy.getHours());
        const min = pad(copy.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      };
      // Only prefill if empty so user edits are preserved
      if (!publishAtPre) setPublishAtPre(set0830(first));
      if (!publishAtPost) setPublishAtPost(set0830(last));
      break;
    }
  }, [tracks, moduleId]);

  const updateFloatingAddVisibility = useCallback(() => {
    if (typeof window === "undefined") return;
    const target = addButtonRef.current;
    if (!target) {
      setShowFloatingAdd(false);
      return;
    }
    if (questions.length === 0) {
      setShowFloatingAdd(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const isFullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;
    const scrollTop =
      window.scrollY ??
      document.documentElement.scrollTop ??
      document.body.scrollTop ??
      0;
    const scrolledPastForm = scrollTop > 280;
    setShowFloatingAdd(!isFullyVisible || scrolledPastForm);
  }, [questions.length]);

  // Show floating "Add Question" button when the original is out of view
  useEffect(() => {
    updateFloatingAddVisibility();
    const handleScroll = () => updateFloatingAddVisibility();
    const captureScroll = true;
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, captureScroll);
    window.addEventListener("resize", updateFloatingAddVisibility);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, captureScroll);
      window.removeEventListener("resize", updateFloatingAddVisibility);
      setShowFloatingAdd(false);
    };
  }, [updateFloatingAddVisibility]);

  useEffect(() => {
    updateFloatingAddVisibility();
  }, [questions.length, updateFloatingAddVisibility]);

  const moduleLabel = useMemo(() => {
    const idNum = Number(moduleId);
    return modules.find((m) => m.id === idNum)?.label || "";
  }, [modules, moduleId]);

  const addQuestionLabel = useMemo(() => {
    const label = t("exam.add_question");
    return label.startsWith("+") ? label.replace(/^\+\s*/, "") : label;
  }, [t]);

  const questionsTitle = useMemo(() => {
    const label = t("exam.questions");
    return label.replace(/\s*\(.*optional.*\)/i, "").trim();
  }, [t]);

  const markCorrectLabel = useMemo(() => {
    const label = t("exam.mark_correct", { defaultValue: "Mark as correct" });
    return label === "exam.mark_correct" ? "Mark as correct" : label;
  }, [t]);

  function createQuestionTemplate(choiceCount = 4): DraftQuestion {
    return {
      title: "",
      text: "",
      imageFile: null,
      choices: Array.from({ length: Math.max(choiceCount, 2) }, (_, idx) => ({
        text: "",
        is_correct: idx === 0,
      })),
    };
  }

  function addQuestion(choiceCount = 4) {
    setQuestions((prev) => [...prev, createQuestionTemplate(choiceCount)]);
  }

  function bulkAddQuestions(questionCount = 10, choiceCount = 4) {
    const safeCount = Math.max(questionCount, 1);
    setQuestions((prev) => [
      ...prev,
      ...Array.from({ length: safeCount }, () =>
        createQuestionTemplate(choiceCount)
      ),
    ]);
    toast.success(
      t("exam.bulk_questions_added", {
        defaultValue: `Added ${safeCount} blank questions`,
        count: safeCount,
      })
    );
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
    if (
      publishAtPre &&
      expireAtPre &&
      new Date(publishAtPre) >= new Date(expireAtPre)
    ) {
      return "Pre: publish time must be before expire time.";
    }
    if (
      publishAtPost &&
      expireAtPost &&
      new Date(publishAtPost) >= new Date(expireAtPost)
    ) {
      return "Post: publish time must be before expire time.";
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
      title: title.trim(),
      description: description || undefined,
      publish_at_pre: publishAtPre
        ? new Date(publishAtPre).toISOString()
        : null,
      expire_at_pre: expireAtPre ? new Date(expireAtPre).toISOString() : null,
      publish_at_post: publishAtPost
        ? new Date(publishAtPost).toISOString()
        : null,
      expire_at_post: expireAtPost
        ? new Date(expireAtPost).toISOString()
        : null,
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
      toast.success(t("exam.test_created_success"));
      navigate(`/modules/${moduleId}/pre-post-exams/view`);
    } catch (error: any) {
      const message =
        error?.data && typeof error.data === "object"
          ? error.data.detail || JSON.stringify(error.data)
          : error?.message || t("exam.failed_to_create");
      toast.error(String(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-8 mx-3">
        <div className="flex items-center gap-0 mb-2 ">
          <h1 className="text-2xl font-bold">{t("exam.create_title")}</h1>
        </div>
        {moduleLabel && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("exam.for")}</span>
            <Badge variant="secondary" className="text-sm">
              {moduleLabel}
            </Badge>
          </div>
        )}
        <p className="text-muted-foreground mt-2">
          {t("exam.create_description")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Test Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("exam.test_details")}</CardTitle>
            </div>
            <CardDescription>
              {t("exam.test_details_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="module-display">
                  {t("exam.week")} <span className="text-destructive">*</span>
                </Label>
                <div
                  id="module-display"
                  className="px-3 py-2 rounded-md border bg-muted/30 text-sm"
                >
                  {moduleLabel || t("exam.no_week_selected")}
                </div>
                {moduleId && (
                  <p className="text-xs text-muted-foreground">
                    {t("exam.selected")}: {moduleLabel}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-input">
                  {t("exam.title")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("exam.title_placeholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description-input">{t("exam.description")}</Label>
              <Textarea
                id="description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("exam.description_placeholder")}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="disabled"
                checked={isDisabled}
                onCheckedChange={(v) => setIsDisabled(Boolean(v))}
              />
              <Label htmlFor="disabled">
                {t("exam.disabled_description")}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("exam.schedule_settings")}</CardTitle>
            </div>
            <CardDescription>
              {t("exam.schedule_settings_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* PRE Test Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/40"
                >
                  {t("exam.pre_test")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("exam.pre_test_description")}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-blue-200 dark:border-blue-500/40">
                <DateTimePicker
                  label={t("exam.publish_at")}
                  value={publishAtPre}
                  onChange={setPublishAtPre}
                  placeholder={t("exam.publish_at_pre_placeholder")}
                  description={t("exam.publish_at_pre_description")}
                />
                <DateTimePicker
                  label={t("exam.expire_at")}
                  value={expireAtPre}
                  onChange={setExpireAtPre}
                  placeholder={t("exam.expire_at_pre_placeholder")}
                  description={t("exam.expire_description")}
                />
              </div>
            </div>

            {/* POST Test Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/40"
                >
                  {t("exam.post_test")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("exam.post_test_description")}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-green-200 dark:border-emerald-500/40">
                <DateTimePicker
                  label={t("exam.publish_at")}
                  value={publishAtPost}
                  onChange={setPublishAtPost}
                  placeholder={t("exam.publish_at_post_placeholder")}
                  description={t("exam.publish_at_post_description")}
                />
                <DateTimePicker
                  label={t("exam.expire_at")}
                  value={expireAtPost}
                  onChange={setExpireAtPost}
                  placeholder={t("exam.expire_at_post_placeholder")}
                  description={t("exam.expire_description")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>{questionsTitle}</CardTitle>
                  <CardDescription>
                    {t("exam.questions_description")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => bulkAddQuestions()}
                >
                  <ListPlus className="h-4 w-4" />
                  <span>
                    {t("exam.add_ten_blank", {
                      defaultValue: "Add 10 blanks",
                    })}
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={() => addQuestion()}
                  ref={addButtonRef}
                  variant="outline"
                  size="sm"
                >
                  {addQuestionLabel}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-2">
                  {t("exam.no_questions")}
                </p>
              </div>
            )}

            {questions.map((q, qi) => (
              <Card
                key={qi}
                className="border-l-4 gap-3 border-l-primary/20 dark:border-l-primary/40"
              >
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Q{qi + 1}
                      </Badge>
                      <span className="font-medium text-sm text-muted-foreground">
                        {t("exam.question")} {qi + 1}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeQuestion(qi)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      {t("exam.remove")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${qi}-title`}>
                      {t("exam.question_title")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`question-${qi}-title`}
                      value={q.title}
                      onChange={(e) =>
                        updateQuestion(qi, (prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder={t("exam.question_title_placeholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-${qi}-text`}>
                      {t("exam.additional_text")}
                    </Label>
                    <Textarea
                      id={`question-${qi}-text`}
                      value={q.text}
                      onChange={(e) =>
                        updateQuestion(qi, (prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      placeholder={t("exam.additional_text_placeholder")}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("exam.image")}</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input
                        type="file"
                        accept=".jpeg,.jpg,.png,.webp,.gif"
                        onChange={(e) =>
                          setQuestionImage(qi, e.target.files?.[0] || null)
                        }
                        className="w-auto file:mr-3  file:bg-primary file:text-primary-foreground file:border-0 file:px-3 file:py-0 file:text-sm file:font-medium hover:file:bg-primary/90 file:h-full px-0 py-0"
                      />
                      {q.imageFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuestionImage(qi, null)}
                        >
                          {t("exam.remove")}
                        </Button>
                      )}
                    </div>
                    {q.imageFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {q.imageFile.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>{t("exam.answer_choices")}</Label>
                    <div className="space-y-3">
                      {q.choices.map((c, ci) => {
                        const optionLabel = String.fromCharCode(65 + ci);
                        return (
                          <div
                            key={ci}
                            className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors md:flex-row md:items-center ${
                              c.is_correct
                                ? "bg-green-50 border-green-200 ring-1 ring-green-200 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:ring-emerald-500/30"
                                : "bg-muted/30 border-border hover:bg-muted/50 dark:bg-muted/20 dark:border-border dark:hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex w-full items-center gap-3">
                              <Badge
                                variant="secondary"
                                className="rounded-full px-3 py-1 text-xs font-bold tracking-wide"
                              >
                                {optionLabel}
                              </Badge>
                              <Input
                                value={c.text}
                                onChange={(e) =>
                                  setChoiceText(qi, ci, e.target.value)
                                }
                                placeholder={`${t("exam.choice_placeholder")} ${ci + 1}`}
                                className={`flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
                                  c.is_correct ? "font-medium" : ""
                                }`}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => setChoiceCorrect(qi, ci)}
                                size="sm"
                                aria-pressed={c.is_correct}
                                className={`gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide ${
                                  c.is_correct
                                    ? "border-green-500 bg-green-500 text-white hover:bg-green-500/90 hover:text-white dark:border-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                                    : "border-border bg-background text-muted-foreground hover:text-foreground dark:bg-muted"
                                }`}
                              >
                                {c.is_correct ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Circle className="h-4 w-4" />
                                )}
                                {c.is_correct
                                  ? t("exam.correct_answer")
                                  : markCorrectLabel}
                              </Button>
                              {q.choices.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChoice(qi, ci)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  {t("exam.remove")}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addChoice(qi)}
                        className="w-full"
                      >
                        {t("exam.add_choice")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("exam.correct_answer_hint_updated", {
                        defaultValue:
                          "For best results, craft around 10 questions and add an option E labeled “I don’t know” so trainees can answer honestly.",
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-start gap-3 mt-10">
          <Button type="button" variant="outline" asChild>
            <Link
              to={
                moduleId
                  ? `/modules/${moduleId}/pre-post-exams/view`
                  : "/modules"
              }
            >
              {t("exam.cancel")}
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting || !moduleId || !title.trim()}
            className="min-w-[120px]"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {t("exam.creating")}
              </div>
            ) : (
              t("exam.create_test")
            )}
          </Button>
        </div>
      </form>
      {showFloatingAdd && (
        <div className="fixed bottom-24 right-4 sm:bottom-14 sm:right-6 lg:bottom-10 lg:right-10 z-50 drop-shadow-2xl">
          <Button
            type="button"
            onClick={() => {
              addQuestion();
              requestAnimationFrame(updateFloatingAddVisibility);
            }}
            size="lg"
            className="gap-2 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90"
            aria-label={addQuestionLabel}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{addQuestionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
