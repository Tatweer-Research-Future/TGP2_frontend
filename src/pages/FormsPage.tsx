import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getForms,
  getFormById,
  submitForm,
  type BackendFormsList,
  type BackendForm,
  type BackendFormField,
  type SubmitFormPayload,
} from "@/lib/api";

// Labels that should always be visible and never treated as sub-questions
const EXCEPTION_ALWAYS_VISIBLE_LABELS = new Set<string>([
  "هل لديك اي ملاحظات او اقتراحات؟",
]);

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
  is_sub_questions: boolean;
  fields: InterviewField[];
  totalPoints: number;
};

function transformBackendForm(
  backendForm: BackendForm
): InterviewForm {
  const transformed: InterviewField[] = backendForm.fields
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

  return { 
    id: backendForm.id, 
    title: backendForm.title, 
    is_sub_questions: backendForm.is_sub_questions,
    fields: transformed, 
    totalPoints 
  };
}

// Helper function to check if a field should be visible based on sub-questions logic
function shouldFieldBeVisible(
  fieldIndex: number,
  fields: InterviewField[],
  answers: Record<number, string | number>,
  isSubQuestions: boolean
): boolean {
  if (!isSubQuestions) return true;
  
  const currentField = fields[fieldIndex];
  if (EXCEPTION_ALWAYS_VISIBLE_LABELS.has((currentField.label || "").trim())) {
    return true;
  }
  
  // Required fields are always visible
  if (currentField.required) {
    return true;
  }
  
  // For non-required fields, check if they are sub-questions of a Yes/No question
  // Look backwards to find the most recent Yes/No question
  for (let i = fieldIndex - 1; i >= 0; i--) {
    const field = fields[i];
    
    // Check if this is a Yes/No question (regardless of whether it's required)
    // Yes/No questions have exactly 2 options with scores 0 and 1
    if (field.type === "question" && field.options && field.options.length === 2) {
      const isYesNo = field.options.every(opt => opt.score === 0 || opt.score === 1);
      if (isYesNo) {
        const answer = answers[field.id];
        if (answer !== undefined) {
          // Find the "Yes" option (score = 1)
          const yesOption = field.options.find(opt => opt.score === 1);
          const isYes = yesOption ? Number(answer) === yesOption.id : false;
          
          // If "Yes" was selected, show this sub-question
          // If "No" was selected, hide this sub-question
          return isYes;
        }
        // If no answer yet, hide the sub-question
        return false;
      }
    }
    
    // If we hit a required field that is NOT a Yes/No question, stop looking
    // This field is not a sub-question
    if (field.required && !(field.type === "question" && field.options && field.options.length === 2 && field.options.every(opt => opt.score === 0 || opt.score === 1))) {
      return true;
    }
  }
  
  // If no Yes/No question found before this field, show it
  return true;
}

// Helper to determine if a field is a sub-question (for styling/indent only)
function isSubQuestionField(
  fieldIndex: number,
  fields: InterviewField[],
  answers: Record<number, string | number>,
  isSubQuestions: boolean
): boolean {
  if (!isSubQuestions) return false;
  const current = fields[fieldIndex];
  if (EXCEPTION_ALWAYS_VISIBLE_LABELS.has((current.label || "").trim())) {
    return false;
  }
  if (current.required) return false; // required questions are never styled as sub

  for (let i = fieldIndex - 1; i >= 0; i--) {
    const prev = fields[i];
    const isYesNo =
      prev.type === "question" &&
      !!prev.options &&
      prev.options.length === 2 &&
      prev.options.every((opt) => opt.score === 0 || opt.score === 1);

    if (isYesNo) {
      // Nearest Yes/No found → current is a sub-question of it
      return true;
    }

    // Hitting a required non-Yes/No question breaks the chain
    if (prev.required) {
      return false;
    }
  }

  return false;
}

