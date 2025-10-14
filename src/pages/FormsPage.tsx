import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getForms,
  getFormById,
  submitForm,
  type BackendFormsList,
  type BackendFormField,
  type SubmitFormPayload,
} from "@/lib/api";

type InterviewField = {
  id: number;
  label: string;
  type: "email" | "question" | "text";
  required: boolean;
  order: number;
  weight: number;
  options?: Array<{ id: number; label: string; score: number; order: number }>;
  suggested_questions?: string;
};

type InterviewForm = {
  id: number;
  title: string;
  fields: InterviewField[];
  totalPoints: number;
};

function transformBackendForm(
  fields: BackendFormField[],
  formId: number,
  title: string
): InterviewForm {
  const transformed: InterviewField[] = fields
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      order: f.order,
      weight: Number(f.weight ?? "1"),
      options: f.scale
        ? f.scale.options
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((o) => ({
              id: o.id,
              label: o.label,
              score: Number(o.score),
              order: o.order,
            }))
        : undefined,
      suggested_questions: f.suggested_questions,
    }));

  const totalPoints = transformed.reduce((sum, field) => {
    if (field.type === "question" && field.options && field.options.length > 0) {
      const maxScore = Math.max(...field.options.map((o) => o.score));
      return sum + maxScore * (field.weight || 1);
    }
    return sum;
  }, 0);

  return { id: formId, title, fields: transformed, totalPoints };
}

export function FormsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [availableForms, setAvailableForms] = useState<
    BackendFormsList["results"]
  >([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [form, setForm] = useState<InterviewForm | null>(null);
  const [formsCache, setFormsCache] = useState<Record<number, InterviewForm>>({});
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const list = await getForms();
        if (isCancelled) return;
        const results = Array.isArray(list?.results) ? list.results : [];
        setAvailableForms(results);
        if (results.length > 0) {
          setSelectedFormId(results[0].id);
        }
      } catch (err) {
        toast.error("Failed to load forms");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function loadForm(id: number) {
      setIsFormLoading(true);
      try {
        const fields = await getFormById(id);
        if (isCancelled) return;
        const meta = availableForms.find((f) => f.id === id);
        const transformed = transformBackendForm(fields, id, meta?.title || "");
        setFormsCache((prev) => ({ ...prev, [id]: transformed }));
        setForm(transformed);
        setAnswers({});
        setInvalidFields(new Set());
      } catch (err) {
        toast.error("Failed to load form details");
        setForm(null);
      } finally {
        if (!isCancelled) setIsFormLoading(false);
      }
    }
    if (selectedFormId != null) {
      if (formsCache[selectedFormId]) {
        setForm(formsCache[selectedFormId]);
      } else {
        loadForm(selectedFormId);
      }
    } else {
      setForm(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedFormId, availableForms, formsCache]);

  const handleAnswerChange = (fieldId: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setInvalidFields((prev) => {
      if (!prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form || !user) return;
    // Validate required fields
    const missing = new Set<number>();
    for (const field of form.fields) {
      if (!field.required) continue;
      const v = answers[field.id];
      if (field.type === "question") {
        if (v === undefined || v === null || v === "") missing.add(field.id);
      } else if (field.type === "text" || field.type === "email") {
        const text = (v ?? "").toString().trim();
        if (!text) missing.add(field.id);
      }
    }
    if (missing.size > 0) {
      setInvalidFields(missing);
      toast.error("Please complete the required fields.");
      return;
    }

    const payload: SubmitFormPayload = {
      form_id: form.id,
      targeted_user_id: Number(user.id),
      form_fields: form.fields.map((f) => {
        const value = answers[f.id];
        if (f.type === "question") {
          return {
            form_field_id: f.id,
            selected_option_id:
              value !== undefined && value !== null && value !== ""
                ? Number(value)
                : null,
            text_field_entry: "",
          };
        }
        return {
          form_field_id: f.id,
          selected_option_id: null,
          text_field_entry: (value ?? "").toString(),
        };
      }),
    };

    try {
      setIsSubmitting(true);
      await submitForm(payload);
      toast.success("Form submitted successfully");
      setAnswers({});
    } catch (err) {
      toast.error("Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Forms chooser (reused style from UserDetailPage) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Choose a form</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {availableForms.length === 0 ? (
            <div className="text-sm text-muted-foreground">No forms available</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableForms.map((f) => {
                const isSelected = selectedFormId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormId(f.id)}
                    className={`text-left rounded-md border p-4 transition-colors ${
                      isSelected ? "border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-medium">{f.title}</div>
                        {f.expairy_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Expires {new Date(f.expairy_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {isSelected ? (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Question Cards (reused style) */}
      {isFormLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader />
        </div>
      )}

      {form && !isFormLoading && (
        <>
          {form.fields.map((field) => (
            <Card
              key={field.id}
              className={`${invalidFields.has(field.id) ? "border-1 border-destructive" : ""}`}
            >
              <CardContent className="pt-0 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 text-lg">*</span>
                      )}
                    </h3>
                  </div>
                  <Badge variant="outline" className="ml-4 text-sm">
                    {field.type === "question" && field.options?.length
                      ? `${Math.max(...field.options.map((o) => o.score)) * (field.weight || 1)} points`
                      : "Optional"}
                  </Badge>
                </div>

                {field.type === "question" && field.options && (
                  <RadioGroup
                    value={String(answers[field.id] ?? "")}
                    onValueChange={(value) => handleAnswerChange(field.id, value)}
                    className={`flex flex-wrap gap-6 w-full justify-around`}
                  >
                    {field.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3 min-w-[48px]">
                        <RadioGroupItem value={String(option.id)} id={`f${field.id}-o${option.id}`} />
                        <Label htmlFor={`f${field.id}-o${option.id}`} className="text-base font-normal cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {field.type !== "question" && (
                  <div className="space-y-2 pt-2">
                    {field.type === "text" ? (
                      <Textarea
                        id={`field-${field.id}`}
                        placeholder="Type here..."
                        value={String(answers[field.id] ?? "")}
                        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                        className={`min-h-[100px]`}
                      />
                    ) : (
                      <input
                        id={`field-${field.id}`}
                        type="email"
                        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`}
                        value={String(answers[field.id] ?? "")}
                        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !form}
              className="h-11 text-lg bg-[#1EDE9E] text-white hover:bg-[#19c98c] disabled:opacity-50"
              size="sm"
            >
              {isSubmitting ? "Submitting..." : "Submit Form"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
