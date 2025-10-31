import { useParams } from "react-router-dom";

export default function ModuleExamResultsPage() {
  const { id } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Exam Results</h1>
      <p className="text-muted-foreground mt-2">Module ID: {id}</p>
      <div className="mt-6 text-sm text-muted-foreground">
        This page will display student results for this module's exam.
      </div>
    </div>
  );
}