export function FormsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [availableForms, setAvailableForms] = useState<
    BackendFormsList["results"]
  >([]);
  const [selectedFormHasSubmitted, setSelectedFormHasSubmitted] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [form, setForm] = useState<InterviewForm | null>(null);
  const [formsCache, setFormsCache] = useState<Record<number, InterviewForm>>({});
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
          setSelectedFormHasSubmitted(results[0].has_submitted || false);
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
        const backendForm = await getFormById(id);
        if (isCancelled) return;
        const transformed = transformBackendForm(backendForm);
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
      // Update the has_submitted status for the selected form
      const selectedForm = availableForms.find(f => f.id === selectedFormId);
      setSelectedFormHasSubmitted(selectedForm?.has_submitted || false);

      if (formsCache[selectedFormId]) {
        setForm(formsCache[selectedFormId]);
      } else {
        loadForm(selectedFormId);
      }
    } else {
      setForm(null);
      setSelectedFormHasSubmitted(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedFormId, availableForms, formsCache]);

  const handleAnswerChange = (fieldId: number, value: string | number) => {
    if (selectedFormHasSubmitted) return; // Prevent changes if form is already submitted
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setInvalidFields((prev) => {
      if (!prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  const handleSubmitClick = () => {
    if (!form || !user || selectedFormHasSubmitted) return;
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    if (!form || !user || selectedFormHasSubmitted) return;
    // Validate required fields (only visible ones)
    const missing = new Set<number>();
    for (let i = 0; i < form.fields.length; i++) {
      const field = form.fields[i];
      const isVisible = shouldFieldBeVisible(i, form.fields, answers, form.is_sub_questions);
      
      if (!isVisible || !field.required) continue;
      
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
      form_fields: form.fields
        .map((f, index) => ({ field: f, index }))
        .filter(({ index }) => shouldFieldBeVisible(index, form.fields, answers, form.is_sub_questions))
        .map(({ field: f }) => {
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
      toast.success(t('pages.forms.formSubmitted'));
      setShowConfirmDialog(false);
      // Refresh the page to update form states
      window.location.reload();
    } catch (err) {
      toast.error(t('errors.serverError'));
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
          <CardTitle className="text-base font-semibold">{t('pages.forms.title')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {availableForms.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('table.noData')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableForms.map((f) => {
                const isSelected = selectedFormId === f.id;
                const isSubmitted = f.has_submitted;
                return (
                  <button
                    key={f.id}
                    onClick={() => !isSubmitted && setSelectedFormId(f.id)}
                    disabled={isSubmitted}
                    className={`text-left rounded-md border p-4 transition-colors ${isSelected
                      ? "border-primary"
                      : isSubmitted
                        ? "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 cursor-not-allowed opacity-60"
                        : "border-border hover:bg-muted"
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
                      <div className="flex flex-col gap-1">
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                        {isSubmitted && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/40">
                            Submitted
                          </Badge>
                        )}
                      </div>
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
          {selectedFormHasSubmitted && (
            <Card className="border-green-200 bg-green-50 dark:border-green-500/40 dark:bg-green-900/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">Form Already Submitted</h3>
                    <p className="text-xs text-green-600 dark:text-green-400">This form has been completed and cannot be modified.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {!selectedFormHasSubmitted && form.fields.map((field, fieldIndex) => {
            const isVisible = shouldFieldBeVisible(fieldIndex, form.fields, answers, form.is_sub_questions);
            
            if (!isVisible) return null;
            
          // Sub-question styling: based on structure, not on answer
          const isSubQuestion = isSubQuestionField(fieldIndex, form.fields, answers, form.is_sub_questions);
            
            return (
            <Card
              key={field.id}
              className={`${invalidFields.has(field.id) ? "border-1 border-destructive" : ""} ${isSubQuestion ? "ml-6 border-l-4 border-l-blue-200 bg-blue-50/30 dark:border-l-blue-500/40 dark:bg-blue-900/20" : ""}`}
            >
              <CardContent className="pt-0 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {isSubQuestion && (
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-normal">↳</span>
                      )}
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
                    disabled={selectedFormHasSubmitted}
                    className={`flex flex-wrap gap-6 w-full justify-around ${selectedFormHasSubmitted ? 'opacity-60' : ''}`}
                  >
                    {field.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3 min-w-[48px]">
                        <RadioGroupItem
                          value={String(option.id)}
                          id={`f${field.id}-o${option.id}`}
                          disabled={selectedFormHasSubmitted}
                        />
                        <Label
                          htmlFor={`f${field.id}-o${option.id}`}
                          className={`text-base font-normal ${selectedFormHasSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
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
                        disabled={selectedFormHasSubmitted}
                        className={`min-h-[100px] ${selectedFormHasSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    ) : (
                      <input
                        id={`field-${field.id}`}
                        type="email"
                        disabled={selectedFormHasSubmitted}
                        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${selectedFormHasSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={String(answers[field.id] ?? "")}
                        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          }          )}

          {!selectedFormHasSubmitted && (
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitClick}
                disabled={isSubmitting || !form}
                className="h-11 text-lg bg-[#1EDE9E] text-white hover:bg-[#19c98c] disabled:opacity-50"
                size="sm"
              >
                {isSubmitting ? t('common.buttons.submit') + "..." : t('pages.forms.submitForm')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirm Form Submission</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to submit this form? Once submitted, you won't be able to make changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#1EDE9E] text-white hover:bg-[#19c98c]"
            >
              {isSubmitting ? "Submitting..." : "Submit Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
