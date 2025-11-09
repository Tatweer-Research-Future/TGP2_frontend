import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  getModuleTestResults,
  getModuleTests,
  getModuleTestById,
  getPortalModules,
  type ModuleTestResult,
  type ModuleTestResultsResponse,
  type PortalModule,
} from "@/lib/api";

export default function ModulePrePostExamResultsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const moduleIdNum = useMemo(
    () => (moduleId ? Number(moduleId) : null),
    [moduleId]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ModuleTestResult[]>([]);
  const [moduleMeta, setModuleMeta] = useState<PortalModule | null>(null);
  const [testMeta, setTestMeta] = useState<{ id: number; title: string } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!moduleIdNum) return;
      try {
        setIsLoading(true);
        // Prefer testId from navigation state
        const testIdViaRouter = (location as any)?.state?.testId as
          | number
          | undefined;

        let resolvedTestId: number | undefined = testIdViaRouter;

        // Fetch module meta for title context (best-effort)
        try {
          const modulesResp = await getPortalModules();
          const mod = (modulesResp.results || []).find(
            (m) => m.id === moduleIdNum
          );
          if (!cancelled) setModuleMeta(mod || null);
          if (!resolvedTestId && mod?.test?.id) {
            resolvedTestId = mod.test.id;
          }
        } catch (_) {
          // ignore meta errors; results still useful
        }

        // Fallback: list tests by module and pick first
        if (!resolvedTestId) {
          try {
            const list = await getModuleTests({ module: moduleIdNum });
            if (list && list.length > 0) {
              resolvedTestId = list[0].id;
            }
          } catch (_) {
            // ignore
          }
        }

        if (!resolvedTestId) {
          if (!cancelled) setError("No exam found for this module");
          return;
        }

        // Fetch results for test id
        const res: ModuleTestResultsResponse = await getModuleTestResults(
          resolvedTestId
        );
        if (!cancelled) {
          // Try to enrich module meta from response if available
          const respModule = res?.test?.module;
          if (respModule && typeof respModule === "object" && "id" in respModule) {
            setModuleMeta((prev) => prev ?? (respModule as any));
          }
          if (res?.test?.id && res?.test?.title) {
            setTestMeta({ id: res.test.id, title: res.test.title });
          } else {
            try {
              const test = await getModuleTestById(resolvedTestId);
              if (!cancelled && test) {
                setTestMeta({ id: test.id, title: test.title });
              }
            } catch {
              // ignore
            }
          }

          // Transform PRE/POST submissions into per-trainee rows
          const preSubs = res?.kinds?.PRE?.submissions ?? [];
          const postSubs = res?.kinds?.POST?.submissions ?? [];
          const byTrainee = new Map<number, ModuleTestResult>();

          for (const s of preSubs) {
            const row: ModuleTestResult = {
              user_id: s.trainee.id,
              user_name: s.trainee.name,
              user_email: s.trainee.email,
              pre_score: s.score_total,
              pre_max: s.score_max,
              post_score: null,
              post_max: null,
            };
            byTrainee.set(s.trainee.id, row);
          }
          for (const s of postSubs) {
            const existing = byTrainee.get(s.trainee.id);
            if (existing) {
              existing.post_score = s.score_total;
              existing.post_max = s.score_max;
            } else {
              byTrainee.set(s.trainee.id, {
                user_id: s.trainee.id,
                user_name: s.trainee.name,
                user_email: s.trainee.email,
                pre_score: null,
                pre_max: null,
                post_score: s.score_total,
                post_max: s.score_max,
              });
            }
          }
          setResults(Array.from(byTrainee.values()));
        }
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message || "Failed to load exam results");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [moduleIdNum]);

  const enriched = useMemo(() => {
    return (results || []).map((r) => {
      const preMax = r.pre_max ?? r.pre_score ?? null;
      const postMax = r.post_max ?? r.post_score ?? null;
      const prePct =
        r.pre_percentage ??
        (r.pre_score != null && preMax ? (r.pre_score / preMax) * 100 : null);
      const postPct =
        r.post_percentage ??
        (r.post_score != null && postMax ? (r.post_score / postMax) * 100 : null);
      const improvementPts =
        r.improvement_points ??
        (r.pre_score != null && r.post_score != null
          ? r.post_score - r.pre_score
          : null);
      const improvementPct =
        r.improvement_percentage ??
        (prePct != null && postPct != null ? postPct - prePct : null);
      return {
        ...r,
        __prePct: prePct,
        __postPct: postPct,
        __improvePts: improvementPts,
        __improvePct: improvementPct,
      };
    });
  }, [results]);

  const stats = useMemo(() => {
    if (!enriched.length) {
      return {
        count: 0,
        avgPre: 0,
        avgPost: 0,
        avgImprovePts: 0,
        avgImprovePct: 0,
        improvedCount: 0,
      };
    }
    let preSum = 0;
    let postSum = 0;
    let preCnt = 0;
    let postCnt = 0;
    let impPtsSum = 0;
    let impPtsCnt = 0;
    let impPctSum = 0;
    let impPctCnt = 0;
    let improvedCount = 0;
    enriched.forEach((r) => {
      if (r.__prePct != null) {
        preSum += r.__prePct;
        preCnt += 1;
      }
      if (r.__postPct != null) {
        postSum += r.__postPct;
        postCnt += 1;
      }
      if (r.__improvePts != null) {
        impPtsSum += r.__improvePts;
        impPtsCnt += 1;
        if (r.__improvePts > 0) improvedCount += 1;
      } else if (r.__improvePct != null && r.__improvePct > 0) {
        improvedCount += 1;
      }
      if (r.__improvePct != null) {
        impPctSum += r.__improvePct;
        impPctCnt += 1;
      }
    });
    return {
      count: enriched.length,
      avgPre: preCnt ? preSum / preCnt : 0,
      avgPost: postCnt ? postSum / postCnt : 0,
      avgImprovePts: impPtsCnt ? impPtsSum / impPtsCnt : 0,
      avgImprovePct: impPctCnt ? impPctSum / impPctCnt : 0,
      improvedCount,
    };
  }, [enriched]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const ai = a.__improvePct ?? a.__improvePts ?? 0;
      const bi = b.__improvePct ?? b.__improvePts ?? 0;
      return bi - ai;
    });
  }, [enriched]);

  function fmtPct(v: number | null | undefined): string {
    if (v == null || Number.isNaN(v)) return "-";
    return `${v.toFixed(1)}%`;
    }

  function fmtPts(score?: number | null, max?: number | null): string {
    if (score == null) return "-";
    if (max == null) return `${score}`;
    return `${score} / ${max}`;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/modules")}
          className="h-8 px-2 text-sm"
        >
          Back to track
        </Button>
        {moduleMeta && (
          <Badge variant="secondary" className="ml-1">
            {moduleMeta.title}
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">
                  Exam Results
                  {testMeta ? ` — ${testMeta.title}` : ""}
                  {moduleMeta ? ` (${moduleMeta.title})` : ""}
                </CardTitle>
                <Badge variant="secondary">Total {stats.count}</Badge>
                <Badge variant="secondary">
                  Avg Pre {fmtPct(stats.avgPre)}
                </Badge>
                <Badge variant="secondary">
                  Avg Post {fmtPct(stats.avgPost)}
                </Badge>
                <Badge>
                  Avg Δ {stats.avgImprovePts.toFixed(2)} pts
                </Badge>
                <Badge>
                  Avg Δ {fmtPct(stats.avgImprovePct)}
                </Badge>
                <Badge variant="outline">
                  Improved {stats.improvedCount}/{stats.count}
                </Badge>
                <div className="ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(`/modules/${moduleIdNum}/pre-post-exams/view`)
                    }
                  >
                    View Exam
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm md:text-base">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Pre</th>
                      <th className="px-4 py-3 font-medium">Pre %</th>
                      <th className="px-4 py-3 font-medium">Post</th>
                      <th className="px-4 py-3 font-medium">Post %</th>
                      <th className="px-4 py-3 font-medium">Δ pts</th>
                      <th className="px-4 py-3 font-medium">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-muted-foreground"
                          colSpan={7}
                        >
                          No results yet.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((r) => {
                        const deltaPts = r.__improvePts ?? null;
                        const deltaPct = r.__improvePct ?? null;
                        const up = (deltaPts ?? deltaPct ?? 0) > 0;
                        const down = (deltaPts ?? deltaPct ?? 0) < 0;
                        const deltaColor = up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : down
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground";
                        return (
                          <tr
                            key={r.user_id}
                            className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium">{r.user_name}</div>
                              {r.user_email && (
                                <div className="text-xs text-muted-foreground">
                                  {r.user_email}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {fmtPts(r.pre_score ?? null, r.pre_max ?? null)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtPct(r.__prePct ?? null)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtPts(r.post_score ?? null, r.post_max ?? null)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtPct(r.__postPct ?? null)}
                            </td>
                            <td className={`px-4 py-3 ${deltaColor}`}>
                              {r.__improvePts == null
                                ? "-"
                                : r.__improvePts.toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 ${deltaColor}`}>
                              {fmtPct(r.__improvePct ?? null)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


