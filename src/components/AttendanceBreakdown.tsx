import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconCalendar, IconClock, IconCheck, IconX, IconChevronDown, IconChevronUp, IconSearch, IconFilter } from "@tabler/icons-react";
import type { AttendanceLog } from "@/lib/api";
import { Loader } from "@/components/ui/loader";

interface AttendanceBreakdownProps {
  userId: string;
  className?: string;
  attendanceLog?: {
    attendance_days: number;
    absent_days: number;
    events: Array<{
      event_id: number;
      event_title: string;
      start_time: string;
      end_time: string;
      attended_days: Array<{
        date: string;
        check_in: string;
        check_out: string;
      }>;
      absent_days: Array<{
        date: string;
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
  status: 'present' | 'absent' | 'partial';
  events: Array<{
    eventId: number;
    eventTitle: string;
    startTime: string;
    endTime: string;
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
  const [filteredDays, setFilteredDays] = useState<AttendanceDay[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent" | "partial">("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

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

  // Filter attendance days based on search and filters
  useEffect(() => {
    let filtered = attendanceDays;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(day => 
        day.date.toLowerCase().includes(query) ||
        day.events.some(event => 
          event.eventTitle.toLowerCase().includes(query)
        )
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(day => day.status === statusFilter);
    }

    // Apply event filter
    if (eventFilter !== "all") {
      filtered = filtered.filter(day => 
        day.events.some(event => event.eventId.toString() === eventFilter)
      );
    }

    setFilteredDays(filtered);
  }, [attendanceDays, searchQuery, statusFilter, eventFilter]);

  const processNewAttendanceData = (attendanceLog: NonNullable<AttendanceBreakdownProps['attendanceLog']>) => {
    console.log("Processing new attendance data:", attendanceLog);
    
    // Create a map to track all unique dates across all events
    const allDates = new Set<string>();
    const eventDataByDate = new Map<string, Array<{
      eventId: number;
      eventTitle: string;
      startTime: string;
      endTime: string;
      checkInTime?: string;
      checkOutTime?: string;
      duration?: string;
    }>>();

    // Process each event
    attendanceLog.events.forEach(event => {
      // Add attended days
      event.attended_days.forEach(day => {
        allDates.add(day.date);
        if (!eventDataByDate.has(day.date)) {
          eventDataByDate.set(day.date, []);
        }
        
        const duration = calculateDuration(day.check_in, day.check_out);
        eventDataByDate.get(day.date)!.push({
          eventId: event.event_id,
          eventTitle: event.event_title,
          startTime: event.start_time,
          endTime: event.end_time,
          checkInTime: day.check_in,
          checkOutTime: day.check_out,
          duration,
        });
      });

      // Add absent days
      event.absent_days.forEach(day => {
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
    });

    // Convert to attendance days
    const days: AttendanceDay[] = Array.from(allDates).sort().map(date => {
      const events = eventDataByDate.get(date) || [];
      const hasCompleteAttendance = events.some(event => 
        event.checkInTime && event.checkOutTime
      );
      const hasPartialAttendance = events.some(event => 
        event.checkInTime && !event.checkOutTime
      );

      let status: 'present' | 'absent' | 'partial' = 'absent';
      if (hasCompleteAttendance) {
        status = 'present';
      } else if (hasPartialAttendance) {
        status = 'partial';
      }

      return {
        date,
        status,
        events,
      };
    });

    setAttendanceDays(days);
    setFilteredDays(days);

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

        // `log.event` can be either a number (event ID) or an AttendanceEvent object.
        // Safely derive the event metadata regardless of the shape.
        const isEventObject = typeof log.event !== "number";
        const eventId = isEventObject ? log.event.id : log.event;

        return {
          eventId,
          eventTitle:
            log.event_title ??
            (isEventObject ? log.event.title : `Event ${eventId}`),
          startTime: isEventObject ? log.event.start_time || "" : "",
          endTime: isEventObject ? log.event.end_time || "" : "",
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
    setFilteredDays(days);

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

        {/* Event-specific Statistics */}
        {attendanceLog && attendanceLog.events.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Event-wise Attendance Summary
            </div>
            <div className="grid gap-3">
              {attendanceLog.events.map((event) => {
                const totalEventDays = event.attended_days.length + event.absent_days.length;
                const eventAttendanceRate = totalEventDays > 0 ? (event.attended_days.length / totalEventDays) * 100 : 0;
                
                return (
                  <div key={event.event_id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{event.event_title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.start_time} - {event.end_time}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {event.attended_days.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Attended</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {event.absent_days.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {eventAttendanceRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Rate</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Attendance Progress</span>
                        <span>{eventAttendanceRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${eventAttendanceRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendance Trend Visualization */}
        {attendanceDays.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Attendance Trend (Last 7 Days)
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-end justify-between h-20 space-x-1">
                {attendanceDays.slice(-7).map((day, index) => {
                  const isPresent = day.status === 'present';
                  const isPartial = day.status === 'partial';
                  const height = isPresent ? 100 : isPartial ? 60 : 20;
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${
                          isPresent 
                            ? 'bg-green-500' 
                            : isPartial 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
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

        {/* Detailed Attendance History */}
        {isExpanded && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Daily Attendance Records ({filteredDays.length} of {attendanceDays.length})
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    placeholder="Search by date or event..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>

                {/* Event Filter */}
                {attendanceLog && attendanceLog.events.length > 0 && (
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {attendanceLog.events.map((event) => (
                        <SelectItem key={event.event_id} value={event.event_id.toString()}>
                          {event.event_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Clear Filters */}
                {(searchQuery || statusFilter !== "all" || eventFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setEventFilter("all");
                    }}
                    className="w-full sm:w-auto"
                  >
                    <IconFilter className="size-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            {filteredDays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-2">
                  {attendanceDays.length === 0 
                    ? "No attendance records found" 
                    : "No records match your filters"
                  }
                </div>
                <div className="text-sm">
                  {attendanceDays.length === 0 
                    ? "This user may not have any attendance records in the last 30 days."
                    : "Try adjusting your search or filter criteria."
                  }
                </div>
                {attendanceDays.length === 0 && (
                  <div className="text-xs mt-1">User ID: {userId}</div>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredDays.map((day, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      {getStatusBadge(day.status)}
                    </div>
                    
                    {day.events.length > 0 && (
                      <div className="space-y-2">
                        {day.events.map((event, eventIndex) => (
                          <div key={eventIndex} className="bg-muted/50 rounded p-3 space-y-2">
                            <div className="font-medium text-sm">{event.eventTitle}</div>
                            <div className="text-xs text-muted-foreground">
                              Scheduled: {event.startTime} - {event.endTime}
                            </div>
                            {event.checkInTime ? (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <IconClock className="size-3" />
                                  In: {event.checkInTime}
                                </div>
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
                            ) : (
                              <div className="text-xs text-red-500 dark:text-red-400">
                                <IconX className="size-3 inline mr-1" />
                                Absent
                              </div>
                            )}
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
