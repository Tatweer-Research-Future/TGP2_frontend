import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconAward,
  IconCalendar,
  IconCopy,
  IconCrown,
  IconMedal,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { getTraineePerformance } from "@/lib/api";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";

const MAX_WEEKS = 14;
const WEEK_OPTIONS = Array.from(
  { length: MAX_WEEKS },
  (_, index) => `Week ${index + 1}`
);

type PerformanceFetchOptions = {
  track?: string;
  weeks?: number[];
};

type Trainee = {
  user_id: number;
  name: string;
  full_name: string;
  email: string;
  avatar?: string;
  attendance_days: number;
  absent_days: number;
  post_score_sum: number;
  improvement_sum?: number;
  total_post_score?: number;
  order_sum: number;
  rank?: number; // precomputed rank from trainee-performance API (1 = best)
  total_break_time?: number | string | null;
  total_break_hours?: number | string | null;
  break_hours?: number | string | null;
  pre_scores?: Array<{
    module_id: number;
    module_title: string;
    score_total: number;
    score_max: number;
  }>;
  post_scores: Array<{
    module_id: number;
    module_title: string;
    score_total: number;
    score_max: number;
    improvement?: number | null;
    improvement_percentage?: number | null;
  }>;
  module_orders: Array<{
    module_id: number;
    module_title: string;
    order: number;
  }>;
  track: string;
};

type WeekPeriod = {
  from?: string | null;
  to?: string | null;
};

type SortKey =
  | "rank"
  | "name"
  | "attendance"
  | "breakHours"
  | "improvement"
  | "modules";
type SortDirection = "asc" | "desc";
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

