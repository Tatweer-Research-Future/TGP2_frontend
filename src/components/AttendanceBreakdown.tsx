import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCheck,
  IconCoffee,
  IconX,
} from "@tabler/icons-react";
import type { AttendanceLog, AttendanceEvent } from "@/lib/api";
import { Loader } from "@/components/ui/loader";

interface AttendanceBreakdownProps {
  userId: string;
  className?: string;
  attendanceLog?: {
    attendance_days: number;
    absent_days: number;
    total_break_hours?: number | string | null;
    days_with_breaks?: number | null;
    events: Array<{
      event_id: number;
      event_title: string;
      start_time: string;
      end_time: string;
      attended_days: Array<{
        date: string;
        check_in: string;
        check_out: string;
        break_time?: string | null;
        break_accumulated?: string | null;
        break_intervals?: Array<{
          start: string;
          end: string | null;
        }>;
      }>;
      absent_days: Array<{
        date: string;
      }>;
      flagged_days?: Array<{
        date: string;
        type?: string | null;
        break_hours?: number | string | null;
        check_in?: string | null;
        check_out?: string | null;
        break_intervals?: Array<{
          start: string;
          end: string | null;
        }>;
        notes?: string | null;
      }>;
    }>;
  } | null;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

interface AttendanceDay {
  date: string;
  status: "present" | "absent" | "partial";
  events: Array<{
    eventId: number;
    eventTitle: string;
    startTime: string;
    endTime: string;
    checkInTime?: string;
    checkOutTime?: string;
    duration?: string;
    breaks?: BreakIntervalEntry[];
    totalBreakDuration?: string | null;
  }>;
}

type BreakIntervalEntry = {
  start: string;
  end: string | null;
  durationLabel?: string | null;
  durationMs?: number | null;
};

type BreakEntry = {
  date: string;
  eventTitle: string;
  totalDuration?: string | null;
  totalDurationMs?: number | null;
  intervals: BreakIntervalEntry[];
};

type FlaggedBreakDay = {
  eventId: number;
  eventTitle: string;
  date: string;
  type?: string | null;
  breakHours?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  breakIntervals?: Array<{
    start: string;
    end: string | null;
  }>;
  notes?: string | null;
};

const WEEK_BREAK_LIMIT_HOURS = 4;

export function AttendanceBreakdown({
  userId,
  className,
  attendanceLog,
}: AttendanceBreakdownProps) {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendanceRate: 0,
  });
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [breakEntries, setBreakEntries] = useState<BreakEntry[]>([]);
  const [flaggedBreakDays, setFlaggedBreakDays] = useState<FlaggedBreakDay[]>(
    []
  );

  const breakStats = useMemo(() => {
    if (breakEntries.length === 0) {
      return {
        last7Ms: 0,
        last7Label: "-",
        totalMs: 0,
        totalLabel: "-",
      };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let last7Ms = 0;
    let totalMs = 0;
    breakEntries.forEach((entry) => {
      const entryMs = entry.totalDurationMs ?? 0;
      totalMs += entryMs;
      const entryDate = new Date(entry.date);
      if (entryDate >= sevenDaysAgo && entryDate <= now) {
        last7Ms += entryMs;
      }
    });

    return {
      last7Ms,
      last7Label: formatDurationFromMs(last7Ms) ?? "-",
      totalMs,
      totalLabel: formatDurationFromMs(totalMs) ?? "-",
    };
  }, [breakEntries]);

  const totalBreakHoursLabel =
    formatDecimalHours(normalizeHoursValue(attendanceLog?.total_break_hours)) ??
    breakStats.totalLabel;
  const flaggedDaysCount =
    attendanceLog?.days_with_breaks ??
    (flaggedBreakDays.length > 0 ? flaggedBreakDays.length : null);

  const weekOptions = useMemo(() => {
    const unique = new Map<
      string,
      { value: string; label: string; sort: number }
    >();
    flaggedBreakDays.forEach((entry) => {
      const meta = getWeekMetadata(entry.date);
      if (meta && !unique.has(meta.value)) {
        unique.set(meta.value, meta);
      }
    });
    return Array.from(unique.values()).sort((a, b) => b.sort - a.sort);
  }, [flaggedBreakDays]);

  const weeklyBreakTotals = useMemo(() => {
    const totals = new Map<string, number>();
    flaggedBreakDays.forEach((entry) => {
      const weekKey = getWeekKeyForDate(entry.date);
      if (!weekKey) {
        return;
      }
      const existing = totals.get(weekKey) ?? 0;
      totals.set(
        weekKey,
        existing + (normalizeHoursValue(entry.breakHours) ?? 0)
      );
    });
    return totals;
  }, [flaggedBreakDays]);

  const totalFlaggedBreakHours = useMemo(() => {
    return flaggedBreakDays.reduce((sum, entry) => {
      return sum + (normalizeHoursValue(entry.breakHours) ?? 0);
    }, 0);
  }, [flaggedBreakDays]);

  const filteredFlaggedDays = useMemo(() => {
    if (selectedWeek === "all") {
      return flaggedBreakDays;
    }
    return flaggedBreakDays.filter(
      (entry) => getWeekKeyForDate(entry.date) === selectedWeek
    );
  }, [flaggedBreakDays, selectedWeek]);

  const selectedWeekTotalHours =
    selectedWeek !== "all"
      ? weeklyBreakTotals.get(selectedWeek) ?? 0
      : null;
  const selectedWeekLabel =
    selectedWeekTotalHours != null
      ? formatDecimalHours(selectedWeekTotalHours) ?? "-"
      : null;

  useEffect(() => {
    if (selectedWeek === "all") return;
    const stillExists = weekOptions.some((option) => option.value === selectedWeek);
    if (!stillExists) {
      setSelectedWeek("all");
    }
  }, [selectedWeek, weekOptions]);

  useEffect(() => {
    const hydrateFromBackend = () => {
      if (attendanceLog && Array.isArray(attendanceLog.events)) {
        // Process the new event-based structure
        processNewAttendanceData(attendanceLog);
        setIsLoading(false);
        return true;
      }
      return false;
    };

    setIsLoading(true);
    if (hydrateFromBackend()) return;

    // Fallback: derive from overview if backend did not send attendance_log
    (async () => {
      try {
        const { getUserAttendanceFromOverview } = await import("@/lib/api");
        const logs = await getUserAttendanceFromOverview(userId);
        setAttendanceLogs(logs);
        processAttendanceData(logs);
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId, attendanceLog]);

  const processNewAttendanceData = (
    attendanceLog: NonNullable<AttendanceBreakdownProps["attendanceLog"]>
  ) => {
    console.log("Processing new attendance data:", attendanceLog);

    // Create a map to track all unique dates across all events
    const allDates = new Set<string>();
    const eventDataByDate = new Map<
      string,
      Array<{
        eventId: number;
        eventTitle: string;
        startTime: string;
        endTime: string;
        checkInTime?: string;
        checkOutTime?: string;
        duration?: string;
      }>
    >();

    // Process each event
    const aggregatedBreaks: BreakEntry[] = [];
    const flaggedBreakAlerts: FlaggedBreakDay[] = [];

    attendanceLog.events.forEach((event) => {
      const attendedDays = Array.isArray(event.attended_days)
        ? event.attended_days
        : [];
      const absentDays = Array.isArray(event.absent_days)
        ? event.absent_days
        : [];
      const flaggedDays = Array.isArray(event.flagged_days)
        ? event.flagged_days
        : [];

      // Add attended days
      attendedDays.forEach((day) => {
        allDates.add(day.date);
        if (!eventDataByDate.has(day.date)) {
          eventDataByDate.set(day.date, []);
        }

        const duration = calculateDuration(day.check_in, day.check_out);
        const breakInfo = extractBreakInfo(day);
        if (breakInfo) {
          aggregatedBreaks.push({
            date: day.date,
            eventTitle: event.event_title,
            totalDuration: breakInfo.totalLabel,
            totalDurationMs: breakInfo.totalMs,
            intervals: breakInfo.intervals,
          });
        }
        eventDataByDate.get(day.date)!.push({
          eventId: event.event_id,
          eventTitle: event.event_title,
          startTime: event.start_time,
          endTime: event.end_time,
          checkInTime: day.check_in,
          checkOutTime: day.check_out,
          duration,
          breaks: breakInfo?.intervals,
          totalBreakDuration: breakInfo?.totalLabel ?? null,
        });
      });

      // Add absent days
      absentDays.forEach((day) => {
        allDates.add(day.date);
        if (!eventDataByDate.has(day.date)) {
          eventDataByDate.set(day.date, []);
        }

        eventDataByDate.get(day.date)!.push({
          eventId: event.event_id,
          eventTitle: event.event_title,
          startTime: event.start_time,
          endTime: event.end_time,
        });
      });

      flaggedDays.forEach((day) => {
        const breakHoursNumeric = normalizeHoursValue(day.break_hours);
        flaggedBreakAlerts.push({
          eventId: event.event_id,
          eventTitle: event.event_title,
          date: day.date,
          type: day.type,
          breakHours: breakHoursNumeric,
          checkIn: day.check_in,
          checkOut: day.check_out,
          breakIntervals: day.break_intervals ?? [],
          notes: day.notes,
        });
      });
    });

    // Convert to attendance days
    const days: AttendanceDay[] = Array.from(allDates)
      .sort()
      .map((date) => {
        const events = eventDataByDate.get(date) || [];
        const hasCompleteAttendance = events.some(
          (event) => event.checkInTime && event.checkOutTime
        );
        const hasPartialAttendance = events.some(
          (event) => event.checkInTime && !event.checkOutTime
        );

        let status: "present" | "absent" | "partial" = "absent";
        if (hasCompleteAttendance) {
          status = "present";
        } else if (hasPartialAttendance) {
          status = "partial";
        }

        return {
          date,
          status,
          events,
        };
      });

    setAttendanceDays(days);
    setBreakEntries(sortBreakEntries(aggregatedBreaks));
    setFlaggedBreakDays(
      flaggedBreakAlerts
        .slice()
        .sort(
          (a, b) => getSortableTime(b.date) - getSortableTime(a.date)
        )
    );

    // Calculate statistics using backend values
    const totalDays = attendanceLog.attendance_days + attendanceLog.absent_days;
    const presentDays = attendanceLog.attendance_days;
    const absentDays = attendanceLog.absent_days;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    setStats({
      totalDays,
      presentDays,
      absentDays,
      attendanceRate,
    });
  };

  const processAttendanceData = (logs: AttendanceLog[]) => {
    console.log("Processing attendance data:", logs);

    // Group logs by date
    const aggregatedBreaks: BreakEntry[] = [];

    const logsByDate = logs.reduce((acc, log) => {
      const date = log.attendance_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<string, AttendanceLog[]>);

    console.log("Grouped logs by date:", logsByDate);

    // Process each date
    const days: AttendanceDay[] = [];
    const dates = Object.keys(logsByDate).sort();

    dates.forEach((date) => {
      const dayLogs = logsByDate[date];
      const events = dayLogs.map((log) => {
        const duration = log.check_out_time
          ? calculateDuration(log.check_in_time, log.check_out_time)
          : undefined;
        const breakInfo = extractBreakInfo(log);
        if (breakInfo) {
          aggregatedBreaks.push({
            date,
            eventTitle:
              log.event_title ??
              (typeof log.event !== "number"
                ? (log.event as AttendanceEvent)?.title ?? "Event"
                : `Event ${log.event}`),
            totalDuration: breakInfo.totalLabel,
            totalDurationMs: breakInfo.totalMs,
            intervals: breakInfo.intervals,
          });
        }

        // `log.event` can be either a number (event ID) or an AttendanceEvent object.
        // Safely derive the event metadata regardless of the shape.
        const isEventObject = typeof log.event !== "number";
        const eventObj: AttendanceEvent | null = isEventObject
          ? (log.event as AttendanceEvent)
          : null;
        const eventId =
          isEventObject && eventObj ? eventObj.id : (log.event as number);

        return {
          eventId,
          eventTitle:
            log.event_title ?? (eventObj ? eventObj.title : `Event ${eventId}`),
          startTime: eventObj?.start_time ?? "",
          endTime: eventObj?.end_time ?? "",
          checkInTime: log.check_in_time,
          checkOutTime: log.check_out_time || undefined,
          duration,
          breaks: breakInfo?.intervals,
          totalBreakDuration: breakInfo?.totalLabel ?? null,
        };
      });

      // Determine status
      const hasCompleteAttendance = dayLogs.some(
        (log) => log.check_in_time && log.check_out_time
      );
      const hasPartialAttendance = dayLogs.some(
        (log) => log.check_in_time && !log.check_out_time
      );

      let status: "present" | "absent" | "partial" = "absent";
      if (hasCompleteAttendance) {
        status = "present";
      } else if (hasPartialAttendance) {
        status = "partial";
      }

      days.push({
        date,
        status,
        events,
      });
    });

    setAttendanceDays(days);
    setBreakEntries(sortBreakEntries(aggregatedBreaks));
    setFlaggedBreakDays([]);

    // Calculate statistics - use backend values when available
    let totalDays, presentDays, absentDays, attendanceRate;

    if (
      attendanceLog &&
      attendanceLog.attendance_days !== undefined &&
      attendanceLog.absent_days !== undefined
    ) {
      // Use backend values when available
      totalDays = attendanceLog.attendance_days + attendanceLog.absent_days;
      presentDays = attendanceLog.attendance_days;
      absentDays = attendanceLog.absent_days;
      attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    } else {
      // Fallback to calculated values from details
      totalDays = days.length;
      presentDays = days.filter((d) => d.status === "present").length;
      const partialDays = days.filter((d) => d.status === "partial").length;
      absentDays = days.filter((d) => d.status === "absent").length;
      attendanceRate =
        totalDays > 0
          ? ((presentDays + partialDays * 0.5) / totalDays) * 100
          : 0;
    }

    setStats({
      totalDays,
      presentDays,
      absentDays,
      attendanceRate,
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string): string => {
    const diffMs = calculateDurationMs(checkIn, checkOut);
    return diffMs != null ? formatDurationFromMs(diffMs) ?? "0m" : "0m";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: "present" | "absent" | "partial") => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30">
            <IconCheck className="size-3 mr-1" />
            Present
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30">
            <IconClock className="size-3 mr-1" />
            Partial
          </Badge>
        );
      case "absent":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30">
            <IconX className="size-3 mr-1" />
            Absent
          </Badge>
        );
    }
  };

  const formatTimeLabel = (value?: string | null): string => {
    if (!value) return "-";
    const parsed = parseDateValue(value);
    if (!parsed) return value || "-";
    return parsed.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const extractBreakInfo = (
    source?:
      | {
          break_intervals?: Array<{ start: string; end: string | null }>;
          break_time?: string | null;
          break_accumulated?: string | null;
        }
      | undefined
  ): {
    intervals: BreakIntervalEntry[];
    totalLabel: string | null;
    totalMs: number | null;
  } | null => {
    if (!source) return null;
    const rawIntervals = source.break_intervals ?? [];
    const intervals = rawIntervals.map((interval) => {
      const durationMs =
        interval.end != null
          ? calculateDurationMs(interval.start, interval.end)
          : null;
      return {
        start: interval.start,
        end: interval.end,
        durationLabel:
          durationMs != null ? formatDurationFromMs(durationMs) : null,
        durationMs,
      };
    });

    const totalFromSource = formatClockDuration(
      source.break_time ?? source.break_accumulated ?? null
    );
    if (intervals.length === 0 && !totalFromSource) {
      return null;
    }

    const totalMsFromSource = parseClockDurationToMs(
      source.break_time ?? source.break_accumulated ?? null
    );
    const summedMs = rawIntervals.reduce((sum, interval) => {
      const diff = interval.end
        ? calculateDurationMs(interval.start, interval.end)
        : null;
      return sum + (diff ?? 0);
    }, 0);

    const effectiveTotalMs =
      totalMsFromSource != null && totalMsFromSource > 0
        ? totalMsFromSource
        : summedMs;

    const totalLabel =
      totalFromSource ??
      (effectiveTotalMs > 0 ? formatDurationFromMs(effectiveTotalMs) : null);

    return {
      intervals,
      totalLabel: totalLabel ?? null,
      totalMs: effectiveTotalMs > 0 ? effectiveTotalMs : null,
    };
  };

  const formatClockDuration = (value: string | null): string | null => {
    if (!value) return null;
    const parts = value.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) {
      return value;
    }
    const [hours, minutes, seconds] = [
      parts[0] ?? 0,
      parts[1] ?? 0,
      parts[2] ?? 0,
    ];
    const totalMs =
      hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
    return formatDurationFromMs(totalMs) ?? value;
  };

  const parseClockDurationToMs = (value: string | null): number | null => {
    if (!value) return null;
    const parts = value.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [hours, minutes, seconds] = [
      parts[0] ?? 0,
      parts[1] ?? 0,
      parts[2] ?? 0,
    ];
    return hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
  };

  const calculateDurationMs = (
    startValue: string,
    endValue: string | null
  ): number | null => {
    if (!startValue || !endValue) return null;
    const start = parseDateValue(startValue);
    const end = parseDateValue(endValue);
    if (!start || !end) return null;
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? diff : null;
  };

  const formatDurationFromMs = (diffMs: number): string | null => {
    if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0 && minutes === 0) return "Less than 1m";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  function parseDateValue(value: string | null | undefined): Date | null {
    if (!value) return null;
    const direct = new Date(value);
    if (!isNaN(direct.getTime())) return direct;
    const fallback = new Date(`2000-01-01T${value}`);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const getSortableTime = (value?: string | null): number => {
    const parsed = parseDateValue(value);
    return parsed ? parsed.getTime() : 0;
  };

  function getWeekMetadata(dateString: string) {
    const date = parseDateValue(dateString);
    if (!date) return null;
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `${formatWeekDate(start)} – ${formatWeekDate(end)}`;
    return {
      value: start.toISOString().slice(0, 10),
      label,
      sort: start.getTime(),
    };
  }

  function getWeekKeyForDate(dateString: string): string | null {
    const meta = getWeekMetadata(dateString);
    return meta?.value ?? null;
  }

  function normalizeHoursValue(value?: number | string | null): number | null {
    if (value == null) return null;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatDecimalHours(value?: number | null): string | null {
    if (value == null || Number.isNaN(value)) return null;
    const totalMinutes = Math.round(value * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60);
    if (hours === 0 && minutes === 0) return "0m";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  function sortBreakEntries(entries: BreakEntry[]): BreakEntry[] {
    if (entries.length === 0) return [];
    const sorted = entries
      .slice()
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    // Limit to most recent 6 entries for readability
    return sorted.slice(-6).reverse();
  }

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatWeekDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <IconCalendar className="size-5" />
          Attendance History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalDays}
            </div>
            <div className="text-sm text-muted-foreground">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.presentDays}
            </div>
            <div className="text-sm text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.absentDays}
            </div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.attendanceRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalBreakHoursLabel ?? "-"}
            </div>
            <div className="text-sm text-muted-foreground">Total Break Hours</div>
            {flaggedDaysCount != null && (
              <div className="text-xs text-muted-foreground">
                {flaggedDaysCount} day{flaggedDaysCount === 1 ? "" : "s"} flagged
              </div>
            )}
          </div>
        </div>

        {/* Break summaries */}
        {breakEntries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconCoffee className="size-4" />
              Recent Breaks
            </div>
            <div className="text-xs text-muted-foreground">
              Weekly total:{" "}
              <span className="font-semibold text-foreground">
                {breakStats.last7Label}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {breakEntries.map((entry, idx) => (
                <div
                  key={`${entry.date}-${entry.eventTitle}-${idx}`}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {formatDate(entry.date)}
                    </span>
                    <span>{entry.eventTitle}</span>
                  </div>
                  {entry.totalDuration && (
                    <div className="text-sm font-medium">
                      Total break: {entry.totalDuration}
                    </div>
                  )}
                  {entry.intervals.length > 0 && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {entry.intervals.map((interval, intervalIndex) => (
                        <div
                          key={`${interval.start}-${intervalIndex}`}
                          className="flex items-center justify-between"
                        >
                          <span>
                            {formatTimeLabel(interval.start)} -{" "}
                            {interval.end
                              ? formatTimeLabel(interval.end)
                              : "Ongoing"}
                          </span>
                          {interval.durationLabel && (
                            <span className="font-medium text-foreground/70">
                              {interval.durationLabel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Break & attendance alerts */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconCoffee className="size-4" />
                Break & Attendance Alerts
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {flaggedBreakDays.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <IconChevronUp className="size-4 mr-1" />
                        Hide details
                      </>
                    ) : (
                      <>
                        <IconChevronDown className="size-4 mr-1" />
                        Show details
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            {(weekOptions.length > 0 || totalFlaggedBreakHours > 0) && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs sm:text-sm flex flex-wrap items-center gap-4">
                {weekOptions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedWeek}
                      onValueChange={setSelectedWeek}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All weeks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All weeks</SelectItem>
                        {weekOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {weekOptions.length > 0 && (
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">
                      Selected week total
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedWeek === "all"
                        ? "All weeks"
                        : selectedWeekLabel || "-"}{" "}
                      {selectedWeek !== "all" && (
                        <span className="text-muted-foreground text-xs">
                          / {WEEK_BREAK_LIMIT_HOURS}h target
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">
                    Total flagged breaks
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatDecimalHours(totalFlaggedBreakHours) ?? "-"}
                  </div>
                </div>
              </div>
            )}
          </div>
          {flaggedBreakDays.length === 0 ? (
            <div className="text-sm text-muted-foreground border rounded-md px-4 py-4 text-center">
              {attendanceLog
                ? "No break or attendance issues have been reported recently."
                : "No backend break data available."}
            </div>
          ) : !isExpanded ? (
            <div className="text-xs text-muted-foreground border rounded-md px-4 py-3">
              {flaggedBreakDays.length} alert
              {flaggedBreakDays.length === 1 ? "" : "s"} detected. Use "Show details" to review break or absence notes.
            </div>
          ) : (
            <>
              {weekOptions.length > 1 && (
                <div className="flex justify-end">
                  <Select
                    value={selectedWeek}
                    onValueChange={setSelectedWeek}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All weeks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All weeks</SelectItem>
                      {weekOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredFlaggedDays.slice(0, 6).map((entry, idx) => {
                  const breakHoursLabel = formatDecimalHours(entry.breakHours);
                  const firstInterval = entry.breakIntervals?.[0];
                  const lastInterval =
                    entry.breakIntervals && entry.breakIntervals.length > 0
                      ? entry.breakIntervals[entry.breakIntervals.length - 1]
                      : null;
                  const breakStartLabel = firstInterval
                    ? formatTimeLabel(firstInterval.start)
                    : formatTimeLabel(entry.checkIn);
                  const breakEndLabel = lastInterval?.end
                    ? formatTimeLabel(lastInterval.end)
                    : formatTimeLabel(entry.checkOut);
                  return (
                    <div
                      key={`${entry.eventId}-${entry.date}-${idx}`}
                      className="border rounded-lg p-3 space-y-2 bg-muted/30"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">
                            {formatDate(entry.date)}
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-2 text-xs">
                          {entry.type && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {entry.type}
                            </Badge>
                          )}
                          {breakHoursLabel && (
                            <span className="text-sm font-semibold text-foreground">
                              {breakHoursLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">
                            Check-in:
                          </span>{" "}
                          {formatTimeLabel(entry.checkIn)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Check-out:
                          </span>{" "}
                          {formatTimeLabel(entry.checkOut)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Break start:
                          </span>{" "}
                          {breakStartLabel ?? "—"}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Break end:
                          </span>{" "}
                          {breakEndLabel ?? "—"}
                        </div>
                        {breakHoursLabel && (
                          <div>
                            <span className="font-medium text-foreground">
                              Break hours:
                            </span>{" "}
                            {breakHoursLabel}
                          </div>
                        )}
                      </div>
                      {entry.notes && entry.notes.trim() && (
                        <div className="text-xs italic text-muted-foreground">
                          Notes: {entry.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredFlaggedDays.length === 0 && (
                  <div className="text-sm text-muted-foreground border rounded-md px-4 py-4 text-center">
                    No alerts match the selected week.
                  </div>
                )}
                {filteredFlaggedDays.length > 6 && (
                  <div className="text-xs text-muted-foreground text-center">
                    Showing latest 6 of {filteredFlaggedDays.length} alerts
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Attendance Trend Visualization */}
        {attendanceDays.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Attendance Trend (Last 7 Days)
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-end justify-between h-20 space-x-1">
                {attendanceDays.slice(-7).map((day, index) => {
                  const isPresent = day.status === "present";
                  const isPartial = day.status === "partial";
                  const height = isPresent ? 100 : isPartial ? 60 : 20;

                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center space-y-1 flex-1"
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          isPresent
                            ? "bg-green-500"
                            : isPartial
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center mt-2 space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Present</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Partial</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Absent</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
