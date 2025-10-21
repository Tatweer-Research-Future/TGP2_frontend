import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IconClock, IconCalendar, IconUsers, IconSearch } from "@tabler/icons-react";
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

export function AttendancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAttendanceTracker, isInGroup } = useUserGroups();
  const [data, setData] = useState<AttendanceOverviewResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'checkin' | 'checkout'>('checkin');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");

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
      const response = await getAttendanceOverview(selectedDate);
      setData(response);
      // Auto-select first event if none selected or current selection is invalid
      if (!selectedEvent || !response.events.find(e => e.id === selectedEvent)) {
        if (response.events.length > 0) {
          setSelectedEvent(response.events[0].id);
        } else {
          setSelectedEvent(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch attendance overview:", error);
      toast.error("Failed to load attendance overview");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Clear selections when date changes
    setSelectedUsers(new Set());
  }, [selectedDate]);

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
      const eligibleUsers = Array.from(selectedUsers).filter(userId => {
        const user = data?.users.find(u => u.user_id === userId);
        if (!user) return false;
        const eventData = user.events.find(e => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        return !checkInTime; // Only include users who haven't checked in yet
      });

      if (eligibleUsers.length === 0) {
        toast.info("All selected users are already checked in");
        return;
      }

      const promises = eligibleUsers.map(userId => {
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
      
      if (totalSuccess > 0) toast.success(`Successfully checked in ${totalSuccess} user(s)`);
      if (totalErrors > 0) toast.error(`Failed to check in ${totalErrors} user(s)`);
      
      const skippedCount = selectedUsers.size - eligibleUsers.length;
      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} user(s) who were already checked in`);
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
      const eligibleUsers = Array.from(selectedUsers).filter(userId => {
        const user = data?.users.find(u => u.user_id === userId);
        if (!user) return false;
        const eventData = user.events.find(e => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        const checkOutTime = eventData?.check_out_time || null;
        return checkInTime && !checkOutTime; // Only include users who are checked in but not checked out
      });

      if (eligibleUsers.length === 0) {
        toast.info("All selected users are already checked out or not checked in");
        return;
      }

      const promises = eligibleUsers.map(userId => {
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
      
      if (totalSuccess > 0) toast.success(`Successfully checked out ${totalSuccess} user(s)`);
      if (totalErrors > 0) toast.error(`Failed to check out ${totalErrors} user(s)`);
      
      const skippedCount = selectedUsers.size - eligibleUsers.length;
      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} user(s) who were already checked out or not checked in`);
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
    if (pendingUserId) {
      if (timePickerMode === 'checkin') {
        handleUserCheckIn(pendingUserId, time);
      } else {
        handleUserCheckOut(pendingUserId, time);
      }
      setPendingUserId(null);
      return;
    }
    if (timePickerMode === 'checkin') {
      handleBulkCheckIn(time);
    } else {
      handleBulkCheckOut(time);
    }
  };

  const handleUserSelect = (userId: number, checked: boolean) => {
    const next = new Set(selectedUsers);
    if (checked) next.add(userId); else next.delete(userId);
    setSelectedUsers(next);
  };

  const handleUserClick = (userId: number) => {
    navigate(`/candidates/${userId}`);
  };

  // Check if user has both instructor and attendance_tracker permissions
  const canNavigateToUserDetails = () => {
    const hasInstructor = isInGroup('instructor -> Software') || 
                         isInGroup('instructor -> Network') || 
                         isInGroup('instructor -> Data') ||
                         isInGroup('instructor');
    const hasAttendanceTracker = isInGroup('attendance_tracker');
    return hasInstructor && hasAttendanceTracker;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      const sortedUsers = getSortedUsers();
      // Only select users who can be checked in or out (not complete)
      const selectableUsers = sortedUsers.filter(user => {
        if (!selectedEvent) return false;
        const eventData = user.events.find(e => e.event_id === selectedEvent);
        const checkInTime = eventData?.check_in_time || null;
        const checkOutTime = eventData?.check_out_time || null;
        // Can select if not checked in OR checked in but not checked out
        return !checkInTime || (checkInTime && !checkOutTime);
      });
      setSelectedUsers(new Set(selectableUsers.map(u => u.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const getFilteredUsers = () => {
    if (!data) return [];
    
    let filtered = data.users;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.user_name.toLowerCase().includes(query) ||
        user.user_email.toLowerCase().includes(query) ||
        (user as any).phone?.toLowerCase().includes(query)
      );
    }
    
    // Apply track filter
    if (selectedTrack !== "all") {
      filtered = filtered.filter(user => 
        (user as any).track === selectedTrack
      );
    }
    
    return filtered;
  };

  const getSortedUsers = () => {
    const filtered = getFilteredUsers();
    if (!selectedEvent) return filtered;
    
    return filtered.sort((a, b) => {
      const aEventData = a.events.find(e => e.event_id === selectedEvent);
      const bEventData = b.events.find(e => e.event_id === selectedEvent);
      
      const aCheckedIn = !!aEventData?.check_in_time;
      const bCheckedIn = !!bEventData?.check_in_time;
      
      // If both have same check-in status, maintain original order
      if (aCheckedIn === bCheckedIn) return 0;
      
      // Not checked in users first, checked in users last
      return aCheckedIn ? 1 : -1;
    });
  };

  const getAvailableTracks = () => {
    if (!data) return [];
    const tracks = new Set(data.users.map(user => (user as any).track).filter(Boolean));
    return Array.from(tracks).sort();
  };

  const getTrackColor = (track: string) => {
    const colorMap: Record<string, string> = {
      "Software & App Development": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30",
      "Networking & Telecommunications": "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30",
      "AI & Data Analysis": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30",
      "Cybersecurity": "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30",
      "Digital Marketing": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30",
      "Cloud Computing": "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30",
      "IoT & Embedded Systems": "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/20 dark:text-pink-200 dark:border-pink-500/30",
      "Blockchain & Cryptocurrency": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/30",
    };
    return colorMap[track] || "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/20 dark:text-gray-200 dark:border-gray-500/30";
  };

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    if (!data || !selectedEvent) {
      return { totalUsers: 0, presentCount: 0, absentCount: 0 };
    }

    const totalUsers = data.users.length;
    let presentCount = 0;
    let absentCount = 0;

    data.users.forEach(user => {
      const eventData = user.events.find(e => e.event_id === selectedEvent);
      const checkInTime = eventData?.check_in_time || null;
      
      if (checkInTime) {
        presentCount++;
      } else {
        absentCount++;
      }
    });

    return { totalUsers, presentCount, absentCount };
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
          <h1 className="text-3xl font-bold text-foreground">{t('pages.attendance.title')}</h1>
          <p className="text-muted-foreground">{t('pages.attendance.subtitle')}</p>
        </div>
      </div>

      {/* Attendance Statistics */}
      {selectedEvent && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('pages.attendance.statistics.totalUsers')}</p>
                  <p className="text-2xl font-bold">{getAttendanceStats().totalUsers}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('pages.attendance.statistics.presentToday')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getAttendanceStats().presentCount}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('pages.attendance.statistics.absentToday')}</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{getAttendanceStats().absentCount}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <IconCalendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              <label className="text-sm font-medium">{t('common.labels.date')}</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Event Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select
                value={selectedEvent?.toString() || ""}
                onValueChange={(value) => setSelectedEvent(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {data?.events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Bulk Actions */}
          {selectedEvent && selectedUsers.size > 0 && (
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handleBulkCheckIn()} disabled={isSubmitting} className="flex items-center gap-2">
                <IconClock className="size-4" />
                {t('pages.attendance.markAttendance')} ({selectedUsers.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => { setTimePickerMode('checkin'); setShowTimePicker(true); setPendingUserId(null); }}
                disabled={isSubmitting}
              >
                {t('pages.attendance.markAttendance')} ({t('common.labels.time')})
              </Button>
              <Button onClick={() => handleBulkCheckOut()} disabled={isSubmitting} className="flex items-center gap-2">
                <IconClock className="size-4" />
                {t('pages.attendance.checkOut')} ({selectedUsers.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => { setTimePickerMode('checkout'); setShowTimePicker(true); setPendingUserId(null); }}
                disabled={isSubmitting}
              >
                {t('pages.attendance.checkOut')} ({t('common.labels.time')})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUsers className="size-5" />
              Users ({getSortedUsers().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Bar */}
            <div className="mb-4 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                <Input
                  placeholder={t('common.placeholders.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Track Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedTrack === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTrack("all")}
                >
                  All Tracks
                </Button>
                {getAvailableTracks().map((track) => (
                  <Button
                    key={track}
                    variant={selectedTrack === track ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTrack(track)}
                    className={selectedTrack === track ? "" : `border-2 ${getTrackColor(track).split(' ')[2]}`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${getTrackColor(track).split(' ')[0]}`} />
                    {track}
                  </Button>
                ))}
              </div>
            </div>

            {!data || getSortedUsers().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No users found matching your search" : "No users found for the selected date"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={(() => {
                          const sortedUsers = getSortedUsers();
                          const selectableUsers = sortedUsers.filter(user => {
                            if (!selectedEvent) return false;
                            const eventData = user.events.find(e => e.event_id === selectedEvent);
                            const checkInTime = eventData?.check_in_time || null;
                            const checkOutTime = eventData?.check_out_time || null;
                            return !checkInTime || (checkInTime && !checkOutTime);
                          });
                          return selectedUsers.size === selectableUsers.length && selectableUsers.length > 0;
                        })()}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedUsers().map((user) => {
                    const eventData = user.events.find(e => e.event_id === selectedEvent);
                    const checkInTime = eventData?.check_in_time || null;
                    const checkOutTime = eventData?.check_out_time || null;
                    const canCheckIn = !checkInTime;
                    const canCheckOut = !!checkInTime && !checkOutTime;
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.user_id)}
                            disabled={!canCheckIn && !canCheckOut}
                            onCheckedChange={(checked) => handleUserSelect(user.user_id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div 
                              className={`font-medium ${canNavigateToUserDetails() ? 'cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors' : ''}`}
                              onClick={canNavigateToUserDetails() ? () => handleUserClick(user.user_id) : undefined}
                            >
                              {user.user_name}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.user_email}</div>
                            {(user as any).phone && (
                              <div className="text-sm text-muted-foreground">{(user as any).phone}</div>
                            )}
                            {(user as any).track && (
                              <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full border inline-block ${getTrackColor((user as any).track)}`}>
                                {(user as any).track}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <AttendanceStatusBadge
                            checkInTime={checkInTime}
                            checkOutTime={checkOutTime}
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleUserCheckIn(user.user_id)}
                            disabled={!canCheckIn || isSubmitting}
                          >
                            {t('pages.attendance.markAttendance')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setPendingUserId(user.user_id); setTimePickerMode('checkin'); setShowTimePicker(true); }}
                            disabled={!canCheckIn || isSubmitting}
                          >
                            {t('pages.attendance.markAttendance')} ({t('common.labels.time')})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserCheckOut(user.user_id)}
                            disabled={!canCheckOut || isSubmitting}
                          >
                            {t('pages.attendance.checkOut')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setPendingUserId(user.user_id); setTimePickerMode('checkout'); setShowTimePicker(true); }}
                            disabled={!canCheckOut || isSubmitting}
                          >
                            {t('pages.attendance.checkOut')} ({t('common.labels.time')})
                          </Button>
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
        title={timePickerMode === 'checkin' ? t('pages.attendance.markAttendance') + ' ' + t('common.labels.time') : t('pages.attendance.checkOut') + ' ' + t('common.labels.time')}
        description={
          pendingUserId
            ? (timePickerMode === 'checkin' ? 'Select the time to check in this user.' : 'Select the time to check out this user.')
            : (timePickerMode === 'checkin' ? `Select the time for checking in ${selectedUsers.size} selected user(s).` : `Select the time for checking out ${selectedUsers.size} selected user(s).`)
        }
        defaultTime={getCurrentTime()}
        defaultAM={timePickerMode === 'checkin'}
      />
    </div>
  );
}