export function TraineeMonitoringPage() {
  const { t } = useTranslation();
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [availableTracks, setAvailableTracks] = useState<string[]>([]);
  const [hasInitializedTracks, setHasInitializedTracks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekPeriod, setWeekPeriod] = useState<WeekPeriod | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "rank",
    direction: "asc",
  });

  const fetchTraineePerformance = useCallback(
    async (options?: PerformanceFetchOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTraineePerformance({
          track: options?.track,
          weeks: options?.weeks,
        });

        if (!hasInitializedTracks) {
          const trackNames = response.tracks
            .map((trackData) => trackData.track)
            .filter((trackName): trackName is string => Boolean(trackName));
          if (trackNames.length > 0) {
            setAvailableTracks([...new Set(trackNames)].sort());
            setHasInitializedTracks(true);
          }
        }

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

        const selectedTrackData = options?.track
          ? response.tracks.find(
              (trackData) => trackData.track === options.track
            )
          : response.tracks[0];
        const periodFrom =
          selectedTrackData?.period_from ?? response.period_from ?? null;
        const periodTo =
          selectedTrackData?.period_to ?? response.period_to ?? null;

        if (options?.weeks && options.weeks.length > 0) {
          setWeekPeriod({ from: periodFrom, to: periodTo });
        } else {
          setWeekPeriod(null);
        }

        if (!options?.track) {
          setSelectedTrack((current) => {
            if (current) {
              return current;
            }
            return response.tracks[0]?.track || "";
          });
        }
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
    },
    [hasInitializedTracks]
  );

  const parseSelectedWeek = () => {
    if (selectedWeek === "all") {
      return undefined;
    }
    const match = selectedWeek.match(/\d+/);
    if (!match) {
      return undefined;
    }
    const parsed = Number(match[0]);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return [parsed];
  };

  const trackStyleMap: Record<
    string,
    {
      dot: string;
      border: string;
    }
  > = {
    "Software & App Development": {
      dot: "bg-blue-500 dark:bg-blue-400",
      border: "border-blue-400/70",
    },
    "Networking & Telecommunications": {
      dot: "bg-green-500 dark:bg-green-400",
      border: "border-green-400/70",
    },
    "AI & Data Analysis": {
      dot: "bg-purple-500 dark:bg-purple-400",
      border: "border-purple-400/70",
    },
    Cybersecurity: {
      dot: "bg-red-500 dark:bg-red-400",
      border: "border-red-400/70",
    },
    "Digital Marketing": {
      dot: "bg-yellow-400 dark:bg-yellow-300",
      border: "border-yellow-400/70",
    },
    "Cloud Computing": {
      dot: "bg-indigo-500 dark:bg-indigo-400",
      border: "border-indigo-400/70",
    },
    "IoT & Embedded Systems": {
      dot: "bg-pink-500 dark:bg-pink-400",
      border: "border-pink-400/70",
    },
    "Blockchain & Cryptocurrency": {
      dot: "bg-orange-500 dark:bg-orange-400",
      border: "border-orange-400/70",
    },
  };

  const getTrackStyle = (track: string) =>
    trackStyleMap[track] || {
      dot: "bg-gray-400 dark:bg-gray-500",
      border: "border-gray-300/80",
    };

  const getBreakHoursNumeric = (
    value?: number | string | null
  ): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    const numValue = parseFloat(value.trim());
    return !isNaN(numValue) ? numValue : null;
  };

  const formatBreakHours = (value?: number | string | null) => {
    const numValue = getBreakHoursNumeric(value);
    if (numValue === null) {
      return null;
    }
    const hours = Math.floor(numValue);
    const minutes = Math.round((numValue - hours) * 60);
    if (hours === 0 && minutes === 0) {
      return "0:00";
    }
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  type RankBadgeMeta = {
    badge: string;
    icon?: ReactNode;
  };

  const getRankBadgeMeta = (rank?: number): RankBadgeMeta => {
    if (!rank) {
      return {
        badge: "bg-muted/30 text-muted-foreground border-border/50",
      };
    }
    if (rank === 1) {
      return {
        badge:
          "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 border border-amber-200 shadow-[0_1px_6px_rgba(251,191,36,0.18)]",
        icon: <IconCrown className="size-3.5 text-amber-600" />,
      };
    }
    if (rank === 2) {
      return {
        badge:
          "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-900 border border-slate-200 shadow-[0_1px_6px_rgba(148,163,184,0.18)]",
        icon: <IconMedal className="size-3.5 text-slate-500" />,
      };
    }
    if (rank === 3) {
      return {
        badge:
          "bg-gradient-to-r from-orange-50 to-amber-100 text-orange-900 border border-orange-200 shadow-[0_1px_6px_rgba(249,115,22,0.18)]",
        icon: <IconAward className="size-3.5 text-orange-500" />,
      };
    }
    return {
      badge: "bg-muted/20 text-foreground border-border/60",
    };
  };

  const availableWeeks = WEEK_OPTIONS;

  const weekPeriodLabel = useMemo(() => {
    if (!weekPeriod || (!weekPeriod.from && !weekPeriod.to)) {
      return null;
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formatDate = (value?: string | null) => {
      if (!value) {
        return null;
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return formatter.format(date);
    };
    const fromLabel = formatDate(weekPeriod.from);
    const toLabel = formatDate(weekPeriod.to);
    if (fromLabel && toLabel) {
      return `${fromLabel} – ${toLabel}`;
    }
    return fromLabel || toLabel || null;
  }, [weekPeriod]);

  useEffect(() => {
    fetchTraineePerformance();
  }, [fetchTraineePerformance]);

  useEffect(() => {
    if (!availableTracks.length) {
      return;
    }
    if (!selectedTrack || !availableTracks.includes(selectedTrack)) {
      setSelectedTrack(availableTracks[0]);
    }
  }, [availableTracks, selectedTrack]);

  useEffect(() => {
    if (!selectedTrack || !hasInitializedTracks) {
      return;
    }
    const weeks = parseSelectedWeek();
    if (!weeks || weeks.length === 0) {
      setWeekPeriod(null);
    }
    fetchTraineePerformance({
      track: selectedTrack,
      weeks,
    });
  }, [
    selectedTrack,
    selectedWeek,
    hasInitializedTracks,
    fetchTraineePerformance,
  ]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return (
        <IconArrowsSort
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      );
    }
    return sortConfig.direction === "asc" ? (
      <IconArrowUp className="size-3.5 text-primary" aria-hidden="true" />
    ) : (
      <IconArrowDown className="size-3.5 text-primary" aria-hidden="true" />
    );
  };

  const renderSortButton = (
    label: string,
    key: SortKey,
    alignment: "left" | "center" | "right" = "center"
  ) => {
    const alignmentClass =
      alignment === "left"
        ? "justify-start"
        : alignment === "right"
        ? "justify-end"
        : "justify-center";
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${alignmentClass} ${
          sortConfig.key === key ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span>{label}</span>
        {renderSortIcon(key)}
      </button>
    );
  };

  // Filter logic
  const filteredTrainees = useMemo(() => {
    const filtered = trainees.filter((trainee) => {
      const matchesTrack = !selectedTrack || trainee.track === selectedTrack;
      return matchesTrack;
    });

    const getRank = (trainee: Trainee) =>
      trainee.rank ?? Number.MAX_SAFE_INTEGER;

    const getNameValue = (trainee: Trainee) =>
      (trainee.full_name || trainee.name || "").toLowerCase();

    const getAttendanceRate = (trainee: Trainee) => {
      const totalDays = trainee.attendance_days + trainee.absent_days;
      if (totalDays === 0) {
        return null;
      }
      return (trainee.attendance_days / totalDays) * 100;
    };

    const getImprovementPercentage = (trainee: Trainee) => {
      if (
        trainee.improvement_sum === undefined ||
        trainee.improvement_sum === null ||
        trainee.total_post_score === undefined ||
        trainee.total_post_score === null ||
        trainee.total_post_score === 0
      ) {
        return null;
      }
      return (trainee.improvement_sum / trainee.total_post_score) * 100;
    };

    const getModuleOrderValue = (trainee: Trainee) =>
      trainee.module_orders.length > 0
        ? trainee.order_sum
        : Number.MAX_SAFE_INTEGER;

    const getBreakHoursValue = (trainee: Trainee) => {
      const breakHoursValue =
        trainee.total_break_time ??
        trainee.total_break_hours ??
        trainee.break_hours ??
        null;
      return getBreakHoursNumeric(breakHoursValue);
    };

    const getSortValue = (trainee: Trainee) => {
      switch (sortConfig.key) {
        case "rank":
          return getRank(trainee);
        case "name":
          return getNameValue(trainee);
        case "attendance":
          return getAttendanceRate(trainee);
        case "breakHours":
          return getBreakHoursValue(trainee);
        case "improvement":
          return getImprovementPercentage(trainee);
        case "modules":
          return getModuleOrderValue(trainee);
        default:
          return null;
      }
    };

    const compareValues = (
      valueA: string | number | null,
      valueB: string | number | null
    ) => {
      if (valueA === valueB) {
        return 0;
      }
      if (valueA === null || valueA === undefined) {
        return 1;
      }
      if (valueB === null || valueB === undefined) {
        return -1;
      }
      if (typeof valueA === "string" && typeof valueB === "string") {
        return valueA.localeCompare(valueB, undefined, { sensitivity: "base" });
      }
      return (valueA as number) - (valueB as number);
    };

    const directionFactor = sortConfig.direction === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);
      const comparison = compareValues(valueA, valueB);
      if (comparison !== 0) {
        return comparison * directionFactor;
      }
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return getNameValue(a).localeCompare(getNameValue(b));
    });
  }, [trainees, selectedTrack, selectedWeek, sortConfig, getBreakHoursNumeric]);

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
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Track Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                {t("pages.trainee_monitoring.trackFilter")}
              </span>
              <Select
                value={selectedTrack || undefined}
                onValueChange={(value) => setSelectedTrack(value)}
                disabled={availableTracks.length === 0}
              >
                <SelectTrigger className="min-w-[220px]">
                  <SelectValue
                    placeholder={
                      availableTracks.length === 0
                        ? t("pages.trainee_monitoring.noTracksAvailable")
                        : t("pages.trainee_monitoring.selectTrack")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableTracks.map((track) => {
                    const trackStyle = getTrackStyle(track);
                    return (
                      <SelectItem key={track} value={track}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${trackStyle.dot}`}
                          />
                          <span>{track}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* Week Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                {t("pages.trainee_monitoring.weekFilter")}
              </span>
              <Select
                value={selectedWeek}
                onValueChange={(value) => setSelectedWeek(value)}
              >
                <SelectTrigger className="min-w-[220px]">
                  <SelectValue
                    placeholder={t("pages.trainee_monitoring.allWeeks")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("pages.trainee_monitoring.allWeeks")}
                  </SelectItem>
                  {availableWeeks.map((week) => (
                    <SelectItem key={week} value={week}>
                      {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {selectedWeek !== "all" && weekPeriodLabel && (
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-2 text-sm text-foreground w-fit">
            <IconCalendar className="size-4 text-muted-foreground" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-muted-foreground">
                {t("pages.trainee_monitoring.weekPeriodLabel", {
                  defaultValue: "Week period",
                })}
                :
              </span>
              <span className="font-semibold text-foreground">
                {weekPeriodLabel}
              </span>
            </div>
          </div>
        )}
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
                  {renderSortButton(t("table.headers.rank"), "rank")}
                </TableHead>
                {/* Name column: left-align header and cells for better visual consistency */}
                <TableHead className="text-left">
                  <div className="flex items-center justify-start gap-2">
                    {renderSortButton(t("table.headers.name"), "name", "left")}
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
                  {renderSortButton(
                    t("pages.trainee_monitoring.attendanceStats"),
                    "attendance"
                  )}
                </TableHead>
                <TableHead className="text-center">
                  {renderSortButton(
                    t("pages.trainee_monitoring.breakHours"),
                    "breakHours"
                  )}
                </TableHead>
                <TableHead className="text-center">
                  {renderSortButton(
                    t("pages.trainee_monitoring.improvementPercentage"),
                    "improvement"
                  )}
                </TableHead>
                <TableHead className="text-center">
                  {renderSortButton("Module Orders", "modules")}
                </TableHead>
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
                  const rank = trainee.rank ?? null;
                  const breakHoursValue =
                    trainee.total_break_time ??
                    trainee.total_break_hours ??
                    trainee.break_hours ??
                    null;
                  const breakHoursNumeric =
                    getBreakHoursNumeric(breakHoursValue);
                  const breakHours = formatBreakHours(breakHoursValue);
                  const isBreakHoursOverLimit =
                    breakHoursNumeric !== null && breakHoursNumeric > 4;
                  const badgeMeta = getRankBadgeMeta(rank);

                  return (
                    <TableRow key={trainee.user_id}>
                      <TableCell className="text-center font-semibold">
                        {rank ? (
                          <div className="inline-flex items-center justify-center">
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tracking-tight ${badgeMeta.badge}`}
                            >
                              {badgeMeta.icon}#{rank}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {/* Name column cells aligned with header (left) */}
                      <TableCell className="text-left">
                        <Link
                          to={`/candidates/${trainee.user_id}`}
                          className="group flex items-center justify-start gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`View ${
                            trainee.full_name || trainee.name || "trainee"
                          } details`}
                        >
                          <ConsistentAvatar
                            user={{
                              name: trainee.full_name || trainee.name || "-",
                              email: trainee.email,
                              avatar: trainee.avatar,
                            }}
                            className="size-8"
                          />
                          <div
                            className="font-medium text-center group-hover:text-primary"
                            dir="rtl"
                          >
                            <span className="text-base">
                              {trainee.full_name || trainee.name || "-"}
                            </span>
                          </div>
                        </Link>
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
                          <span
                            className={`text-sm font-medium ${
                              isBreakHoursOverLimit
                                ? "text-red-600 dark:text-red-400"
                                : ""
                            }`}
                          >
                            {breakHours}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {trainee.improvement_sum !== undefined &&
                        trainee.improvement_sum !== null &&
                        trainee.total_post_score !== undefined &&
                        trainee.total_post_score !== null &&
                        trainee.total_post_score > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="text-sm font-medium">
                              <span
                                className={
                                  trainee.improvement_sum >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                }
                              >
                                {trainee.improvement_sum >= 0 ? "+" : ""}
                                {(
                                  (trainee.improvement_sum /
                                    trainee.total_post_score) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {trainee.improvement_sum >= 0 ? "+" : ""}
                              {trainee.improvement_sum} /{" "}
                              {trainee.total_post_score}
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col gap-0.5 items-center cursor-help">
                                <div className="text-sm font-medium">
                                  {trainee.order_sum}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {trainee.module_orders.length}{" "}
                                  {trainee.module_orders.length === 1
                                    ? "module"
                                    : "modules"}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <div className="flex flex-col gap-1.5">
                                {trainee.module_orders.map((order) => {
                                  const getOrderColor = (orderNum: number) => {
                                    if (orderNum === 1) {
                                      return "text-amber-300 dark:text-amber-400";
                                    }
                                    if (orderNum === 2) {
                                      return "text-slate-300 dark:text-slate-400";
                                    }
                                    if (orderNum === 3) {
                                      return "text-orange-300 dark:text-orange-400";
                                    }
                                    return "text-primary-foreground";
                                  };
                                  return (
                                    <div
                                      key={order.module_id}
                                      className="text-left break-words leading-relaxed"
                                    >
                                      <span
                                        className={`font-semibold ${getOrderColor(
                                          order.order
                                        )}`}
                                      >
                                        {order.order}
                                      </span>
                                      <span className="text-primary-foreground/70 mx-1.5">
                                        -
                                      </span>
                                      <span className="text-primary-foreground/90 break-words">
                                        {order.module_title}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </TooltipContent>
                          </Tooltip>
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
