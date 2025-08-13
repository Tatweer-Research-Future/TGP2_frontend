import { useState, useEffect } from "react";
import { SectionCards } from "@/components/section-cards";
import { CandidateCard } from "@/components/candidate-card";
import { getCandidates } from "@/lib/api";
import { transformBackendCandidate, type Candidate } from "@/lib/candidates";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

export function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch candidates from backend
  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await getCandidates(5); // group_id=5 for candidates
      const transformedCandidates = response.results.map(
        transformBackendCandidate
      );
      setCandidates(transformedCandidates);
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
      <>
        <SectionCards total={0} interviewed={0} notInterviewed={0} />
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SectionCards
        total={total}
        interviewed={interviewed}
        notInterviewed={notInterviewed}
      />
      {/** Chart temporarily removed from dashboard */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      </div>
    </>
  );
}
