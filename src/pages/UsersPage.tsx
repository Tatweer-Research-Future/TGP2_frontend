import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import {
  IconSearch,
  IconFilter,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconRefresh,
} from "@tabler/icons-react";
import { IconMinus, IconUser, IconCpu, IconPresentation } from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

import { getCandidates } from "@/lib/api";
import { transformBackendCandidate, type Candidate } from "@/lib/candidates";
import { useCandidates } from "@/context/CandidatesContext";

// Visual style for each status (colors aligned with Pending/Completed/Declined)
const statusMeta = {
  not_interviewed: {
    label: "Not Interviewed",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30",
    dotClass: "bg-red-500 dark:bg-red-400",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
    dotClass: "bg-slate-500 dark:bg-slate-300",
  },
  interviewed: {
    label: "Interviewed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
  },
} as const;

const ITEMS_PER_PAGE = 8;

export function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setCandidates: setCandidatesContext } = useCandidates();

  // Fetch candidates from backend
  const fetchCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getCandidates(); // group_id=5 for candidates
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

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Filter and search logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch =
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.fullNameArabic && candidate.fullNameArabic.includes(searchTerm));

      const matchesStatus =
        statusFilter === "all" || candidate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchTerm, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCandidates = filteredCandidates.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Copy all visible emails (current page) to clipboard
  const handleCopyVisibleEmails = async () => {
    const emails = paginatedCandidates.map((c) => c.email);
    if (emails.length === 0) {
      toast.info("No emails to copy");
      return;
    }
    const text = emails.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        `Copied ${emails.length} email${emails.length > 1 ? "s" : ""}`
      );
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(
          `Copied ${emails.length} email${emails.length > 1 ? "s" : ""}`
        );
      } catch (_) {
        toast.error("Failed to copy emails");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  // Copy all visible names (current page) to clipboard
  const handleCopyVisibleNames = async () => {
    const names = paginatedCandidates.map((c) => {
      const englishName = c.fullName;
      const arabicName = c.fullNameArabic;
      return arabicName ? `${englishName} (${arabicName})` : englishName;
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
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">
              Manage and review candidate applications
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
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">
              Manage and review candidate applications
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="text-muted-foreground">{error}</div>
                <Button onClick={fetchCandidates} variant="outline">
                  <IconRefresh className="size-4 mr-2" />
                  Retry
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
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
            <p className="text-muted-foreground">
              Manage and review candidate applications
            </p>
          </div>
          <div className="flex w-full md:w-auto md:max-w-3xl items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, Arabic name, or email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue
                  placeholder={
                    <span className="inline-flex items-center gap-2">
                      <IconFilter className="text-muted-foreground" />
                      Filter status
                    </span>
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <IconFilter className="opacity-70" />
                  All Statuses
                </SelectItem>
                <SelectItem value="not_interviewed">
                  <IconMinus className="text-gray-500" />
                  Not Interviewed
                </SelectItem>
                <SelectItem value="interviewed">
                  <IconFilter className="opacity-70" />
                  Interviewed
                </SelectItem>
              </SelectContent>
            </Select>

            {/* <Button onClick={fetchCandidates} variant="outline" size="sm">
              <IconRefresh className="size-4 mr-2" />
              Refresh
            </Button> */}
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span>Name</span>
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
                <TableHead className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <span></span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span>Email</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      onClick={handleCopyVisibleEmails}
                      title="Copy all visible emails"
                    >
                      <IconCopy className="size-4" />
                      <span className="sr-only">Copy all visible emails</span>
                    </Button>
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No candidates found matching your criteria.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCandidates.map((candidate) => {
                  const meta = statusMeta[candidate.status];
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ConsistentAvatar
                            user={{
                              name: candidate.fullName,
                              email: candidate.email,
                            }}
                            className="size-8"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {candidate.fullName}
                            </span>
                            <span className="text-sm text-muted-foreground md:hidden">
                              {candidate.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="font-medium text-right" dir="rtl">
                          <span className="text-base">
                            {candidate.fullNameArabic || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {candidate.email}
                      </TableCell>
                      <TableCell>
                        {/* Compact icon indicators: HR, Tech, Presentation */}
                        <div className="flex items-center gap-3">
                          {(() => {
                            const forms = candidate.forms ?? [];
                            const match = (fn: (t: string) => boolean) => {
                              const entry = forms.find((f) => fn((f.title || "").toLowerCase()));
                              return {
                                exists: Boolean(entry),
                                submitted: Boolean(entry?.forms_by_me),
                              };
                            };
                            const hr = match((t) => t.includes("hr"));
                            const tech = match((t) => t.includes("tech"));
                            const pres = match((t) => t.includes("present"));
                            const Item = ({
                              title,
                              submitted,
                              exists,
                              Icon,
                            }: {
                              title: string;
                              submitted: boolean;
                              exists: boolean;
                              Icon: any;
                            }) => (
                              <div className="relative" title={title}>
                                <Icon className={`size-5 text-white dark:text-white`} />
                                <span
                                  className={`absolute -right-1 -bottom-1 block size-2.5 rounded-full border border-background ${
                                    exists
                                      ? submitted
                                        ? "bg-emerald-400 dark:bg-emerald-300"
                                        : "bg-red-400 dark:bg-red-300"
                                      : "bg-muted-foreground/40"
                                  }`}
                                />
                              </div>
                            );
                            return (
                              <>
                                <Item
                                  title="HR"
                                  submitted={hr.submitted}
                                  exists={hr.exists}
                                  Icon={(props: any) => (
                                    <IconUser
                                      {...props}
                                      className="size-5 text-black dark:text-white"
                                    />
                                  )}
                                />
                                <Item
                                  title="Tech"
                                  submitted={tech.submitted}
                                  exists={tech.exists}
                                  Icon={(props: any) => (
                                    <IconCpu
                                      {...props}
                                      className="size-5 text-black dark:text-white"
                                    />
                                  )}
                                />
                                <Item
                                  title="Presentation"
                                  submitted={pres.submitted}
                                  exists={pres.exists}
                                  Icon={(props: any) => (
                                    <IconPresentation
                                      {...props}
                                      className="size-5 text-black dark:text-white"
                                    />
                                  )}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/candidates/${candidate.id}`}>
                            <IconEye className="size-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <IconChevronLeft className="size-4" />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination info moved outside the card */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedCandidates.length} of {filteredCandidates.length}{" "}
        candidates
      </div>
    </div>
  );
}
