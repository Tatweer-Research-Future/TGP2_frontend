import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IconCalendar, IconRefresh, IconClock, IconUsers } from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { TimePickerDialog } from "@/components/TimePickerDialog";
import { AttendanceStatusBadge } from "@/components/AttendanceStatusBadge";
import { useUserGroups } from "@/hooks/useUserGroups";
import {
  getAttendanceOverview,
  submitCheckIn,
  submitCheckOut,
  type AttendanceOverviewResponse,
  type CheckInPayload,
  type CheckOutPayload,
} from "@/lib/api";

export function AttendanceOverviewPage() {
  const { isAttendanceTracker } = useUserGroups();
  const [data, setData] = useState<AttendanceOverviewResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'checkin' | 'checkout'>('checkin');

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
                You don't have permission to access attendance overview.
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
      const response = await getAttendanceOverview(selectedDate);
      setData(response);
      setSelectedEvent(null);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Failed to fetch attendance overview:", error);
      toast.error("Failed to load attendance overview");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 8); // HH:MM:SS format
  };

  const handleUserSelect = (userId: number, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedUsers(new Set(data.users.map(user => user.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkCheckIn = async (time?: string) => {
    if (!selectedEvent || selectedUsers.size === 0) return;

    setIsSubmitting(true);
    try {
      const promises = Array.from(selectedUsers).map(userId => {
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

      if (totalSuccess > 0) {
        toast.success(`Successfully checked in ${totalSuccess} user(s)`);
      }
      if (totalErrors > 0) {
        toast.error(`Failed to check in ${totalErrors} user(s)`);
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
      const promises = Array.from(selectedUsers).map(userId => {
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

      if (totalSuccess > 0) {
        toast.success(`Successfully checked out ${totalSuccess} user(s)`);
      }
      if (totalErrors > 0) {
        toast.error(`Failed to check out ${totalErrors} user(s)`);
      }

      await fetchData();
    } catch (error) {
      console.error("Bulk check-out error:", error);
      toast.error("Failed to perform bulk check-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimePickerConfirm = (time: string) => {
    if (timePickerMode === 'checkin') {
      handleBulkCheckIn(time);
    } else {
      handleBulkCheckOut(time);
    }
  };

  const getEventStats = (eventId: number) => {
    if (!data) return { total: 0, checkedIn: 0, checkedOut: 0 };
    
    let total = 0;
    let checkedIn = 0;
    let checkedOut = 0;

    data.users.forEach(user => {
      const eventData = user.events.find(e => e.event_id === eventId);
      if (eventData) {
        total++;
        if (eventData.check_in_time) {
          checkedIn++;
          if (eventData.check_out_time) {
            checkedOut++;
          }
        }
      }
    });

    return { total, checkedIn, checkedOut };
  };

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
          <h1 className="text-3xl font-bold text-foreground">Attendance Overview</h1>
          <p className="text-muted-foreground">
            Manage attendance for all users
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="size-5" />
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Event Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select
                value={selectedEvent?.toString() || "all"}
                onValueChange={(value) => setSelectedEvent(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {data?.events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                variant="outline"
                onClick={fetchData}
                disabled={isLoading}
                className="w-full flex items-center gap-2"
              >
                <IconRefresh className="size-4" />
                Refresh
              </Button>
            </div>
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
                Check In Selected ({selectedUsers.size})
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
              <Button
                onClick={() => handleBulkCheckOut()}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <IconClock className="size-4" />
                Check Out Selected ({selectedUsers.size})
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Stats */}
      {data && data.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.events.map((event) => {
            const stats = getEventStats(event.id);
            return (
              <Card key={event.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {event.start_time} - {event.end_time}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Users:</span>
                      <Badge variant="outline">{stats.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Checked In:</span>
                      <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30">
                        {stats.checkedIn}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completed:</span>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30">
                        {stats.checkedOut}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="size-5" />
            Users ({data?.count || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found for the selected date
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === data.users.length && data.users.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  {data.events.map((event) => (
                    <TableHead key={event.id} className="text-center">
                      {event.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.user_id)}
                        onCheckedChange={(checked) => handleUserSelect(user.user_id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.user_name}</div>
                        <div className="text-sm text-muted-foreground">{user.user_email}</div>
                      </div>
                    </TableCell>
                    {data.events.map((event) => {
                      const eventData = user.events.find(e => e.event_id === event.id);
                      return (
                        <TableCell key={event.id} className="text-center">
                          {eventData ? (
                            <AttendanceStatusBadge
                              checkInTime={eventData.check_in_time}
                              checkOutTime={eventData.check_out_time}
                            />
                          ) : (
                            <Badge variant="outline">No Record</Badge>
                          )}
                        </TableCell>
                      );
                    })}
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
        title={timePickerMode === 'checkin' ? 'Bulk Check In Time' : 'Bulk Check Out Time'}
        description={
          timePickerMode === 'checkin'
            ? `Select the time for checking in ${selectedUsers.size} selected user(s).`
            : `Select the time for checking out ${selectedUsers.size} selected user(s).`
        }
        defaultTime={getCurrentTime()}
      />
    </div>
  );
}


