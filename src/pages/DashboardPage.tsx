import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CandidateStatusChart } from "@/components/candidate-status-chart";
import { getCandidates } from "@/lib/api";
import { transformBackendCandidate, type Candidate } from "@/lib/candidates";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { IconArrowRight } from "@tabler/icons-react";
import { useCandidates } from "@/context/CandidatesContext";

export function DashboardPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setCandidates: setCandidatesContext } = useCandidates();

  // Fetch candidates from backend
  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await getCandidates(5); // group_id=5 for candidates
      const transformedCandidates = response.results.map(
        transformBackendCandidate
      );
      setCandidates(transformedCandidates);
      setCandidatesContext(transformedCandidates); // Share with context
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      toast.error("Failed to load candidates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const total = candidates.length;
  const interviewed = candidates.filter(
    (c) => c.status === "interviewed"
  ).length;
  const notInterviewed = candidates.filter(
    (c) => c.status === "not_interviewed"
  ).length;

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col items-center gap-8">
        <div className="w-full max-w-2xl">
          <CandidateStatusChart
            interviewed={interviewed}
            notInterviewed={notInterviewed}
            total={total}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="px-6 py-2 text-base font-medium transition-all duration-300 hover:scale-105"
          onClick={() => navigate("/candidates")}
        >
          Go to Candidates
          <IconArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
