import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { IconClock, IconRefresh, IconCalendar } from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { TimePickerDialog } from "@/components/TimePickerDialog";
import { AttendanceStatusBadge } from "@/components/AttendanceStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useUserGroups } from "@/hooks/useUserGroups";
import {
  getEvents,
  getMyLogs,
  submitCheckIn,
  submitCheckOut,
  type AttendanceEvent,
  type AttendanceLog,
  type CheckInPayload,
  type CheckOutPayload,
} from "@/lib/api";

export function AttendancePage() {
  const { user } = useAuth();
  const { isAttendanceTracker } = useUserGroups();
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'checkin' | 'checkout'>('checkin');

  const today = new Date().toISOString().split('T')[0];

  // Check if user has permission
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, logsData] = await Promise.all([
        getEvents(),
        getMyLogs(today),
      ]);
      setEvents(eventsData);
      setLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 8); // HH:MM:SS format
  };

  const getCurrentLog = () => {
    if (!selectedEvent) return null;
    return logs.find(log => log.event.id === selectedEvent && log.attendance_date === today);
  };

  const getButtonState = () => {
    const currentLog = getCurrentLog();
    if (!currentLog) return 'checkin';
    if (!currentLog.check_out_time) return 'checkout';
    return 'complete';
  };

  const handleCheckIn = async (time?: string) => {
    if (!selectedEvent || !user) return;

    setIsSubmitting(true);
    try {
      const payload: CheckInPayload = {
        candidate_id: user.id,
        event: selectedEvent,
        attendance_date: today,
        check_in_time: time || getCurrentTime(),
        notes: "",
      };

      const response = await submitCheckIn(payload);
      if (response.success > 0) {
        toast.success("Successfully checked in!");
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

  const handleCheckOut = async (time?: string) => {
    if (!selectedEvent || !user) return;

    setIsSubmitting(true);
    try {
      const payload: CheckOutPayload = {
        candidate_id: user.id,
        event: selectedEvent,
        attendance_date: today,
        check_out_time: time || getCurrentTime(),
        notes: "",
      };

      const response = await submitCheckOut(payload);
      if (response.success > 0) {
        toast.success("Successfully checked out!");
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

  const handleTimePickerConfirm = (time: string) => {
    if (timePickerMode === 'checkin') {
      handleCheckIn(time);
    } else {
      handleCheckOut(time);
    }
  };

  const buttonState = getButtonState();

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground">
            Check in and out for scheduled events
          </p>
        </div>
      </div>

      {/* Main Attendance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="size-5" />
            Today's Attendance - {new Date().toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Event</label>
            <Select
              value={selectedEvent?.toString() || ""}
              onValueChange={(value) => setSelectedEvent(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.title} ({event.start_time} - {event.end_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          {selectedEvent && (
            <div className="flex gap-3">
              {buttonState === 'checkin' && (
                <>
                  <Button
                    onClick={() => handleCheckIn()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <IconClock className="size-4" />
                    Check In Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTimePickerMode('checkin');
                      setShowTimePicker(true);
                    }}
                    disabled={isSubmitting}
                  >
                    Check In (Custom Time)
                  </Button>
                </>
              )}

              {buttonState === 'checkout' && (
                <>
                  <Button
                    onClick={() => handleCheckOut()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <IconClock className="size-4" />
                    Check Out Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTimePickerMode('checkout');
                      setShowTimePicker(true);
                    }}
                    disabled={isSubmitting}
                  >
                    Check Out (Custom Time)
                  </Button>
                </>
              )}

              {buttonState === 'complete' && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30">
                  <span className="inline-block size-2 rounded-full bg-blue-500 dark:bg-blue-400 mr-2" />
                  Attendance Complete
                </Badge>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <IconRefresh className="size-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance logs for today
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.event.title}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge
                        checkInTime={log.check_in_time}
                        checkOutTime={log.check_out_time}
                      />
                    </TableCell>
                    <TableCell>{log.check_in_time}</TableCell>
                    <TableCell>{log.check_out_time || "-"}</TableCell>
                    <TableCell>{log.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Time Picker Dialog */}
      <TimePickerDialog
        open={showTimePicker}
        onOpenChange={setShowTimePicker}
        onTimeSelect={handleTimePickerConfirm}
        title={timePickerMode === 'checkin' ? 'Check In Time' : 'Check Out Time'}
        description={
          timePickerMode === 'checkin'
            ? 'Select the time you want to check in.'
            : 'Select the time you want to check out.'
        }
        defaultTime={getCurrentTime()}
      />
    </div>
  );
}


