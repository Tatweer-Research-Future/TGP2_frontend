import { SectionCards } from "@/components/section-cards";
import { CandidateCard } from "@/components/candidate-card";
import { candidates } from "@/lib/candidates";


export function DashboardPage() {
  const total = candidates.length;
  const interviewed = candidates.filter((c) => c.status === "interviewed").length;
  const notInterviewed = candidates.filter((c) => c.status === "not_interviewed").length;
  return (
    <>
      <SectionCards total={total} interviewed={interviewed} notInterviewed={notInterviewed} />
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
