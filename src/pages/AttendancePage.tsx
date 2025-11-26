import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  IconClock,
  IconCalendar,
  IconUsers,
  IconSearch,
  IconDownload,
  IconDotsVertical,
  IconArrowBackUp,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { TimePickerDialog } from "@/components/TimePickerDialog";
import { AttendanceStatusBadge } from "@/components/AttendanceStatusBadge";
import { useUserGroups } from "@/hooks/useUserGroups";
import {
  getMyLogs,
  getEvents,
  getCandidates,
  submitCheckIn,
  submitCheckOut,
  submitAttendanceUpdate,
  exportAttendanceCSV,
  type AttendanceOverviewResponse,
  type AttendanceOverviewUser,
  type AttendanceLog,
  type AttendanceEvent,
  type BackendCandidate,
  type CheckInPayload,
  type CheckOutPayload,
} from "@/lib/api";

type OverviewUserWithMeta = AttendanceOverviewUser & {
  track?: string | null;
  phone?: string | null;
};

interface AttendanceData extends AttendanceOverviewResponse {
  users: OverviewUserWithMeta[];
}

function deriveTrackName(candidate: BackendCandidate): string | null {
  if (candidate.track) return candidate.track;
  if (candidate.groups && candidate.groups.length > 0) {
    const trackGroup = candidate.groups.find((group) =>
      group.toLowerCase().includes("track")
    );
    if (trackGroup) {
      const segments = trackGroup.split("->");
      return segments[segments.length - 1]?.trim() || trackGroup;
    }
  }
  return null;
}

function getEventId(log: AttendanceLog): number | null {
  if (typeof log.event === "number") {
    return log.event;
  }
  if (log.event && typeof log.event.id === "number") {
    return log.event.id;
  }
  return null;
}

function getTraineeId(log: AttendanceLog): number | null {
  if (typeof log.trainee === "number") return log.trainee;
  if (log.trainee && typeof log.trainee.id === "number") {
    return log.trainee.id;
  }
  return null;
}

function getTraineeName(log: AttendanceLog): string | null {
  if (typeof log.trainee !== "number") {
    return (
      (typeof log.trainee.full_name === "string" &&
        log.trainee.full_name.trim().length > 0 &&
        log.trainee.full_name) ||
      log.trainee.name ||
      log.trainee.email ||
      log.trainee_email ||
      null
    );
  }
  return log.trainee_full_name || log.trainee_name || log.trainee_email || null;
}

function getTraineeEmail(log: AttendanceLog): string | null {
  if (typeof log.trainee !== "number") {
    return log.trainee.email || log.trainee_email || null;
  }
  return log.trainee_email || null;
}

function timeStringToSeconds(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m, s] = time.split(":").map((part) => Number(part));
  if ([h, m, s].some((value) => Number.isNaN(value))) return null;
  return h * 3600 + m * 60 + s;
}

