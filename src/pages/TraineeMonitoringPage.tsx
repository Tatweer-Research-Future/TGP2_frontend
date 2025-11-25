import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconCopy, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

import { getTraineePerformance } from "@/lib/api";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";

type Trainee = {
  user_id: number;
  name: string;
  full_name: string;
  email: string;
  avatar?: string;
  attendance_days: number;
  absent_days: number;
  post_score_sum: number;
  order_sum: number;
  total_break_time?: number | string | null;
  total_break_hours?: number | string | null;
  break_hours?: number | string | null;
  post_scores: Array<{
    module_id: number;
    module_title: string;
    score_total: number;
    score_max: number;
  }>;
  module_orders: Array<{
    module_id: number;
    module_title: string;
    order: number;
  }>;
  track: string;
};

export function TraineeMonitoringPage() {
  const { t } = useTranslation();
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trainee performance data from backend
  const fetchTraineePerformance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTraineePerformance();

      // Flatten the tracks array into a single array of trainees with track info
      const allTrainees: Trainee[] = [];
      response.tracks.forEach((trackData) => {
        trackData.trainees.forEach((trainee) => {
          allTrainees.push({
            ...trainee,
            avatar: trainee.avatar ?? undefined,
            track: trackData.track,
          });
        });
      });

      setTrainees(allTrainees);
      setSelectedTrack((current) => {
        if (current) {
          return current;
        }
        return response.tracks[0]?.track || "";
      });
    } catch (err) {
      console.error("Failed to fetch trainee performance:", err);
      const error = err as { status?: number; message?: string };
      const errorMessage =
        error?.status === 404
          ? "Trainee performance endpoint not found. Please ensure the API endpoint is available."
          : error?.status === 401 || error?.status === 403
          ? "You don't have permission to access trainee performance data."
          : "Failed to load trainee performance data. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get track color function (same as AttendancePage)
  const getTrackColor = (track: string) => {
    const colorMap: Record<string, string> = {
      "Software & App Development":
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30",
      "Networking & Telecommunications":
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30",
      "AI & Data Analysis":
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30",
      Cybersecurity:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30",
      "Digital Marketing":
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30",
      "Cloud Computing":
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30",
      "IoT & Embedded Systems":
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/20 dark:text-pink-200 dark:border-pink-500/30",
      "Blockchain & Cryptocurrency":
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/30",
    };
    return (
      colorMap[track] ||
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/20 dark:text-gray-200 dark:border-gray-500/30"
    );
  };

  const formatBreakHours = (value?: number | string | null) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return null;
      }
      const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
      return `${formatted}h`;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const getRankBadgeClasses = (rank?: number) => {
    if (!rank) {
      return "bg-muted/30 text-muted-foreground border-border/50";
    }
    if (rank === 1) {
      return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-500/40";
    }
    if (rank === 2) {
      return "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/20 dark:text-slate-100 dark:border-slate-500/40";
    }
    if (rank === 3) {
      return "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-500/20 dark:text-orange-100 dark:border-orange-500/40";
    }
    return "bg-muted/20 text-foreground border-border/60";
  };

  // Available tracks derived from current data
  const availableTracks = useMemo(() => {
    const tracks = new Set<string>();
    trainees.forEach((trainee) => {
      if (trainee.track) {
        tracks.add(trainee.track);
      }
    });
    return Array.from(tracks).sort();
  }, [trainees]);

  useEffect(() => {
    fetchTraineePerformance();
  }, [fetchTraineePerformance]);

  useEffect(() => {
    if (!availableTracks.length) {
      if (selectedTrack) {
        setSelectedTrack("");
      }
      return;
    }
    if (!selectedTrack) {
      setSelectedTrack(availableTracks[0]);
      return;
    }
    if (!availableTracks.includes(selectedTrack)) {
      setSelectedTrack(availableTracks[0] || "");
    }
  }, [availableTracks, selectedTrack]);

  const trackRankings = useMemo(() => {
    const rankingMap = new Map<number, number>();
    const trackGroups = trainees.reduce<Record<string, Trainee[]>>(
      (acc, trainee) => {
        if (!trainee.track) {
          return acc;
        }
        if (!acc[trainee.track]) {
          acc[trainee.track] = [];
        }
        acc[trainee.track].push(trainee);
        return acc;
      },
      {}
    );

    const getOrderValue = (trainee: Trainee) =>
      trainee.module_orders.length > 0
        ? trainee.order_sum
        : Number.MAX_SAFE_INTEGER;

    Object.values(trackGroups).forEach((group) => {
      group
        .slice()
        .sort((a, b) => {
          const orderDiff = getOrderValue(a) - getOrderValue(b);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          if (b.post_score_sum !== a.post_score_sum) {
            return b.post_score_sum - a.post_score_sum;
          }
          if (b.attendance_days !== a.attendance_days) {
            return b.attendance_days - a.attendance_days;
          }
          const nameA = a.full_name || a.name || "";
          const nameB = b.full_name || b.name || "";
          return nameA.localeCompare(nameB);
        })
        .forEach((trainee, index) => {
          rankingMap.set(trainee.user_id, index + 1);
        });
    });

    return rankingMap;
  }, [trainees]);

  // Filter logic
  const filteredTrainees = useMemo(() => {
    const filtered = trainees.filter((trainee) => {
      const matchesTrack = !selectedTrack || trainee.track === selectedTrack;

      return matchesTrack;
    });

    const getRank = (trainee: Trainee) =>
      trackRankings.get(trainee.user_id) ?? Number.MAX_SAFE_INTEGER;

    return filtered.sort((a, b) => {
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return (a.full_name || a.name).localeCompare(b.full_name || b.name);
    });
  }, [trainees, selectedTrack, trackRankings]);

  // Copy all visible names (all filtered trainees) to clipboard
  const handleCopyVisibleNames = async () => {
    const names = filteredTrainees.map((t) => {
      return t.full_name || t.name || "-";
    });
    if (names.length === 0) {
      toast.info("No names to copy");
      return;
    }
    const text = names.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        `Copied ${names.length} name${names.length > 1 ? "s" : ""}`
      );
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(
          `Copied ${names.length} name${names.length > 1 ? "s" : ""}`
        );
      } catch {
        toast.error("Failed to copy names");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("pages.trainee_monitoring.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pages.trainee_monitoring.subtitle")}
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center min-h-[50vh]">
                <Loader />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("pages.trainee_monitoring.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pages.trainee_monitoring.subtitle")}
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="text-muted-foreground">{error}</div>
                <Button
                  onClick={() => fetchTraineePerformance()}
                  variant="outline"
                >
                  <IconRefresh className="size-4 mr-2" />
                  {t("common.buttons.refresh")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("pages.trainee_monitoring.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pages.trainee_monitoring.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {/* Track Filter */}
            <div className="flex gap-2 flex-wrap">
              {availableTracks.map((track) => (
                <Button
                  key={track}
                  variant={selectedTrack === track ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTrack(track)}
                  className={
                    selectedTrack === track
                      ? ""
                      : `border-2 ${getTrackColor(track).split(" ")[2]}`
                  }
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      getTrackColor(track).split(" ")[0]
                    }`}
                  />
                  {track}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              {t("pages.trainee_monitoring.title")} {t("common.labels.list")}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("table.headers.rank")}
                </TableHead>
                {/* Name column: left-align header and cells for better visual consistency */}
                <TableHead className="text-left">
                  <div className="flex items-center justify-start gap-2">
                    <span>{t("table.headers.name")}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      onClick={handleCopyVisibleNames}
                      title="Copy all visible names"
                    >
                      <IconCopy className="size-4" />
                      <span className="sr-only">Copy all visible names</span>
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  {t("pages.trainee_monitoring.attendanceStats")}
                </TableHead>
                <TableHead className="text-center">
                  {t("pages.trainee_monitoring.breakHours")}
                </TableHead>
                <TableHead className="text-center">Post Exam Scores</TableHead>
                <TableHead className="text-center">Module Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrainees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {t("pages.trainee_monitoring.noCandidates")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrainees.map((trainee) => {
                  const totalDays =
                    trainee.attendance_days + trainee.absent_days;
                  const attendanceRate =
                    totalDays > 0
                      ? Math.round(
                          (trainee.attendance_days / totalDays) * 100 * 10
                        ) / 10
                      : 0;
                  const totalMaxScore = trainee.post_scores.reduce(
                    (sum, score) => sum + score.score_max,
                    0
                  );
                  const rank = trackRankings.get(trainee.user_id);
                  const breakHours = formatBreakHours(
                    trainee.total_break_time ??
                      trainee.total_break_hours ??
                      trainee.break_hours ??
                      null
                  );

                  return (
                    <TableRow key={trainee.user_id}>
                      <TableCell className="text-center font-semibold">
                        {rank ? (
                          <div
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full border text-sm ${getRankBadgeClasses(
                              rank
                            )}`}
                          >
                            #{rank}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {/* Name column cells aligned with header (left) */}
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-3">
                          <ConsistentAvatar
                            user={{
                              name: trainee.full_name || trainee.name || "-",
                              email: trainee.email,
                              avatar: trainee.avatar,
                            }}
                            className="size-8"
                          />
                          <div className="font-medium text-center" dir="rtl">
                            <span className="text-base">
                              {trainee.full_name || trainee.name || "-"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="text-sm">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {trainee.attendance_days}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              {t("pages.trainee_monitoring.present")} /{" "}
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {trainee.absent_days}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              {t("pages.trainee_monitoring.absent")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalDays}{" "}
                            {t("pages.trainee_monitoring.totalDays")} •{" "}
                            {attendanceRate}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {breakHours ? (
                          <span className="text-sm font-medium">
                            {breakHours}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {trainee.post_scores.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="text-sm font-medium">
                              Total: {trainee.post_score_sum}
                              {totalMaxScore > 0 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  / {totalMaxScore}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {trainee.post_scores.map((score) => (
                                <div key={score.module_id}>
                                  {score.module_title}: {score.score_total}/
                                  {score.score_max}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {trainee.module_orders.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {trainee.module_orders.map((order) => (
                                <div key={order.module_id}>
                                  {order.module_title}: {order.order}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary info */}
      <div className="text-sm text-muted-foreground">
        {t("table.pagination.showing")} {filteredTrainees.length}{" "}
        {filteredTrainees.length === 1 ? "trainee" : "trainees"}
      </div>
    </div>
  );
}
