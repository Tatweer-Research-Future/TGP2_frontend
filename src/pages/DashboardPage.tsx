import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { candidates } from "@/lib/candidates";


export function DashboardPage() {
  const total = candidates.length;
  const interviewed = candidates.filter((c) => c.status === "interviewed").length;
  const notInterviewed = candidates.filter((c) => c.status === "not_interviewed").length;
  return (
    <>
      <SectionCards total={total} interviewed={interviewed} notInterviewed={notInterviewed} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
    </>
  );
}
