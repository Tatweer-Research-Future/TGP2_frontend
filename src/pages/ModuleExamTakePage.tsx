import { useParams } from "react-router-dom";

export default function ModuleExamTakePage() {
  const { id } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Take Exam</h1>
      <p className="text-muted-foreground mt-2">Module ID: {id}</p>
      <div className="mt-6 text-sm text-muted-foreground">
        This page will let a trainee take the exam for this module.
      </div>
    </div>
  );
}


