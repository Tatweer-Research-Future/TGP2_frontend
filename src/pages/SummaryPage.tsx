import { candidates } from "@/lib/candidates";
import { CandidateCard } from "@/components/candidate-card";

export function SummaryPage() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Summary</h1>
        <p className="text-muted-foreground">Overview of candidates</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}


