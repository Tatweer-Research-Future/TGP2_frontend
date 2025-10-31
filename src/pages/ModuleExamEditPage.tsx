import { useParams } from "react-router-dom";

export default function ModuleExamEditPage() {
  const { id } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Edit Exam</h1>
      <p className="text-muted-foreground mt-2">Module ID: {id}</p>
      <div className="mt-6 text-sm text-muted-foreground">
        This page will allow instructors to edit an existing module exam.
      </div>
    </div>
  );
}


