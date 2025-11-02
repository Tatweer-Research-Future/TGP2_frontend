import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconSearch,
  IconCopy,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

import { getCandidates, getUserDetailById, type BackendUserDetail } from "@/lib/api";
import { transformBackendCandidate, type Candidate } from "@/lib/candidates";
import { useCandidates } from "@/context/CandidatesContext";
import { useAuth } from "@/context/AuthContext";

type AttendanceStats = {
  presentDays: number;
  absentDays: number;
  totalDays: number;
  attendanceRate: number;
};

export function TraineeMonitoringPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, AttendanceStats>>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<Record<string, boolean>>({});
  const [candidateTracks, setCandidateTracks] = useState<Record<string, string>>({});
  const { setCandidates: setCandidatesContext } = useCandidates();

  // Fetch candidates from backend
  const fetchCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Permission-based routing is now handled by PermissionProtectedRoute
      const response = await getCandidates();
      const transformedCandidates = response.results.map(
        transformBackendCandidate
      );
      setCandidates(transformedCandidates);
      setCandidatesContext(transformedCandidates); // Share with context
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setError("Failed to load candidates. Please try again.");
      toast.error("Failed to load candidates");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch attendance stats and track for a candidate
  const fetchAttendanceStats = async (candidateId: string) => {
    setIsLoadingAttendance((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const userDetail: BackendUserDetail = await getUserDetailById(candidateId);
      
      // Get track from additional_fields.Track (as shown in the API response)
      const track = (userDetail.additional_fields as any)?.Track || 
                    (userDetail as any).track || 
                    "Unknown";
      
      if (track && track !== "Unknown") {
        setCandidateTracks((prev) => ({ ...prev, [candidateId]: track }));
      } else {
        setCandidateTracks((prev) => ({ ...prev, [candidateId]: "Unknown" }));
      }
      
      if (userDetail.attendance_log) {
        const { attendance_days, absent_days } = userDetail.attendance_log;
        // attendance_days is actually the present days, not total days
        const presentDays = attendance_days;
        const totalDays = attendance_days + absent_days;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
        
        setAttendanceStats((prev) => ({
          ...prev,
          [candidateId]: {
            presentDays,
            absentDays: absent_days,
            totalDays,
            attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
          },
        }));
      } else {
        // No attendance data available
        setAttendanceStats((prev) => ({
          ...prev,
          [candidateId]: {
            presentDays: 0,
            absentDays: 0,
            totalDays: 0,
            attendanceRate: 0,
          },
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch attendance for candidate ${candidateId}:`, err);
      // Set default values on error
      setAttendanceStats((prev) => ({
        ...prev,
        [candidateId]: {
          presentDays: 0,
          absentDays: 0,
          totalDays: 0,
          attendanceRate: 0,
        },
      }));
      setCandidateTracks((prev) => ({ ...prev, [candidateId]: "Unknown" }));
    } finally {
      setIsLoadingAttendance((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  // Fetch attendance stats for all candidates
  useEffect(() => {
    if (candidates.length > 0) {
      // Fetch attendance stats for all candidates in parallel
      candidates.forEach((candidate) => {
        // Check if we haven't fetched yet or if track is missing
        const hasStats = attendanceStats[candidate.id];
        const hasTrack = candidateTracks[candidate.id];
        const isLoading = isLoadingAttendance[candidate.id];
        
        if ((!hasStats || !hasTrack) && !isLoading) {
          fetchAttendanceStats(candidate.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, candidateTracks]);

  useEffect(() => {
    fetchCandidates();
  }, []);


  // Get track color function (same as AttendancePage)
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

  // Get available tracks for filter
  const getAvailableTracks = () => {
    const tracks = new Set<string>();
    candidates.forEach((candidate) => {
      const track = candidateTracks[candidate.id];
      if (track && track !== "Unknown") {
        tracks.add(track);
      }
    });
    return Array.from(tracks).sort();
  };

  // Filter and search logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch =
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.fullNameArabic &&
          candidate.fullNameArabic.includes(searchTerm));

      const matchesTrack =
        selectedTrack === "all" || candidateTracks[candidate.id] === selectedTrack;

      return matchesSearch && matchesTrack;
    });
  }, [candidates, searchTerm, selectedTrack, candidateTracks]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Copy all visible names (all filtered candidates) to clipboard
  const handleCopyVisibleNames = async () => {
    const names = filteredCandidates.map((c) => {
      return c.fullNameArabic || "-";
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
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(
          `Copied ${names.length} name${names.length > 1 ? "s" : ""}`
        );
      } catch (_) {
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
                <Button onClick={fetchCandidates} variant="outline">
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
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("common.placeholders.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
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

              {/* Clear Filters Button */}
              {(searchTerm || selectedTrack !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
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
      </div>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              {t("pages.trainee_monitoring.title")} {t("common.labels.list")}
            </div>
            {(searchTerm || selectedTrack !== "all") && (
              <div className="text-sm text-muted-foreground font-normal">
                {searchTerm && <span className="mr-2">Search: "{searchTerm}"</span>}
                {selectedTrack !== "all" && <span>Track: {selectedTrack}</span>}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  {t("pages.trainee_monitoring.track")}
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {t("pages.trainee_monitoring.noCandidates")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => {
                  const stats = attendanceStats[candidate.id];
                  const isLoading = isLoadingAttendance[candidate.id];
                  const track = candidateTracks[candidate.id] || "Unknown";
                  
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell className="text-center">
                        {track && track !== "Unknown" ? (
                          <div className={`text-xs font-medium px-2 py-1 rounded-full border inline-block ${getTrackColor(track)}`}>
                            {track}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-center" dir="rtl">
                          <span className="text-base">
                            {candidate.fullNameArabic || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader className="size-4" />
                          </div>
                        ) : stats ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="text-sm">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {stats.presentDays}
                              </span>
                              <span className="text-muted-foreground mx-1">
                                {t("pages.trainee_monitoring.present")} /{" "}
                              </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {stats.absentDays}
                              </span>
                              <span className="text-muted-foreground mx-1">
                                {t("pages.trainee_monitoring.absent")}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stats.totalDays} {t("pages.trainee_monitoring.totalDays")} • {stats.attendanceRate}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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
        {t("table.pagination.showing")} {filteredCandidates.length}{" "}
        {filteredCandidates.length === 1 ? "trainee" : "trainees"}
      </div>
    </div>
  );
}

