import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconClock, IconCheck, IconX, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { AttendanceLog } from "@/lib/api";
import { Loader } from "@/components/ui/loader";

interface AttendanceBreakdownProps {
  userId: string;
  className?: string;
  attendanceLog?: {
    attendance_days: number;
    absent_days: number;
    details: Array<{
      date: string;
      event: string;
      check_in: string | null;
      check_out: string | null;
      status: string | null;
      notes: string | null;
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
  status: 'present' | 'absent' | 'partial';
  events: Array<{
    event: string;
    checkInTime?: string;
    checkOutTime?: string;
    duration?: string;
  }>;
}

export function AttendanceBreakdown({ userId, className, attendanceLog }: AttendanceBreakdownProps) {
  const { t } = useTranslation();
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendanceRate: 0,
  });
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);

  useEffect(() => {
    const hydrateFromBackend = () => {
      if (attendanceLog && Array.isArray(attendanceLog.details)) {
        // Map backend attendance_log.details into AttendanceLog-like structure
        const mapped: AttendanceLog[] = attendanceLog.details.map((d, idx) => ({
          id: idx + 1,
          trainee: { id: Number(userId), name: "", email: "" },
          event: { id: idx + 1, title: d.event, start_time: "", end_time: "" },
          attendance_date: d.date,
          check_in_time: d.check_in ?? "",
          check_out_time: d.check_out,
          notes: d.notes ?? "",
        }));
        setAttendanceLogs(mapped);
        processAttendanceData(mapped);
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

  const processAttendanceData = (logs: AttendanceLog[]) => {
    console.log("Processing attendance data:", logs);
    
    // Group logs by date
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

    dates.forEach(date => {
      const dayLogs = logsByDate[date];
      const events = dayLogs.map(log => {
        const duration = log.check_out_time 
          ? calculateDuration(log.check_in_time, log.check_out_time)
          : undefined;
        
        return {
          event: log.event.title,
          checkInTime: log.check_in_time,
          checkOutTime: log.check_out_time || undefined,
          duration,
        };
      });

      // Determine status
      const hasCompleteAttendance = dayLogs.some(log => 
        log.check_in_time && log.check_out_time
      );
      const hasPartialAttendance = dayLogs.some(log => 
        log.check_in_time && !log.check_out_time
      );

      let status: 'present' | 'absent' | 'partial' = 'absent';
      if (hasCompleteAttendance) {
        status = 'present';
      } else if (hasPartialAttendance) {
        status = 'partial';
      }

      days.push({
        date,
        status,
        events,
      });
    });

    setAttendanceDays(days);

    // Calculate statistics - use backend values when available
    let totalDays, presentDays, absentDays, attendanceRate;
    
    if (attendanceLog && attendanceLog.attendance_days !== undefined && attendanceLog.absent_days !== undefined) {
      // Use backend values when available
      totalDays = attendanceLog.attendance_days + attendanceLog.absent_days;
      presentDays = attendanceLog.attendance_days;
      absentDays = attendanceLog.absent_days;
      attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    } else {
      // Fallback to calculated values from details
      totalDays = days.length;
      presentDays = days.filter(d => d.status === 'present').length;
      const partialDays = days.filter(d => d.status === 'partial').length;
      absentDays = days.filter(d => d.status === 'absent').length;
      attendanceRate = totalDays > 0 ? ((presentDays + partialDays * 0.5) / totalDays) * 100 : 0;
    }

    setStats({
      totalDays,
      presentDays,
      absentDays,
      attendanceRate,
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string): string => {
    const start = new Date(`2000-01-01T${checkIn}`);
    const end = new Date(`2000-01-01T${checkOut}`);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: 'present' | 'absent' | 'partial') => {
    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30">
            <IconCheck className="size-3 mr-1" />
            Present
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30">
            <IconClock className="size-3 mr-1" />
            Partial
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30">
            <IconX className="size-3 mr-1" />
            Absent
          </Badge>
        );
    }
  };

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
        <CardTitle className="flex items-center justify-between text-xl">
          <span className="flex items-center gap-2">
            <IconCalendar className="size-5" />
            Attendance History
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground"
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
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        {/* Detailed Attendance History */}
        {isExpanded && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Daily Attendance Records
            </div>
            {attendanceDays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-2">No attendance records found</div>
                <div className="text-sm">This user may not have any attendance records in the last 30 days.</div>
                <div className="text-xs mt-1">User ID: {userId}</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {attendanceDays.map((day, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      {getStatusBadge(day.status)}
                    </div>
                    
                    {day.events.length > 0 && (
                      <div className="space-y-2">
                        {day.events.map((event, eventIndex) => (
                          <div key={eventIndex} className="bg-muted/50 rounded p-3 space-y-1">
                            <div className="font-medium text-sm">{event.event}</div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {event.checkInTime && (
                                <div className="flex items-center gap-1">
                                  <IconClock className="size-3" />
                                  In: {event.checkInTime}
                                </div>
                              )}
                              {event.checkOutTime && (
                                <div className="flex items-center gap-1">
                                  <IconClock className="size-3" />
                                  Out: {event.checkOutTime}
                                </div>
                              )}
                              {event.duration && (
                                <div className="flex items-center gap-1">
                                  <IconCheck className="size-3" />
                                  Duration: {event.duration}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
