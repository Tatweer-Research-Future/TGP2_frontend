import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  getTraineePerformance,
  type TraineePerformanceResponse,
} from "@/lib/api";
import { IconChevronDown, IconChevronUp, IconTrophy } from "@tabler/icons-react";

type CandidateWeekPerformanceCardProps = {
  userId: string;
  userName?: string;
  className?: string;
};

type TraineePerformanceEntry =
  TraineePerformanceResponse["tracks"][number]["trainees"][number];

type ModuleRow = {
  moduleId: number;
  moduleTitle: string;
  preScore?: number | null;
  preMax?: number | null;
  postScore?: number | null;
  postMax?: number | null;
  rank?: number | null;
  improvement?: number | null;
  improvementPct?: number | null;
};

function formatScore(value?: number | null, max?: number | null) {
  if (value == null) {
    return "-";
  }
  if (max == null) {
    return `${value}`;
  }
  return `${value}/${max}`;
}

function formatPct(value?: number | null, digits = 1) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function derivePercentage(score?: number | null, max?: number | null) {
  if (
    score == null ||
    max == null ||
    Number.isNaN(score) ||
    Number.isNaN(max) ||
    max === 0
  ) {
    return null;
  }
  return (score / max) * 100;
}

export function CandidateWeekPerformanceCard({
  userId,
  userName,
  className,
}: CandidateWeekPerformanceCardProps) {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTraineePerformance();
        if (cancelled) return;
        const numericId = Number(userId);
        if (Number.isNaN(numericId)) {
          setError("Invalid candidate id.");
          setRows([]);
          return;
        }

        let targetTrainee: TraineePerformanceEntry | undefined;
        let targetTrack: string | null = null;
        for (const track of response.tracks) {
          const found = track.trainees.find((t) => t.user_id === numericId);
          if (found) {
            targetTrainee = found;
            targetTrack = track.track;
            break;
          }
        }

        if (!targetTrainee) {
          setRows([]);
          setTrackName(null);
          setError("No weekly exam data available yet.");
          return;
        }

        setTrackName(targetTrack);

        const moduleMap = new Map<number, ModuleRow>();
        const ensureRow = (moduleId: number, moduleTitle: string) => {
          if (!moduleMap.has(moduleId)) {
            moduleMap.set(moduleId, {
              moduleId,
              moduleTitle,
            });
          }
          return moduleMap.get(moduleId)!;
        };

        targetTrainee.post_scores.forEach((score) => {
          const row = ensureRow(score.module_id, score.module_title);
          row.postScore = score.score_total;
          row.postMax = score.score_max;
          if (typeof score.improvement === "number") {
            row.improvement = score.improvement;
          }
          if (typeof score.improvement_percentage === "number") {
            row.improvementPct = score.improvement_percentage;
          }
        });

        if (Array.isArray(targetTrainee.pre_scores)) {
          targetTrainee.pre_scores.forEach((score) => {
            const row = ensureRow(score.module_id, score.module_title);
            row.preScore = score.score_total;
            row.preMax = score.score_max;
          });
        }

        targetTrainee.module_orders.forEach((order) => {
          const row = ensureRow(order.module_id, order.module_title);
          row.rank = order.order;
        });

        const normalizedRows = Array.from(moduleMap.values()).map((row) => {
          const prePct = derivePercentage(row.preScore, row.preMax);
          const postPct = derivePercentage(row.postScore, row.postMax);
          if (row.improvement == null && row.preScore != null && row.postScore != null) {
            row.improvement = row.postScore - row.preScore;
          }
          if (row.improvementPct == null && prePct != null && postPct != null) {
            row.improvementPct = postPct - prePct;
          }
          return row;
        });

        normalizedRows.sort((a, b) => {
          if (a.rank != null && b.rank != null) {
            return a.rank - b.rank;
          }
          if (a.rank != null) return -1;
          if (b.rank != null) return 1;
          return a.moduleTitle.localeCompare(b.moduleTitle);
        });

        setRows(normalizedRows);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load candidate week performance", err);
        const message =
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Failed to load weekly performance data.";
        setError(message);
        setRows([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const summary = useMemo(() => {
    if (!rows.length) {
      return {
        modules: 0,
        avgPre: 0,
        avgPost: 0,
        avgImprovement: 0,
        bestRank: null as number | null,
      };
    }

    let preSum = 0;
    let preCount = 0;
    let postSum = 0;
    let postCount = 0;
    let improvementSum = 0;
    let improvementCount = 0;
    let bestRank: number | null = null;

    rows.forEach((row) => {
      const prePct = derivePercentage(row.preScore, row.preMax);
      const postPct = derivePercentage(row.postScore, row.postMax);
      if (prePct != null) {
        preSum += prePct;
        preCount += 1;
      }
      if (postPct != null) {
        postSum += postPct;
        postCount += 1;
      }
      if (row.improvementPct != null) {
        improvementSum += row.improvementPct;
        improvementCount += 1;
      }
      if (row.rank != null) {
        bestRank = bestRank == null ? row.rank : Math.min(bestRank, row.rank);
      }
    });

    const avgPre = preCount ? preSum / preCount : 0;
    const avgPost = postCount ? postSum / postCount : 0;
    const avgImprovementValue =
      improvementCount > 0
        ? improvementSum / improvementCount
        : avgPost - avgPre;

    return {
      modules: rows.length,
      avgPre,
      avgPost,
      avgImprovement: avgImprovementValue,
      bestRank,
    };
  }, [rows]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Weekly Exams & Rankings</CardTitle>
            <CardDescription>
              Pre/Post exam grades and ranking snapshots per module.
            </CardDescription>
            {trackName && (
              <p className="text-xs text-muted-foreground mt-1">
                Track: {trackName}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {isExpanded ? (
              <>
                <IconChevronUp className="size-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <IconChevronDown className="size-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.modules}
                </div>
                <div className="text-sm text-muted-foreground">
                  Weeks Reported
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.avgPre.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Pre %</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summary.avgPost.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Post %</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    summary.avgImprovement >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {summary.avgImprovement >= 0 ? "+" : ""}
                  {summary.avgImprovement.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Δ</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {summary.bestRank ? (
                    <>
                      <IconTrophy className="size-6" />
                      #{summary.bestRank}
                    </>
                  ) : (
                    "-"
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Best Rank</div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3">
                {error}
              </div>
            )}

            {!error && rows.length === 0 && (
              <div className="text-sm text-muted-foreground border rounded-md px-4 py-6 text-center">
                No pre/post exam data recorded for {userName || "this candidate"} yet.
              </div>
            )}

            {!error && rows.length > 0 && !isExpanded && (
              <div className="text-xs text-muted-foreground">
                Expand to review week-by-week grades and rankings.
              </div>
            )}

            {!error && isExpanded && rows.length > 0 && (
              <div className="space-y-3">
                {rows.map((row) => {
                  const improvementLabel =
                    row.improvementPct != null
                      ? formatPct(row.improvementPct)
                      : row.improvement != null
                      ? `${row.improvement >= 0 ? "+" : ""}${row.improvement.toFixed(
                          1
                        )} pts`
                      : "—";
                  const improvementStyle =
                    row.improvementPct != null
                      ? row.improvementPct > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : row.improvementPct < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                      : "text-muted-foreground";
                  return (
                    <div
                      key={row.moduleId}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="space-y-1">
                          <div className="font-medium">{row.moduleTitle}</div>
                          {row.rank != null ? (
                            <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-muted/30">
                              <IconTrophy className="size-3.5 text-amber-500" />
                              <span>Rank</span>
                              <span className="text-sm font-semibold text-foreground">
                                #{row.rank}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No ranking yet
                            </div>
                          )}
                        </div>
                        <div className="flex-1" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">
                            {formatScore(row.preScore, row.preMax)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Pre Exam
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">
                            {formatScore(row.postScore, row.postMax)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Post Exam
                          </div>
                        </div>
                        <div>
                          <div className={`text-lg font-semibold ${improvementStyle}`}>
                            {improvementLabel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Improvement
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}