function formatBreakDuration(start: string, end: string | null): string {
  const startSeconds = timeStringToSeconds(start);
  const endSeconds = timeStringToSeconds(end);
  if (startSeconds == null || endSeconds == null) {
    return end ? "" : "In progress";
  }
  const diff = Math.max(endSeconds - startSeconds, 0);
  const hours = Math.floor(diff / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((diff % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(diff % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function buildOverviewFromLogs({
  logs,
  events,
  candidates,
  date,
}: {
  logs: AttendanceLog[];
  events: AttendanceEvent[];
  candidates: BackendCandidate[];
  date: string;
}): AttendanceData {
  const eventMap = new Map<number, AttendanceEvent>();
  events.forEach((event) => eventMap.set(event.id, event));
  logs.forEach((log) => {
    const eventId = getEventId(log);
    if (!eventId || eventMap.has(eventId)) return;
    const fallbackEvent: AttendanceEvent = {
      id: eventId,
      title:
        (typeof log.event !== "number" && log.event?.title) ||
        log.event_title ||
        `Event ${eventId}`,
      start_time:
        (typeof log.event !== "number" && log.event?.start_time) || "",
      end_time: (typeof log.event !== "number" && log.event?.end_time) || "",
    };
    eventMap.set(eventId, fallbackEvent);
  });

  const normalizedEvents = Array.from(eventMap.values()).sort(
    (a, b) => a.id - b.id
  );

  const createEmptyEventEntries = () =>
    normalizedEvents.map((event) => ({
      event_id: event.id,
      event_title: event.title,
      has_log: false,
      check_in_time: null,
      check_out_time: null,
      notes: null,
      break_started_at: null,
      break_time: null,
      break_accumulated: null,
      break_intervals: [],
      status: null,
      duration: null,
      worked_duration: null,
      log_id: null,
    }));

  const usersMap = new Map<number, OverviewUserWithMeta>();

  candidates.forEach((candidate) => {
    const preferredName =
      (candidate.full_name && candidate.full_name.trim()) ||
      candidate.name ||
      candidate.email;
    const user: OverviewUserWithMeta = {
      user_id: candidate.id,
      user_name: preferredName,
      user_email: candidate.email,
      events: createEmptyEventEntries(),
      track: deriveTrackName(candidate),
      phone: candidate.phone ?? null,
    };
    usersMap.set(candidate.id, user);
  });

  logs.forEach((log) => {
    const traineeId = getTraineeId(log);
    if (!traineeId) {
      return;
    }
    const user =
      usersMap.get(traineeId) ??
      (() => {
        const fallback: OverviewUserWithMeta = {
          user_id: traineeId,
          user_name:
            getTraineeName(log) ||
            getTraineeEmail(log) ||
            `Trainee ${traineeId}`,
          user_email: getTraineeEmail(log) || "",
          events: createEmptyEventEntries(),
          track: null,
          phone: null,
        };
        usersMap.set(traineeId, fallback);
        return fallback;
      })();

    const eventId = getEventId(log);
    if (!eventId) {
      return;
    }
    let eventEntry = user.events.find((evt) => evt.event_id === eventId);

    if (!eventEntry) {
      eventEntry = {
        event_id: eventId,
        event_title:
          (typeof log.event !== "number" && log.event?.title) ||
          log.event_title ||
          `Event ${eventId}`,
        has_log: false,
        check_in_time: null,
        check_out_time: null,
        notes: null,
        break_started_at: null,
        break_time: null,
        break_accumulated: null,
        break_intervals: [],
        status: null,
        duration: null,
        worked_duration: null,
        log_id: null,
      };
      user.events.push(eventEntry);
    }

    eventEntry.has_log = true;
    eventEntry.check_in_time = log.check_in_time;
    eventEntry.check_out_time = log.check_out_time;
    eventEntry.notes = log.notes || "";
    eventEntry.break_started_at = log.break_started_at ?? null;
    eventEntry.break_time = log.break_time ?? null;
    eventEntry.break_accumulated = log.break_accumulated ?? null;
    eventEntry.break_intervals = log.break_intervals ?? [];
    eventEntry.status = log.status ?? null;
    eventEntry.duration = log.duration ?? log.worked_duration ?? null;
    eventEntry.worked_duration = log.worked_duration ?? log.duration ?? null;
    eventEntry.log_id = log.id;
  });

  return {
    date,
    events: normalizedEvents,
    users: Array.from(usersMap.values()),
    count: usersMap.size,
  };
}

export function AttendancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAttendanceTracker, isInGroup } = useUserGroups();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<"checkin" | "checkout">(
    "checkin"
  );
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "break"
  >("all");

  // Optimistic break state per user for current date/event
  const [onBreakUsers, setOnBreakUsers] = useState<Record<number, string>>({});
  useEffect(() => {
    // Clear optimistic map when date or event changes
    setOnBreakUsers({});
  }, [selectedDate, selectedEvent]);

  // Export section state
  const [exportFromDate, setExportFromDate] = useState<string>("");
  const [exportToDate, setExportToDate] = useState<string>("");
  const [exportTrack, setExportTrack] = useState<string>("all");
  const [exportEvent, setExportEvent] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logs, eventsList, candidatesResponse] = await Promise.all([
        getMyLogs(selectedDate),
        getEvents(),
        getCandidates(),
      ]);
      const transformed = buildOverviewFromLogs({
        logs,
        events: eventsList,
        candidates: candidatesResponse.results ?? [],
        date: selectedDate,
      });
      setData(transformed);
      setSelectedEvent((current) => {
        if (
          current &&
          transformed.events.some((event) => event.id === current)
        ) {
          return current;
        }
        return transformed.events[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
    // Clear selections when date changes
    setSelectedUsers(new Set());
  }, [fetchData]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 8); // HH:MM:SS format
  };

  const handleUserCheckIn = async (userId: number, time?: string) => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      const payload: CheckInPayload = {
        candidate_id: userId,
        event: selectedEvent,
        attendance_date: selectedDate,
        check_in_time: time || getCurrentTime(),
        notes: "",
      };
      const response = await submitCheckIn(payload);
      if (response.success > 0) {
        toast.success("Checked in successfully");
        await fetchData();
      } else {
        toast.error(response.results[0]?.message || "Failed to check in");
      }
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserCheckOut = async (userId: number, time?: string) => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      const payload: CheckOutPayload = {
        candidate_id: userId,
        event: selectedEvent,
        attendance_date: selectedDate,
        check_out_time: time || getCurrentTime(),
        notes: "",
      };
      const response = await submitCheckOut(payload);
      if (response.success > 0) {
        toast.success("Checked out successfully");
        await fetchData();
      } else {
        toast.error(response.results[0]?.message || "Failed to check out");
      }
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error("Failed to check out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCheckIn = async (time?: string) => {
    if (!selectedEvent || selectedUsers.size === 0) return;
    setIsSubmitting(true);
    try {
      // Filter out users who are already checked in
      const eligibleUsers = Array.from(selectedUsers).filter((userId) => {
        const user = data?.users.find((u) => u.user_id === userId);
        if (!user) return false;
        const eventData = user.events.find((e) => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        return !checkInTime; // Only include users who haven't checked in yet
      });

      if (eligibleUsers.length === 0) {
        toast.info("All selected users are already checked in");
        return;
      }

      const promises = eligibleUsers.map((userId) => {
        const payload: CheckInPayload = {
          candidate_id: userId,
          event: selectedEvent,
          attendance_date: selectedDate,
          check_in_time: time || getCurrentTime(),
          notes: "",
        };
        return submitCheckIn(payload);
      });
      const responses = await Promise.all(promises);
      const totalSuccess = responses.reduce((sum, res) => sum + res.success, 0);
      const totalErrors = responses.reduce((sum, res) => sum + res.errors, 0);

      if (totalSuccess > 0)
        toast.success(`Successfully checked in ${totalSuccess} user(s)`);
      if (totalErrors > 0)
        toast.error(`Failed to check in ${totalErrors} user(s)`);

      const skippedCount = selectedUsers.size - eligibleUsers.length;
      if (skippedCount > 0) {
        toast.info(
          `Skipped ${skippedCount} user(s) who were already checked in`
        );
      }

      await fetchData();
    } catch (error) {
      console.error("Bulk check-in error:", error);
      toast.error("Failed to perform bulk check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCheckOut = async (time?: string) => {
    if (!selectedEvent || selectedUsers.size === 0) return;
    setIsSubmitting(true);
    try {
      // Filter out users who are already checked out or not checked in
      const eligibleUsers = Array.from(selectedUsers).filter((userId) => {
        const user = data?.users.find((u) => u.user_id === userId);
        if (!user) return false;
        const eventData = user.events.find((e) => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        const checkOutTime = eventData?.check_out_time || null;
        return checkInTime && !checkOutTime; // Only include users who are checked in but not checked out
      });

      if (eligibleUsers.length === 0) {
        toast.info(
          "All selected users are already checked out or not checked in"
        );
        return;
      }

      const promises = eligibleUsers.map((userId) => {
        const payload: CheckOutPayload = {
          candidate_id: userId,
          event: selectedEvent,
          attendance_date: selectedDate,
          check_out_time: time || getCurrentTime(),
          notes: "",
        };
        return submitCheckOut(payload);
      });
      const responses = await Promise.all(promises);
      const totalSuccess = responses.reduce((sum, res) => sum + res.success, 0);
      const totalErrors = responses.reduce((sum, res) => sum + res.errors, 0);

      if (totalSuccess > 0)
        toast.success(`Successfully checked out ${totalSuccess} user(s)`);
      if (totalErrors > 0)
        toast.error(`Failed to check out ${totalErrors} user(s)`);

      const skippedCount = selectedUsers.size - eligibleUsers.length;
      if (skippedCount > 0) {
        toast.info(
          `Skipped ${skippedCount} user(s) who were already checked out or not checked in`
        );
      }

      await fetchData();
    } catch (error) {
      console.error("Bulk check-out error:", error);
      toast.error("Failed to perform bulk check-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserBreakStart = async (userId: number) => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      const payload = {
        candidate_id: userId,
        event: selectedEvent,
        attendance_date: selectedDate,
        break_start_time: getCurrentTime(),
        notes: "",
      };
      const response = await submitAttendanceUpdate(payload);
      if (response.success > 0) {
        toast.success("Break started successfully");
        setOnBreakUsers((prev) => ({
          ...prev,
          [userId]: payload.break_start_time!,
        }));
        await fetchData();
      } else {
        toast.error(response.results[0]?.message || "Failed to start break");
      }
    } catch (error) {
      console.error("Break start error:", error);
      toast.error("Failed to start break");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserBreakEnd = async (userId: number) => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      const payload = {
        candidate_id: userId,
        event: selectedEvent,
        attendance_date: selectedDate,
        break_end_time: getCurrentTime(),
        notes: "",
      };
      const response = await submitAttendanceUpdate(payload);
      if (response.success > 0) {
        toast.success("Break ended successfully");
        setOnBreakUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        await fetchData();
      } else {
        toast.error(response.results[0]?.message || "Failed to end break");
      }
    } catch (error) {
      console.error("Break end error:", error);
      toast.error("Failed to end break");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimePickerConfirm = (time: string) => {
    if (pendingUserId) {
      if (timePickerMode === "checkin") {
        handleUserCheckIn(pendingUserId, time);
      } else {
        handleUserCheckOut(pendingUserId, time);
      }
      setPendingUserId(null);
      return;
    }
    if (timePickerMode === "checkin") {
      handleBulkCheckIn(time);
    } else {
      handleBulkCheckOut(time);
    }
  };

  const handleUserSelect = (userId: number, checked: boolean) => {
    const next = new Set(selectedUsers);
    if (checked) next.add(userId);
    else next.delete(userId);
    setSelectedUsers(next);
  };

  const handleUserClick = (userId: number) => {
    navigate(`/candidates/${userId}`);
  };

  // Check if user has both instructor and attendance_tracker permissions
  const canNavigateToUserDetails = () => {
    const hasInstructor =
      isInGroup("instructor -> Software") ||
      isInGroup("instructor -> Network") ||
      isInGroup("instructor -> Data") ||
      isInGroup("instructor");
    const hasAttendanceTracker = isInGroup("attendance_tracker");
    return hasInstructor && hasAttendanceTracker;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      const sortedUsers = getSortedUsers();
      // Only select users who can be checked in or out (not complete)
      const selectableUsers = sortedUsers.filter((user) => {
        if (!selectedEvent) return false;
        const eventData = user.events.find((e) => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        const checkOutTime = eventData?.check_out_time || null;
        // Can select if not checked in OR checked in but not checked out
        return !checkInTime || (checkInTime && !checkOutTime);
      });
      setSelectedUsers(new Set(selectableUsers.map((u) => u.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const isUserOnBreak = (user: OverviewUserWithMeta): boolean => {
    if (!selectedEvent) return false;
    const eventData = user.events.find((e) => e.event_id === selectedEvent);
    const optimisticBreakStart = onBreakUsers[user.user_id] || null;
    const checkOutTime = eventData?.check_out_time || null;
    return (
      !checkOutTime && (!!eventData?.break_started_at || !!optimisticBreakStart)
    );
  };

  const getFilteredUsers = (): OverviewUserWithMeta[] => {
    if (!data) return [];

    let filtered: OverviewUserWithMeta[] = data.users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          (user.user_name && user.user_name.toLowerCase().includes(query)) ||
          (user.user_email && user.user_email.toLowerCase().includes(query)) ||
          (user.phone && user.phone.toLowerCase().includes(query))
      );
    }

    // Apply track filter
    if (selectedTrack !== "all") {
      filtered = filtered.filter((user) => user.track === selectedTrack);
    }

    // Apply status filter
    if (statusFilter !== "all" && selectedEvent) {
      filtered = filtered.filter((user) => {
        const eventData = user.events.find((e) => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        const checkOutTime = eventData?.check_out_time || null;
        const onBreak = isUserOnBreak(user);

        if (statusFilter === "present") {
          return !!checkInTime && !checkOutTime && !onBreak;
        } else if (statusFilter === "absent") {
          return !checkInTime;
        } else if (statusFilter === "break") {
          return onBreak;
        }
        return true;
      });
    }

    return filtered;
  };

  const getSortedUsers = (): OverviewUserWithMeta[] => {
    const filtered = getFilteredUsers();
    if (!selectedEvent) return filtered;

    return filtered.sort((a, b) => {
      const aEventData = a.events.find((e) => e.event_id === selectedEvent);
      const bEventData = b.events.find((e) => e.event_id === selectedEvent);

      const aCheckedIn = !!aEventData?.check_in_time;
      const bCheckedIn = !!bEventData?.check_in_time;

      // If both have same check-in status, maintain original order
      if (aCheckedIn === bCheckedIn) return 0;

      // Not checked in users first, checked in users last
      return aCheckedIn ? 1 : -1;
    });
  };

  const getAvailableTracks = (): string[] => {
    if (!data) return [];
    const tracks = new Set(
      data.users
        .map((user) => user.track)
        .filter((track): track is string => Boolean(track))
    );
    return Array.from(tracks).sort();
  };

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

  const currentEvent =
    selectedEvent && data
      ? data.events.find((event) => event.id === selectedEvent) ?? null
      : null;

  const handleStatusButtonClick = (
    value: Exclude<typeof statusFilter, "all">
  ) => {
    setStatusFilter((prev) => (prev === value ? "all" : value));
  };

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    if (!data || !selectedEvent) {
      return { totalUsers: 0, presentCount: 0, absentCount: 0 };
    }

    const filteredUsers = getFilteredUsers();
    const totalUsers = filteredUsers.length;
    let presentCount = 0;
    let absentCount = 0;

    filteredUsers.forEach((user) => {
      const eventData = user.events.find((e) => e.event_id === selectedEvent);
      const checkInTime = eventData?.check_in_time || null;

      if (checkInTime) {
        presentCount++;
      } else {
        absentCount++;
      }
    });

    return { totalUsers, presentCount, absentCount };
  };

  const exportToCSV = () => {
    if (!data || !selectedEvent) {
      toast.error("No data to export");
      return;
    }

    const filteredUsers = getSortedUsers();
    if (!currentEvent) {
      toast.error("Event not found");
      return;
    }

    // Prepare CSV headers
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Track",
      "Status",
      "Check In Time",
      "Check Out Time",
      "Date",
      "Event",
    ];

    // Prepare CSV data with proper text handling
    const csvData = filteredUsers.map((user) => {
      const eventData = user.events.find((e) => e.event_id === selectedEvent);
      const checkInTime = eventData?.check_in_time || "";
      const checkOutTime = eventData?.check_out_time || "";

      let status = "Absent";
      if (checkInTime && checkOutTime) {
        status = "Present";
      } else if (checkInTime && !checkOutTime) {
        status = "Partial";
      }

      // Ensure proper text encoding for Arabic and other Unicode characters
      const sanitizeText = (text: string) => {
        if (!text) return "";
        // Remove any control characters but preserve Arabic and other Unicode characters
        return Array.from(text)
          .filter((char) => {
            const code = char.charCodeAt(0);
            const isControl =
              (code >= 0 && code <= 8) ||
              code === 11 ||
              code === 12 ||
              (code >= 14 && code <= 31) ||
              code === 127;
            return !isControl;
          })
          .join("");
      };

      // Use original date format - Excel will recognize it as a date
      // Users just need to make the column wider if they see #####
      const formatDateForExcel = (dateString: string) => {
        return dateString; // Keep original YYYY-MM-DD format
      };

      return [
        sanitizeText(user.user_name || ""),
        sanitizeText(user.user_email || ""),
        sanitizeText(user.phone || ""),
        sanitizeText(user.track || ""),
        status,
        checkInTime,
        checkOutTime,
        formatDateForExcel(selectedDate),
        sanitizeText(currentEvent.title),
      ];
    });

    // Create CSV content with UTF-8 BOM for proper Arabic text support
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Add UTF-8 BOM (Byte Order Mark) to ensure proper Arabic text encoding
    // This is essential for Excel and other applications to correctly display Arabic text
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;

    // Create and download file with proper UTF-8 encoding
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    // Generate filename with date and filters
    const dateStr = selectedDate.replace(/-/g, "");
    const eventStr = currentEvent.title.replace(/[^a-zA-Z0-9]/g, "_");
    const filterStr = statusFilter !== "all" ? `_${statusFilter}` : "";
    const trackStr =
      selectedTrack !== "all"
        ? `_${selectedTrack.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";

    link.setAttribute(
      "download",
      `attendance_${dateStr}_${eventStr}${filterStr}${trackStr}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      `Exported ${filteredUsers.length} records to CSV (UTF-8 with Arabic support, proper date format)`
    );
  };

  const handleBackendExport = async () => {
    if (!exportFromDate || !exportToDate) {
      toast.error("Please select both from and to dates");
      return;
    }

    if (new Date(exportFromDate) > new Date(exportToDate)) {
      toast.error("From date cannot be later than to date");
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportAttendanceCSV({
        from_date: exportFromDate,
        to_date: exportToDate,
        track: exportTrack !== "all" ? exportTrack : undefined,
        event: exportEvent !== "all" ? exportEvent : undefined,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename
      const fromDateStr = exportFromDate.replace(/-/g, "");
      const toDateStr = exportToDate.replace(/-/g, "");
      const trackStr =
        exportTrack !== "all"
          ? `_${exportTrack.replace(/[^a-zA-Z0-9]/g, "_")}`
          : "";
      const eventStr =
        exportEvent !== "all"
          ? `_${exportEvent.replace(/[^a-zA-Z0-9]/g, "_")}`
          : "";

      link.download = `attendance_${fromDateStr}_to_${toDateStr}${trackStr}${eventStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Attendance data exported successfully from backend");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export attendance data");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAttendanceTracker) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Access Denied
              </h2>
              <p className="text-muted-foreground mt-2">
                You don't have permission to access attendance features.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("pages.attendance.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pages.attendance.subtitle")}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <IconArrowBackUp className="size-4 mr-2" />
            {t("common.actions.back", { defaultValue: "Back" })}
          </Button>
        </div>
      </div>

      {/* Attendance Statistics */}
      {selectedEvent && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("pages.attendance.statistics.totalUsers")}
                  </p>
                  <p className="text-2xl font-bold">
                    {getAttendanceStats().totalUsers}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <IconUsers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("pages.attendance.statistics.presentToday")}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {getAttendanceStats().presentCount}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <IconClock className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("pages.attendance.statistics.absentToday")}
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {getAttendanceStats().absentCount}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <IconCalendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDownload className="size-5" />
            Export Attendance Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Track Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Track (Optional)</label>
              <Select value={exportTrack} onValueChange={setExportTrack}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks</SelectItem>
                  {getAvailableTracks().map((track) => (
                    <SelectItem key={track} value={track}>
                      {track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event (Optional)</label>
              <Select value={exportEvent} onValueChange={setExportEvent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {data?.events.map((event) => (
                    <SelectItem key={event.id} value={event.title}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleBackendExport}
              disabled={isExporting || !exportFromDate || !exportToDate}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader className="size-4" />
                  Exporting...
                </>
              ) : (
                <>
                  <IconDownload className="size-4" />
                  Export CSV
                </>
              )}
            </Button>
          </div>

          {/* Export Info */}
          {exportFromDate && exportToDate && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <div className="font-medium mb-1">Export Summary:</div>
              <div>
                Date Range: {exportFromDate} to {exportToDate}
              </div>
              {exportTrack !== "all" && <div>Track: {exportTrack}</div>}
              {exportEvent !== "all" && <div>Event: {exportEvent}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="size-5" />
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("common.labels.date")}
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div />
          </div>

          {/* Bulk Actions */}
          {selectedEvent && selectedUsers.size > 0 && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleBulkCheckIn()}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <IconClock className="size-4" />
                {t("pages.attendance.markAttendance")} ({selectedUsers.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTimePickerMode("checkin");
                  setShowTimePicker(true);
                  setPendingUserId(null);
                }}
                disabled={isSubmitting}
              >
                {t("pages.attendance.markAttendance")} (
                {t("common.labels.time")})
              </Button>
              <Button
                onClick={() => handleBulkCheckOut()}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <IconClock className="size-4" />
                {t("pages.attendance.checkOut")} ({selectedUsers.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTimePickerMode("checkout");
                  setShowTimePicker(true);
                  setPendingUserId(null);
                }}
                disabled={isSubmitting}
              >
                {t("pages.attendance.checkOut")} ({t("common.labels.time")})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconUsers className="size-5" />
                Users ({getSortedUsers().length})
              </div>
              <div className="flex items-center gap-4">
                {(searchQuery ||
                  statusFilter !== "all" ||
                  selectedTrack !== "all") && (
                  <div className="text-sm text-muted-foreground">
                    {searchQuery && (
                      <span className="mr-2">Search: "{searchQuery}"</span>
                    )}
                    {statusFilter !== "all" && (
                      <span className="mr-2">Status: {statusFilter}</span>
                    )}
                    {selectedTrack !== "all" && (
                      <span>Track: {selectedTrack}</span>
                    )}
                  </div>
                )}
                {getSortedUsers().length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="flex items-center gap-2"
                    title={`Export ${
                      getSortedUsers().length
                    } filtered records to CSV`}
                  >
                    <IconDownload className="size-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Bar */}
            <div className="mb-4 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                <Input
                  placeholder={t("common.placeholders.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {getAvailableTracks().length > 0 && (
                  <div>
                    <Select
                      value={selectedTrack}
                      onValueChange={(value) => setSelectedTrack(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by track" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTracks().map((track) => (
                          <SelectItem key={track} value={track}>
                            {track}
                          </SelectItem>
                        ))}
                        <SelectItem value="all">Clear filter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Present", value: "present", color: "bg-green-500" },
                    { label: "On Break", value: "break", color: "bg-amber-500" },
                    { label: "Absent", value: "absent", color: "bg-red-500" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={
                        statusFilter === option.value ? "default" : "outline"
                      }
                      onClick={() =>
                        handleStatusButtonClick(
                          option.value as Exclude<typeof statusFilter, "all">
                        )
                      }
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${option.color}`}
                      />
                      {option.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-end">
                  {(searchQuery ||
                    statusFilter !== "all" ||
                    selectedTrack !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setSelectedTrack("all");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {!data || getSortedUsers().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ||
                statusFilter !== "all" ||
                selectedTrack !== "all"
                  ? "No users found matching your filters"
                  : "No users found for the selected date"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={(() => {
                          const sortedUsers = getSortedUsers();
                          const selectableUsers = sortedUsers.filter((user) => {
                            if (!selectedEvent) return false;
                            const eventData = user.events.find(
                              (e) => e.event_id === selectedEvent
                            );
                            const checkInTime =
                              eventData?.check_in_time || null;
                            const checkOutTime =
                              eventData?.check_out_time || null;
                            return (
                              !checkInTime || (checkInTime && !checkOutTime)
                            );
                          });
                          return (
                            selectedUsers.size === selectableUsers.length &&
                            selectableUsers.length > 0
                          );
                        })()}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="w-48 text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedUsers().map((user) => {
                    const eventData = user.events.find(
                      (e) => e.event_id === selectedEvent
                    );
                    const checkInTime = eventData?.check_in_time || null;
                    const checkOutTime = eventData?.check_out_time || null;
                    const optimisticBreakStart =
                      onBreakUsers[user.user_id] || null;
                    const isOnBreak =
                      !!eventData?.break_started_at || !!optimisticBreakStart;
                    const activeBreakStart =
                      optimisticBreakStart ||
                      eventData?.break_started_at ||
                      null;
                    const lastBreakInterval =
                      eventData?.break_intervals &&
                      eventData.break_intervals.length > 0
                        ? eventData.break_intervals[
                            eventData.break_intervals.length - 1
                          ]
                        : null;
                    const breakInfo = activeBreakStart
                      ? `On break since ${activeBreakStart}`
                      : lastBreakInterval
                      ? `Last break: ${lastBreakInterval.start} - ${
                          lastBreakInterval.end ?? "ongoing"
                        }`
                      : null;
                    const totalBreakTime =
                      eventData?.break_time ||
                      eventData?.break_accumulated ||
                      null;
                    const breakIntervals = eventData?.break_intervals ?? [];
                    const canCheckIn = !checkInTime;
                    const canCheckOut = !!checkInTime && !checkOutTime;
                    const canBreakIn =
                      !!checkInTime && !checkOutTime && !isOnBreak;
                    const canBreakOut =
                      !!checkInTime && !checkOutTime && isOnBreak;
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.user_id)}
                            disabled={!canCheckIn && !canCheckOut}
                            onCheckedChange={(checked) =>
                              handleUserSelect(user.user_id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div
                              className={`font-medium ${
                                canNavigateToUserDetails()
                                  ? "cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                  : ""
                              }`}
                              onClick={
                                canNavigateToUserDetails()
                                  ? () => handleUserClick(user.user_id)
                                  : undefined
                              }
                            >
                              {user.user_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.user_email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-muted-foreground">
                                {user.phone}
                              </div>
                            )}
                            {user.track && (
                              <div
                                className={`text-xs font-medium mt-1 px-2 py-1 rounded-full border inline-block ${getTrackColor(
                                  user.track
                                )}`}
                              >
                                {user.track}
                              </div>
                            )}
                            {(breakInfo || totalBreakTime) && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {breakInfo && <div>{breakInfo}</div>}
                                {totalBreakTime && (
                                  <div>Total break: {totalBreakTime}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-48 text-center align-middle">
                          <div className="inline-flex items-center gap-2">
                            <AttendanceStatusBadge
                              checkInTime={checkInTime}
                              checkOutTime={checkOutTime}
                              isOnBreak={isOnBreak}
                              breakSince={
                                optimisticBreakStart ||
                                eventData?.break_started_at ||
                                null
                              }
                            />
                            {breakIntervals.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    Breaks
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64">
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    Break history
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {breakIntervals.map((interval, idx) => (
                                      <div
                                        key={`${user.user_id}-${interval.start}-${idx}`}
                                        className="px-3 py-2 text-left text-sm border-b last:border-0"
                                      >
                                        <div className="font-medium">
                                          {interval.start} -{" "}
                                          {interval.end ?? "Ongoing"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatBreakDuration(
                                            interval.start,
                                            interval.end
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleUserCheckIn(user.user_id)}
                            disabled={!canCheckIn || isSubmitting}
                          >
                            {t("pages.attendance.markAttendance")}
                          </Button>
                          <Button
                            size="sm"
                            className="hidden"
                            aria-hidden="true"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserBreakStart(user.user_id)}
                            disabled={!canBreakIn || isSubmitting}
                          >
                            Start Break
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserBreakEnd(user.user_id)}
                            disabled={!canBreakOut || isSubmitting}
                          >
                            End Break
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserCheckOut(user.user_id)}
                            disabled={!canCheckOut || isSubmitting}
                          >
                            {t("pages.attendance.checkOut")}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2"
                                disabled={
                                  isSubmitting || (!canCheckIn && !canCheckOut)
                                }
                                title="More actions"
                              >
                                <IconDotsVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canCheckIn && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPendingUserId(user.user_id);
                                    setTimePickerMode("checkin");
                                    setShowTimePicker(true);
                                  }}
                                >
                                  {t("pages.attendance.markAttendance")} (
                                  {t("common.labels.time")})
                                </DropdownMenuItem>
                              )}
                              {canCheckOut && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPendingUserId(user.user_id);
                                    setTimePickerMode("checkout");
                                    setShowTimePicker(true);
                                  }}
                                >
                                  {t("pages.attendance.checkOut")} (
                                  {t("common.labels.time")})
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Picker Dialog */}
      <TimePickerDialog
        open={showTimePicker}
        onOpenChange={setShowTimePicker}
        onTimeSelect={handleTimePickerConfirm}
        title={
          timePickerMode === "checkin"
            ? t("pages.attendance.markAttendance") +
              " " +
              t("common.labels.time")
            : t("pages.attendance.checkOut") + " " + t("common.labels.time")
        }
        description={
          pendingUserId
            ? timePickerMode === "checkin"
              ? "Select the time to check in this user."
              : "Select the time to check out this user."
            : timePickerMode === "checkin"
            ? `Select the time for checking in ${selectedUsers.size} selected user(s).`
            : `Select the time for checking out ${selectedUsers.size} selected user(s).`
        }
        defaultTime={getCurrentTime()}
        defaultAM={timePickerMode === "checkin"}
      />
    </div>
  );
}
