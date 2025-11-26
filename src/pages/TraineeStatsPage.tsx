import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getTraineeStats,
  type TraineeStatsAdditionalInformation,
  type TraineeStatsModule,
  type TraineeStatsResponse,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarStats,
  IconChartBar,
  IconGauge,
  IconPhone,
  IconMail,
  IconBrandGithub,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import type { Icon as TablerIcon } from "@tabler/icons-react";

type StatCardProps = {
  title: string;
  value: string;
  helper?: string;
  icon: TablerIcon;
  accent?: "pink" | "blue" | "green" | "amber";
};

const accentMap: Record<
  NonNullable<StatCardProps["accent"]>,
  { bg: string; icon: string; border: string }
> = {
  pink: {
    bg: "from-pink-500/20 to-purple-500/10",
    icon: "text-pink-500",
    border: "border-pink-200/60 dark:border-pink-500/30",
  },
  blue: {
    bg: "from-sky-500/20 to-blue-500/10",
    icon: "text-sky-500",
    border: "border-sky-200/60 dark:border-sky-500/30",
  },
  green: {
    bg: "from-emerald-500/20 to-lime-500/10",
    icon: "text-emerald-500",
    border: "border-emerald-200/60 dark:border-emerald-500/30",
  },
  amber: {
    bg: "from-amber-500/20 to-orange-500/10",
    icon: "text-amber-500",
    border: "border-amber-200/60 dark:border-amber-500/30",
  },
};

