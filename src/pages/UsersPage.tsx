import { useState, useMemo } from "react";
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
} from "@tabler/icons-react";

// Candidate status type
type CandidateStatus = "not_interviewed" | "in_progress" | "interviewed";

// Dummy candidates data
const dummyCandidates = [
  {
    id: "1",
    fullName: "Ahmed Hassan Mohammed",
    email: "ahmed.hassan@example.com",
    status: "interviewed" as CandidateStatus,
    appliedDate: "2024-01-15",
  },
  {
    id: "2",
    fullName: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    status: "in_progress" as CandidateStatus,
    appliedDate: "2024-01-20",
  },
  {
    id: "3",
    fullName: "Omar Al-Rashid",
    email: "omar.rashid@example.com",
    status: "not_interviewed" as CandidateStatus,
    appliedDate: "2024-01-22",
  },
  {
    id: "4",
    fullName: "Maria Rodriguez",
    email: "maria.rodriguez@example.com",
    status: "interviewed" as CandidateStatus,
    appliedDate: "2024-01-18",
  },
  {
    id: "5",
    fullName: "Alex Chen",
    email: "alex.chen@example.com",
    status: "in_progress" as CandidateStatus,
    appliedDate: "2024-01-25",
  },
  {
    id: "6",
    fullName: "Fatima Al-Zahra",
    email: "fatima.zahra@example.com",
    status: "not_interviewed" as CandidateStatus,
    appliedDate: "2024-01-28",
  },
  {
    id: "7",
    fullName: "David Wilson",
    email: "david.wilson@example.com",
    status: "interviewed" as CandidateStatus,
    appliedDate: "2024-01-12",
  },
  {
    id: "8",
    fullName: "Layla Mahmoud",
    email: "layla.mahmoud@example.com",
    status: "in_progress" as CandidateStatus,
    appliedDate: "2024-01-30",
  },
  {
    id: "9",
    fullName: "Robert Brown",
    email: "robert.brown@example.com",
    status: "not_interviewed" as CandidateStatus,
    appliedDate: "2024-02-01",
  },
  {
    id: "10",
    fullName: "Noor Ibrahim",
    email: "noor.ibrahim@example.com",
    status: "interviewed" as CandidateStatus,
    appliedDate: "2024-01-08",
  },
  {
    id: "11",
    fullName: "Michael Davis",
    email: "michael.davis@example.com",
    status: "in_progress" as CandidateStatus,
    appliedDate: "2024-02-03",
  },
  {
    id: "12",
    fullName: "Amina Youssef",
    email: "amina.youssef@example.com",
    status: "not_interviewed" as CandidateStatus,
    appliedDate: "2024-02-05",
  },
];

const statusLabels = {
  not_interviewed: { label: "Not Interviewed", variant: "outline" as const },
  in_progress: { label: "In Progress", variant: "secondary" as const },
  interviewed: { label: "Interviewed", variant: "default" as const },
};

const ITEMS_PER_PAGE = 8;

export function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search logic
  const filteredCandidates = useMemo(() => {
    return dummyCandidates.filter((candidate) => {
      const matchesSearch =
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || candidate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

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

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Candidates</h1>
          <p className="text-muted-foreground">
            Manage and review candidate applications
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <IconFilter className="size-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_interviewed">
                      Not Interviewed
                    </SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {paginatedCandidates.length} of{" "}
              {filteredCandidates.length} candidates
            </div>
          </CardContent>
        </Card>
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
                <TableHead>Candidate</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
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
                paginatedCandidates.map((candidate) => (
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
                        <span className="font-medium">
                          {candidate.fullName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[candidate.status].variant}>
                        {statusLabels[candidate.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(candidate.appliedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/users/${candidate.id}`}>
                          <IconEye className="size-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
    </div>
  );
}
