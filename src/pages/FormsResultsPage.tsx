import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getForms, getFormSubmissionsSummary, getFormById, type BackendFormsList, type FormSubmissionsSummary, type BackendForm } from "@/lib/api";
import { Pie, PieChart, Cell, Label, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { IconChevronDown, IconChevronUp, IconGauge } from "@tabler/icons-react";
import { AIAnalysisBanner } from "@/components/ai-analysis-banner";
import { generateWithGemini } from "@/services/gemini";

export default function FormsResultsPage() {
  const { t, i18n } = useTranslation();
  const [forms, setForms] = useState<BackendFormsList["results"]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [summary, setSummary] = useState<FormSubmissionsSummary | null>(null);
  const [isLoadingForms, setIsLoadingForms] = useState<boolean>(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [formMeta, setFormMeta] = useState<BackendForm | null>(null);
  const [formSearch, setFormSearch] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLang, setAiLang] = useState<"en" | "ar">(i18n?.language?.startsWith("ar") ? "ar" : "en");

  function getAiCacheKey(formId: number | null, lang: "en" | "ar"): string | null {
    if (formId == null) return null;
    return `forms_ai_summary_${formId}_${lang}`;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingForms(true);
        const list = await getForms();
        if (cancelled) return;
        const results = Array.isArray(list?.results) ? list.results : [];
        setForms(results);
        if (results.length > 0) {
          setSelectedFormId(results[0].id);
        }
      } finally {
        if (!cancelled) setIsLoadingForms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selectedFormId == null) {
        setSummary(null);
        setFormMeta(null);
        return;
      }
      try {
        setIsLoadingSummary(true);
        const data = await getFormSubmissionsSummary(selectedFormId);
        if (cancelled) return;
        setSummary(data);
        // load form meta to enable sub-question logic
        try {
          const meta = await getFormById(selectedFormId);
          if (!cancelled) setFormMeta(meta);
        } catch (_) {
          if (!cancelled) setFormMeta(null);
        }
      } finally {
        if (!cancelled) setIsLoadingSummary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFormId]);

  const totalsPercent = useMemo(() => {
    if (!summary) return 0;
    const sum = Number(summary.totals.sum_final_scores);
    const max = Number(summary.totals.max_total_overall);
    if (!max) return 0;
    return Math.round((sum / max) * 100);
  }, [summary]);

  const questionFields = useMemo(
    () => (summary ? summary.fields.filter((f) => f.type === "question") : []),
    [summary]
  );
  const textFields = useMemo(
    () => (summary ? summary.fields.filter((f) => f.type !== "question") : []),
    [summary]
  );

  // Determine if a field (by id) is a Yes/No question using original form meta
  function isYesNoField(fieldId: number): boolean {
    const meta = formMeta?.fields?.find((f) => f.id === fieldId);
    if (!meta || meta.type !== "question" || !meta.scale?.options) return false;
    const opts = meta.scale.options;
    if (opts.length !== 2) return false;
    // Scores 0/1 identify yes-no in original app
    const scores = opts.map((o) => Number(o.score));
    return (
      scores.length === 2 &&
      scores.every((s) => s === 0 || s === 1)
    );
  }

  // Compute sub-question styling based on previous Yes/No until next required field
  function isSubQuestion(index: number): boolean {
    if (!summary) return false;
    const fields = [...summary.fields].sort((a, b) => a.order - b.order);
    if (index < 0 || index >= fields.length) return false;
    const current = fields[index];
    if (current.required) return false;
    for (let i = index - 1; i >= 0; i--) {
      const prev = fields[i];
      if (isYesNoField(prev.id)) {
        return true;
      }
      if (prev.required && !isYesNoField(prev.id)) {
        return false;
      }
    }
    return false;
  }

  // Build groups: a yes/no question with its following sub-questions until next required field
  const groupedQuestions = useMemo(() => {
    if (!summary) return [] as Array<{ parent: typeof questionFields[number]; subs: typeof questionFields }>
    const fields = [...questionFields].sort((a, b) => a.order - b.order)
    const groups: Array<{ parent: typeof fields[number]; subs: typeof fields }> = []
    let i = 0
    while (i < fields.length) {
      const current = fields[i]
      if (isYesNoField(current.id)) {
        const groupSubs: typeof fields = []
        let j = i + 1
        while (j < fields.length) {
          const f = fields[j]
          if (f.required) break
          groupSubs.push(f)
          j++
        }
        groups.push({ parent: current, subs: groupSubs })
        i = j
      } else {
        groups.push({ parent: current, subs: [] as any })
        i += 1
      }
    }
    return groups
  }, [summary, questionFields, formMeta])

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const toggleGroup = (idx: number) =>
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }))

  // AI analysis for forms summary and notes
  async function handleAnalyzeForms() {
    if (!summary) return;
    try {
      setAiLoading(true);
      // Use local cache if available
      const cacheKey = getAiCacheKey(selectedFormId, aiLang);
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached.length > 0) {
          setAiResponse(cached);
          setAiLoading(false);
          return;
        }
      }
      // Prepare compact JSON payload for the LLM
      const fieldsPayload = summary.fields.map((f) => {
        if (f.type === "question") {
          const total = (f as any).responses_count ?? f.options.reduce((s, o) => s + o.count, 0)
          return {
            id: f.id,
            label: f.label,
            type: f.type,
            required: f.required,
            order: f.order,
            weight: f.weight,
            total_responses: total,
            options: f.options.map((o) => ({ id: o.id, label: o.label, count: o.count })),
          }
        } else {
          return {
            id: f.id,
            label: f.label,
            type: f.type,
            required: f.required,
            order: f.order,
            notes: (f as any).texts ?? [],
          }
        }
      })
      const payload = {
        form: summary.form,
        totals: summary.totals,
        fields: fieldsPayload,
      }
      const system = `You are an expert program evaluator. Analyze survey results and open-text notes to produce a clear, actionable report for program leaders.

Goals:
- Summarize overall satisfaction and key metrics.
- Identify what's going well and what's not.
- Highlight best-performing instructor/session if signals exist in questions/notes.
- Extract common patterns from notes (themes, praise, complaints).
- Recommend concrete actions to improve and to get more positive feedback.

Constraints:
- Be concise and structured with clear headings and bullet points.
- Include data-backed numbers (%, counts) when useful.
- Keep it neutral and professional; avoid guessing when evidence is weak.
 - Output language: ${aiLang === "ar" ? "Arabic (Modern Standard)" : "English"}.
`
      const user = `FORMS_SUMMARY_JSON:\n${JSON.stringify(payload)}\n\nIf helpful, compute percentages from counts. Use both numeric results and notes for insights.`
      const text = await generateWithGemini({ system, user })
      const finalText = text || "No analysis produced.";
      setAiResponse(finalText)
      if (cacheKey) {
        try { localStorage.setItem(cacheKey, finalText); } catch { /* ignore */ }
      }
    } catch (e) {
      setAiResponse("Failed to generate analysis.")
    } finally {
      setAiLoading(false)
    }
  }

  // Load cached AI response when switching forms or language
  useEffect(() => {
    const cacheKey = getAiCacheKey(selectedFormId, aiLang);
    if (!cacheKey) { setAiResponse(null); return; }
    try {
      const cached = localStorage.getItem(cacheKey);
      setAiResponse(cached && cached.length > 0 ? cached : null);
    } catch {
      setAiResponse(null);
    }
  }, [selectedFormId, aiLang]);

  function renderYesNoProgress(field: typeof questionFields[number]) {
    const meta = formMeta?.fields?.find((f) => f.id === field.id)
    const yesId = meta?.scale?.options?.find((o) => Number(o.score) === 1)?.id
    const total = (field as any).responses_count ?? field.options.reduce((s, o) => s + o.count, 0)
    const yesCount = field.options.find((o) => o.id === yesId)?.count ?? 0
    const yesPct = total ? Math.round((yesCount / total) * 100) : 0
    const noCount = Math.max(0, total - yesCount)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Yes responses</div>
          <div className="text-2xl font-bold">{yesPct}%</div>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-4 rounded-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
        </div>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-500" />Yes: {yesCount}</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block bg-gray-300" />No: {noCount}</div>
          <div>({total} responses)</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">{t("navigation.forms_summary", { defaultValue: "Forms Summary" })}</h1>

      {/* AI Analysis Banner */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">AI output language:</span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={aiLang === "en" ? "default" : "outline"}
              className="h-7 px-3 rounded-full"
              onClick={() => setAiLang("en")}
            >
              EN
            </Button>
            <Button
              size="sm"
              variant={aiLang === "ar" ? "default" : "outline"}
              className="h-7 px-3 rounded-full"
              onClick={() => setAiLang("ar")}
            >
              العربية
            </Button>
          </div>
        </div>
        <AIAnalysisBanner
          badgeText="AI analysis"
          title="Let AI summarize the feedback and highlight actions to take."
          description="It will analyze charts and notes to surface strengths, issues, best sessions/instructors, and improvement ideas."
          analyzeText="Analyze results"
          onAnalyze={handleAnalyzeForms}
          isLoading={aiLoading}
          response={aiResponse}
          defaultCollapsed={true}
        />
      </div>

      {/* Form selector */}
      <div className="mb-6">
        {isLoadingForms ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader />
            <span>Loading forms...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Input
                  placeholder="Search forms..."
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="pl-9"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm10.707 18.293-3.387-3.387A9.956 9.956 0 0 1 10 20a10 10 0 1 1 7.094-2.906l3.386 3.387a1 1 0 1 1-1.414 1.414l-.359-.358Z"/></svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {forms
                .filter((f) => f.title.toLowerCase().includes(formSearch.toLowerCase()))
                .map((f) => {
                  const isSelected = selectedFormId === f.id;
                  const isSubmitted = f.has_submitted;
                  return (
                    <Button
                      key={f.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFormId(f.id)}
                      disabled={isSubmitted}
                      className={`rounded-full ${isSubmitted ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {isSelected ? (
                        <svg className="size-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      ) : null}
                      <span className="truncate max-w-[14rem]">{f.title}</span>
                    </Button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Totals card */}
      <Card className="mb-6 border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <IconGauge className="size-5 text-primary" />
            Totals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader />
              <span>Loading summary...</span>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-xl p-4 shadow-inner border border-primary/20 bg-transparent">
                  <div className="absolute -top-6 -right-6 size-20 rounded-full bg-primary/10 blur-2xl" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Entries</div>
                      <div className="mt-1 text-3xl font-extrabold tracking-tight">{summary.totals.entries_count.toLocaleString()}</div>
                    </div>
                    <div className="shrink-0 rounded-full bg-primary/15 text-primary p-2">
                      <IconGauge className="size-5" />
                    </div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl p-4 shadow-inner border border-primary/20 bg-transparent">
                  <div className="absolute -bottom-6 -left-6 size-20 rounded-full bg-emerald-500/10 blur-2xl" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Normalized %</div>
                      <div className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{totalsPercent.toLocaleString()}%</div>
                    </div>
                    <div className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Zm10-5a1 1 0 1 0-2 0v5a1 1 0 0 0 .553.894l4 2a1 1 0 0 0 .894-1.788L13 11.382V7Z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 shadow-inner border border-primary/20 bg-transparent">
                <div className="flex items-end justify-between">
                  <div className="text-sm text-muted-foreground">Overall Satisfaction</div>
                  <div className="text-sm font-medium">{totalsPercent}%</div>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${totalsPercent}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No summary available.</div>
          )}
        </CardContent>
      </Card>

      {/* Charts grid: only question-type fields */}
      {summary && groupedQuestions.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {groupedQuestions.map((group, gIdx) => (
            <Card key={group.parent.id} dir="rtl" className={`border-2 h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {group.parent.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isYesNoField(group.parent.id) ? (
                  <div className="space-y-4">
                    {renderYesNoProgress(group.parent)}
                    {group.subs.length > 0 && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGroup(gIdx)}
                          className="gap-2 rounded-full border-primary/30 text-foreground hover:bg-primary/10"
                        >
                          {expandedGroups[gIdx] ? (
                            <IconChevronUp className="size-4" />
                          ) : (
                            <IconChevronDown className="size-4" />
                          )}
                          <span className="text-sm font-medium">
                            {expandedGroups[gIdx] ? "Hide sub-questions" : "Show sub-questions"}
                          </span>
                        </Button>
                      </div>
                    )}
                    {expandedGroups[gIdx] && group.subs.length > 0 && (
                      <div className="mt-2 space-y-4">
                        {group.subs.map((field) => (
                          <Card key={field.id} dir="rtl" className="border-2 mr-6 border-r-4 border-r-primary/30 bg-primary/10 dark:border-r-primary/40 dark:bg-primary/15">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {(() => {
                                const options = field.options.map((o) => ({ name: o.label, value: o.count }))
                                const total = options.reduce((s, o) => s + o.value, 0)
                                const palette = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#84CC16"]
                                const chartConfig: ChartConfig = options.reduce((acc, o, i) => {
                                  acc[o.name] = { label: o.name, color: palette[i % palette.length] }
                                  return acc
                                }, {} as ChartConfig)
                                return (
                                  <>
                                    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-w-[360px]">
                                      <PieChart>
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                        <Pie data={options} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                                          {options.map((d, i) => (
                                            <Cell key={i} fill={palette[i % palette.length]} />
                                          ))}
                                        </Pie>
                                      </PieChart>
                                    </ChartContainer>
                                    <div className="flex flex-wrap items-center gap-3 justify-center pt-2">
                                      {options.map((o, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: palette[i % palette.length] }} />
                                          <span className="text-muted-foreground">{o.name}: {o.value} ({total ? Math.round((o.value / total) * 100) : 0}%)</span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )
                              })()}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Sum score {Number(group.parent.sum_weighted_score).toFixed(2)} / {Number(group.parent.max_possible).toFixed(2)}
                    </div>
                    {(() => {
                      const options = group.parent.options.map((o) => ({ name: o.label, value: o.count }))
                      const total = options.reduce((s, o) => s + o.value, 0)
                      const palette = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#84CC16"]
                      const chartConfig: ChartConfig = options.reduce((acc, o, i) => {
                        acc[o.name] = { label: o.name, color: palette[i % palette.length] }
                        return acc
                      }, {} as ChartConfig)
                      return (
                        <>
                          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-w-[420px]">
                            <PieChart>
                              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                              <Pie data={options} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110}>
                                {options.map((d, i) => (
                                  <Cell key={i} fill={palette[i % palette.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                          <div className="flex flex-wrap items-center gap-3 justify-center pt-2">
                            {options.map((o, i) => (
                              <div key={i} className="flex items-center gap-2 text-base">
                                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: palette[i % palette.length] }} />
                                <span className="text-muted-foreground">{o.name}: {o.value} ({total ? Math.round((o.value / total) * 100) : 0}%)</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notes section: text/email fields outside charts grid */}
      {summary && textFields.length > 0 && (
        <div className="mt-6 space-y-4">
          {textFields.map((field) => (
            <Card key={field.id} dir="rtl" className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {field.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {"texts" in field && field.texts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {field.texts.map((txt, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-2xl border bg-muted/70 px-3 py-2">
                        <ConsistentAvatar
                          user={{ name: `User ${idx + 1}`, email: `forms-summary-${idx}@tgp.local` }}
                          className="size-8"
                        />
                        <div className="text-sm text-foreground leading-relaxed">
                          {txt}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No text responses.</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