function StatCard({ title, value, helper, icon: Icon, accent = "blue" }: StatCardProps) {
  const accentClasses = accentMap[accent];
  return (
    <Card className={cn("border-dashed", accentClasses.border)}>
      <CardHeader className="gap-3 pb-0">
        <div
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br",
            accentClasses.bg,
            accentClasses.icon
          )}
        >
          <Icon className="size-5" />
        </div>
        <CardTitle className="text-base font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-3xl font-semibold text-foreground">
          {value}
        </CardDescription>
      </CardHeader>
      {helper && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{helper}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function TraineeStatsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TraineeStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTraineeStats();
        if (!cancelled) {
          setStats(response);
        }
      } catch (err) {
        const message =
          (err as Error)?.message ||
          t("pages.traineeStats.statsUnavailable", {
            defaultValue: "Unable to load stats.",
          });
        if (!cancelled) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const additional = stats?.user.additional_fields ?? {};
  const additionalInfo = (additional.additional_information ??
    {}) as NonNullable<TraineeStatsAdditionalInformation>;
  const trackName = (additional?.Track as string) || "";
  const universityName = (additionalInfo?.institutionName as string) || "";

  const sortedModules = useMemo(() => {
    if (!stats?.modules) return [];
    return [...stats.modules].sort((a, b) => a.module_order - b.module_order);
  }, [stats]);

  const totalPreMax = useMemo(() => {
    if (!stats?.modules) return 0;
    return stats.modules.reduce((sum, module) => sum + (module.pre_score_max || 0), 0);
  }, [stats]);

  const overallImprovementPercent = useMemo(() => {
    if (!stats?.total_post_score) return 0;
    if (!stats.improvement_sum) return 0;
    return Math.round((stats.improvement_sum / stats.total_post_score) * 100);
  }, [stats]);

  const moduleCompletion = useMemo(() => {
    if (!stats?.modules) return { completed: 0, total: 0 };
    const total = stats.modules.length;
    const completed = stats.modules.filter(
      (module) => module.post_score_total > 0 || module.post_score_max === 0
    ).length;
    return { completed, total };
  }, [stats]);

  const formatDate = (value?: string | null) => {
    if (!value) return t("pages.traineeStats.notAvailable", { defaultValue: "N/A" });
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatDurationFromHours = (hours?: number | null) => {
    if (hours == null || Number.isNaN(hours)) return "0h";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto px-6 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">
          {t("pages.traineeStats.title", { defaultValue: "My Stats" })}
        </h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              {error ||
                t("pages.traineeStats.statsUnavailable", {
                  defaultValue: "Unable to load your stats. Please try again later.",
                })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("pages.traineeStats.title", { defaultValue: "My Stats" })}
        </h1>
        <p className="text-muted-foreground">
          {t("pages.traineeStats.subtitle", {
            defaultValue: "Get a quick overview of your track progress and profile details.",
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("pages.traineeStats.updatedAuto", {
            defaultValue: "Data refreshes automatically after each pre/post submission.",
          })}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg">
              {stats.user.avatar ? (
                <AvatarImage src={stats.user.avatar} alt={stats.user.name} />
              ) : null}
              <AvatarFallback className="text-2xl font-semibold">
                {stats.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">
                {additional?.Track || t("pages.traineeStats.notAvailable", { defaultValue: "N/A" })}
              </p>
              <h2 className="text-xl font-semibold">{additional?.full_name_en || stats.user.name}</h2>
              {additional?.full_name && (
                <p className="text-sm text-muted-foreground">{additional.full_name}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {trackName && (
                  <Badge variant="secondary">
                    {trackName}
                  </Badge>
                )}
                {universityName && (
                  <Badge variant="outline">
                    {universityName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <InfoItem
              icon={IconMail}
              label={t("common.labels.email", { defaultValue: "Email" })}
              value={stats.user.email}
            />
            <InfoItem
              icon={IconPhone}
              label={t("common.labels.phone", { defaultValue: "Phone" })}
              value={(additional?.phone as string) || t("pages.traineeStats.notAvailable", { defaultValue: "N/A" })}
            />
            <InfoItem
              icon={IconBrandGithub}
              label="GitHub"
              value={(additional?.github as string) || ""}
            />
            <InfoItem
              icon={IconBrandLinkedin}
              label="LinkedIn"
              value={(additional?.linkedin as string) || ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("pages.traineeStats.preScore", { defaultValue: "Total PRE Score" })}
          value={
            totalPreMax
              ? `${stats.pre_score_sum || 0}/${totalPreMax}`
              : `${stats.pre_score_sum || 0}`
          }
          helper={
            totalPreMax
              ? t("pages.traineeStats.preHelper", {
                  defaultValue: "Before module assessments",
                })
              : undefined
          }
          icon={IconGauge}
          accent="amber"
        />
        <StatCard
          title={t("pages.traineeStats.postScore", { defaultValue: "Total POST Score" })}
          value={
            stats.total_post_score
              ? `${stats.post_score_sum || 0}/${stats.total_post_score}`
              : `${stats.post_score_sum || 0}`
          }
          helper={
            stats.total_post_score
              ? t("pages.traineeStats.postScoreOutOf", {
                  defaultValue: "Out of {{max}}",
                  max: stats.total_post_score || 0,
                })
              : undefined
          }
          icon={IconChartBar}
          accent="blue"
        />
        <StatCard
          title={t("pages.traineeStats.improvement", { defaultValue: "Overall Improvement" })}
          value={
            overallImprovementPercent
              ? `${overallImprovementPercent > 0 ? "+" : ""}${overallImprovementPercent}%`
              : `+${stats.improvement_sum || 0}`
          }
          helper={
            overallImprovementPercent
              ? t("pages.traineeStats.improvementHelperPercent", {
                  defaultValue: "Vs total PRE score",
                })
              : t("pages.traineeStats.improvementHelper", {
                  defaultValue: "Across all completed modules",
                })
          }
          icon={IconArrowUpRight}
          accent="green"
        />
        <StatCard
          title={t("pages.traineeStats.moduleCompletion", {
            defaultValue: "Modules Completed",
          })}
          value={
            moduleCompletion.total
              ? `${moduleCompletion.completed}/${moduleCompletion.total}`
              : `${moduleCompletion.completed}`
          }
          helper={t("pages.traineeStats.postCompletionHelper", {
            defaultValue: "Finished modules vs total weeks",
          })}
          icon={IconCalendarStats}
          accent="pink"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>
            {t("pages.traineeStats.modules", { defaultValue: "Module Performance" })}
          </CardTitle>
          <CardDescription>
            {t("pages.traineeStats.modulesHelper", {
              defaultValue: "Compare your PRE vs POST scores and track weekly improvements.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pages.traineeStats.noModuleData", {
                defaultValue: "No module performance data yet.",
              })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pages.traineeStats.week", { defaultValue: "Week" })}</TableHead>
                  <TableHead>{t("pages.traineeStats.preScore", { defaultValue: "PRE Score" })}</TableHead>
                  <TableHead>{t("pages.traineeStats.postScore", { defaultValue: "POST Score" })}</TableHead>
                  <TableHead>{t("pages.traineeStats.improvement", { defaultValue: "Improvement" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModules.map((module) => (
                  <ModuleRow key={module.module_id} module={module} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {t("pages.traineeStats.currentWeek", { defaultValue: "Current Week" })}
            </CardTitle>
            <CardDescription>
              {stats.current_week
                ? `${formatDate(stats.current_week.week_start)} → ${formatDate(
                    stats.current_week.week_end
                  )}`
                : t("pages.traineeStats.notAvailable", { defaultValue: "N/A" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-3">
              <span className="text-muted-foreground">
                {t("pages.traineeStats.breakHours", { defaultValue: "Break hours" })}
              </span>
              <strong>{formatDurationFromHours(stats.current_week?.break_hours ?? 0)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: TablerIcon;
  label: string;
  value: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-muted/50 px-3 py-2">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

function ModuleRow({ module }: { module: TraineeStatsModule }) {
  const prePercent = module.pre_score_max
    ? Math.round((module.pre_score_total / module.pre_score_max) * 100)
    : 0;
  const postPercent = module.post_score_max
    ? Math.round((module.post_score_total / module.post_score_max) * 100)
    : 0;
  const isPositive = module.improvement >= 0;
  const percent = Math.round(module.improvement_percentage);

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{module.module_title}</span>
          <span className="text-xs text-muted-foreground">
            {module.track || `Week ${module.module_order}`}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Progress value={prePercent} label={`${module.pre_score_total}/${module.pre_score_max}`} />
      </TableCell>
      <TableCell>
        <Progress value={postPercent} label={`${module.post_score_total}/${module.post_score_max}`} />
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {isPositive ? (
            <IconArrowUpRight className="size-3.5" />
          ) : (
            <IconArrowDownRight className="size-3.5" />
          )}
          {`${isPositive ? "+" : "-"}${Math.abs(module.improvement)} (${isPositive ? "+" : "-"}${Math.abs(percent)}%)`}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

