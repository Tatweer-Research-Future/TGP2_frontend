import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { AIAnalysisBanner } from "@/components/ai-analysis-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { Loader } from "@/components/ui/loader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconMail,
  IconPhone,
  IconFileUpload,
  IconCalendar,
  IconSchool,
  IconBriefcase,
  IconClipboardList,
  IconTags,
  IconFile,
  IconFileText,
  IconFileDescription,
  IconFileSpreadsheet,
  IconFileZip,
  IconFileCode,
  IconExternalLink,
  IconTarget,
  IconMapPin,
  IconSparkles,
  IconPresentation,
} from "@tabler/icons-react";
import { IconPlayerPlay, IconPlayerPause, IconFlagCheck, IconClock, IconRefresh } from "@tabler/icons-react";
import { FaGithub, FaLinkedin, FaUniversity } from "react-icons/fa";
import { useEffect } from "react";
import { generateWithGemini } from "@/services/gemini";
import {
  getUserDetailById,
  type BackendUserDetail,
  getForms,
  getFormById,
  type BackendFormField,
  submitForm,
  type SubmitFormPayload,
  patchUserAiAnalysis,
  getUserAiAnalysis,
} from "@/lib/api";
import { toast } from "sonner";
import { useCandidates } from "@/context/CandidatesContext";
import { type Candidate } from "@/lib/candidates";

type UserDetail = {
  id: string;
  fullName: string;
  fullNameArabic?: string;
  email: string;
  city?: string;
  phoneNo?: string;
  gender?: string;
  birthdate?: string;
  qualification?: string;
  fieldOfStudy?: string;
  institutionName?: string;
  gpa?: string;
  arabicProficiency?: string;
  englishProficiency?: string;
  graduationYear?: string;
  iqExamScore?: string;
  englishExamScore?: string;
  presentationTopic?: string;
  technicalSkills: Array<{
    skill: string;
    proficiency: string;
    medium: string;
  }>;
  workExperience: Array<{
    project?: string;
    company?: string;
    duration?: string;
  }>;
  coursesTaken: Array<{ name?: string; entity?: string; date?: string }>;
  fieldsChosen: string[];
  resumeUrl?: string;
  socials: { github?: string | null; linkedin?: string | null };
  otherFiles: string[]; // normalized list of file URLs
  interviewedByMe: boolean;
  forms?: Array<{ id: number; title: string; forms_by_me: boolean }>;
  formsEntries?: Array<{
    form: { id: number; title: string };
    entries: Array<{
      id: number;
      submitted_by?: { id: number; name: string } | null;
      final_score?: number | null;
      fields: Array<
        | { label: string; option: string; score: number }
        | { label: string; text: string }
      >;
    }>;
  }>;
};

function normalizeScore(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const text = String(raw).trim();
  if (!text) return undefined;
  // Extract first number in the string
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  return match[0];
}

function transformBackendUserDetail(data: BackendUserDetail): UserDetail {
  const add = data.additional_fields ?? {};
  const info = add.additional_information ?? {};

  const fullName = add.full_name_en || data.name || "";
  const fullNameArabic = add.full_name || undefined;

  // Normalize other files: include cert (single) and other_files (array or string)
  const otherFilesRaw = add.other_files;
  const otherFiles: string[] = [];
  if (typeof add.cert === "string" && add.cert.trim())
    otherFiles.push(add.cert.trim());
  if (Array.isArray(otherFilesRaw)) {
    for (const f of otherFilesRaw) {
      if (typeof f === "string" && f.trim()) otherFiles.push(f.trim());
    }
  } else if (typeof otherFilesRaw === "string" && otherFilesRaw.trim()) {
    otherFiles.push(otherFilesRaw.trim());
  }

  const iqScore = normalizeScore((data as any).iq_exam_score);
  const englishScore = (data as any).english_exam_score ?? undefined;

  const forms = (data as any).forms ?? [];
  const hasInterviewedMe = Array.isArray(forms) && forms.some((f: any) => Boolean(f?.forms_by_me));
  return {
    id: String(data.id),
    fullName,
    fullNameArabic,
    email: data.email,
    city: info.city ?? undefined,
    phoneNo: add.phone ?? undefined,
    gender: info.gender ?? undefined,
    birthdate: info.birthdate ?? undefined,
    qualification: info.qualification ?? undefined,
    fieldOfStudy: info.fieldOfStudy ?? undefined,
    institutionName: (info as any).institutionName ?? undefined,
    gpa: info.gpa ?? undefined,
    arabicProficiency: (info as any).arabicProficiency ?? undefined,
    englishProficiency: info.englishProficiency ?? undefined,
    graduationYear: (add as any).graduation_year ?? undefined,
    iqExamScore: iqScore,
    englishExamScore: englishScore,
    presentationTopic: (add as any).topic ?? undefined,
    technicalSkills: Array.isArray((info as any).technicalSkills)
      ? ((info as any).technicalSkills as any[]).map((t) => ({
        skill: (t?.skill ?? "") as string,
        medium: (t?.medium ?? "") as string,
        proficiency: (t?.proficiency ?? "") as string,
      }))
      : [],
    workExperience: (info.workExperience ?? []) as UserDetail["workExperience"],
    coursesTaken: (info.coursesTaken ?? []) as UserDetail["coursesTaken"],
    fieldsChosen: (info.fieldsChosen ?? []) as string[],
    resumeUrl: info.resumeUrl ?? undefined,
    socials: {
      github: add.github ?? null,
      linkedin: add.linkedin ?? null,
    },
    otherFiles,
    interviewedByMe: hasInterviewedMe,
    forms: (data as any).forms ?? [],
    formsEntries: (data as any).forms_entries ?? [],
  };
}

// Helper to compute graduation status text and whether it is upcoming or past
function getGraduationInfo(graduationYear?: string): {
  text: string;
  isFuture: boolean;
} {
  if (!graduationYear) return { text: "Unknown", isFuture: false };

  // If it's just a year (4 digits), return it as is
  if (/^\d{4}$/.test(graduationYear)) {
    const year = parseInt(graduationYear);
    const currentYear = new Date().getFullYear();
    return { text: graduationYear, isFuture: year > currentYear };
  }

  let date: Date | null = null;

  // Handle different date formats
  if (/^\d{4}-\d{2}$/.test(graduationYear)) {
    // Format: "2025-02"
    date = new Date(`${graduationYear}-01`);
  } else {
    // Try parsing as any date format (MM/DD/YYYY, YYYY-MM-DD, etc.)
    const parsed = new Date(graduationYear);
    date = isNaN(parsed.getTime()) ? null : parsed;
  }

  if (!date) return { text: graduationYear, isFuture: false };

  const now = new Date();
  const isFuture = date.getTime() > now.getTime();

  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
  });

  return { text: formatter.format(date), isFuture };
}

// Pick a file icon based on extension
function getFileIconComponent(url: string) {
  const ext = (url.split(".").pop() || "").toLowerCase();
  if (["pdf"].includes(ext)) return IconFileText; // use text icon for consistency
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return IconFileDescription;
  if (["xls", "xlsx", "csv"].includes(ext)) return IconFileSpreadsheet;
  if (["zip", "rar", "7z"].includes(ext)) return IconFileZip;
  if (
    [
      "json",
      "js",
      "ts",
      "py",
      "java",
      "c",
      "cpp",
      "cs",
      "html",
      "css",
      "md",
    ].includes(ext)
  )
    return IconFileCode;
  if (["doc", "docx", "rtf", "txt"].includes(ext)) return IconFileText;
  return IconFile;
}

// Get badge variant for English proficiency level

// Dynamic interview form types
type InterviewField = {
  id: number;
  label: string;
  type: "email" | "question" | "text";
  required: boolean;
  order: number;
  weight: number; // numeric weight
  // For question
  options?: Array<{ id: number; label: string; score: number; order: number }>;
  suggested_questions?: string;
};

type InterviewForm = {
  id: number;
  title: string;
  fields: InterviewField[];
  totalPoints: number; // Sum of max option score * weight for question fields
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
    if (
      field.type === "question" &&
      field.options &&
      field.options.length > 0
    ) {
      const maxScore = Math.max(...field.options.map((o) => o.score));
      return sum + maxScore * (field.weight || 1);
    }
    return sum;
  }, 0);

  return { id: formId, title, fields: transformed, totalPoints };
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const { candidates, setCandidates } = useCandidates();

  // Interview form state
  const [form, setForm] = useState<InterviewForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [storedAnalysis, setStoredAnalysis] = useState<string | null>(null);

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  // Collapse state for Breakdown sections
  const [hrDetailsOpen, setHrDetailsOpen] = useState(false);
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);
  // Dynamic details state for other forms (e.g., Presentation)
  const [detailsOpenByFormId, setDetailsOpenByFormId] = useState<Record<number, boolean>>({});

  // Forms selection state
  const [availableForms, setAvailableForms] = useState<
    Array<{ id: number; title: string; expairy_date: string }>
  >([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [formsCache, setFormsCache] = useState<Record<number, InterviewForm>>({});
  const [isFormLoading, setIsFormLoading] = useState(false);

  // Presentation timer state
  const [presentationTimerSeconds, setPresentationTimerSeconds] = useState(0);
  const [isPresentationTimerRunning, setIsPresentationTimerRunning] = useState(false);
  const [presentationTimeFieldId, setPresentationTimeFieldId] = useState<number | null>(null);
  const [isPresentationFinished, setIsPresentationFinished] = useState(false);
  const [presentationAccumulatedMs, setPresentationAccumulatedMs] = useState(0);
  const [presentationLastStartMs, setPresentationLastStartMs] = useState<number | null>(null);
  const [activePresentationFormId, setActivePresentationFormId] = useState<number | null>(null);

  // Tick timer when running
  useEffect(() => {
    if (!isPresentationTimerRunning) return;
    const interval = setInterval(() => {
      setPresentationTimerSeconds(() => {
        const now = Date.now();
        const runningMs = presentationLastStartMs != null ? now - presentationLastStartMs : 0;
        const totalMs = presentationAccumulatedMs + runningMs;
        return Math.floor(totalMs / 1000);
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPresentationTimerRunning, presentationLastStartMs, presentationAccumulatedMs]);

  // Keep seconds in sync when paused
  useEffect(() => {
    if (!isPresentationTimerRunning) {
      setPresentationTimerSeconds(Math.floor(presentationAccumulatedMs / 1000));
    }
  }, [isPresentationTimerRunning, presentationAccumulatedMs]);

  // When form changes, detect Presentation form and the Time field
  useEffect(() => {
    const isPresentation = (form?.title || "").toLowerCase().includes("present");
    if (!isPresentation || !form) {
      setPresentationTimeFieldId(null);
      setActivePresentationFormId(null);
      setIsPresentationTimerRunning(false);
      setIsPresentationFinished(false);
      setPresentationLastStartMs(null);
      setPresentationAccumulatedMs(0);
      setPresentationTimerSeconds(0);
      return;
    }
    const timeField = form.fields.find((f) => f.type !== "question" && (f.label || "").trim().toLowerCase() === "time");
    setPresentationTimeFieldId(timeField ? timeField.id : null);
    // Only reset timer when switching to a NEW presentation form
    if (activePresentationFormId !== form.id) {
      setActivePresentationFormId(form.id);
      setIsPresentationTimerRunning(false);
      setIsPresentationFinished(false);
      setPresentationLastStartMs(null);
      setPresentationAccumulatedMs(0);
      setPresentationTimerSeconds(0);
    }
  }, [form, activePresentationFormId]);

  function formatTimer(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = hours > 0 ? String(hours).padStart(2, "0") + ":" : "";
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${hh}${mm}:${ss}`;
  }

  function handlePresentationStart() {
    if (!isPresentationTimerRunning) {
      setPresentationLastStartMs(Date.now());
    }
    setIsPresentationTimerRunning(true);
  }

  function handlePresentationPause() {
    if (presentationLastStartMs != null) {
      const now = Date.now();
      setPresentationAccumulatedMs((ms) => ms + (now - presentationLastStartMs));
    }
    setPresentationLastStartMs(null);
    setIsPresentationTimerRunning(false);
  }

  function handlePresentationFinish() {
    const now = Date.now();
    let totalMs = presentationAccumulatedMs;
    if (presentationLastStartMs != null) {
      totalMs += now - presentationLastStartMs;
    }
    const totalSeconds = Math.floor(totalMs / 1000);
    setIsPresentationTimerRunning(false);
    setIsPresentationFinished(true);
    setPresentationLastStartMs(null);
    setPresentationAccumulatedMs(totalMs);
    setPresentationTimerSeconds(totalSeconds);
    if (presentationTimeFieldId != null) {
      const value = formatTimer(totalSeconds);
      setAnswers((prev) => ({ ...prev, [presentationTimeFieldId]: value }));
      toast.success(`Presentation time saved: ${value}`);
    }
  }

  function handlePresentationReset() {
    setIsPresentationTimerRunning(false);
    setPresentationTimerSeconds(0);
    setIsPresentationFinished(false);
    setPresentationLastStartMs(null);
    setPresentationAccumulatedMs(0);
    if (presentationTimeFieldId != null) {
      setAnswers((prev) => {
        const next = { ...prev } as Record<number, string | number>;
        delete (next as any)[presentationTimeFieldId];
        return next;
      });
    }
  }

  const handleAnalyzeClick = async () => {
    if (!user) return;
    try {
      setIsGeminiLoading(true);
      setGeminiResponse(null);

      const instruction = `You are an expert AI assistant tasked with evaluating candidates for the "Tatweer Graduate Program 2025" (TGP2025). Your purpose is to analyze a candidate's profile, provided in JSON format, and provide a concise, data-driven evaluation that strongly incorporates CV evidence and calibrates interview scores for interviewer bias.

**Program Context: TGP2025**
*   **Program Name:** Tatweer Graduate Program 2025
*   **Target Audience:** Recent graduates in tech fields (Data, Software, Networks, AI, Cybersecurity).
*   **Evaluation Data:** IQ test, technical interview scores/notes, HR interview scores/notes, English test results, and candidate-provided information (equivalent to a CV). Interview scores can vary by interviewer (harsh vs. lenient). Treat interviews as one signal among several. Give the CV substantial weight.

**Tone and Style:**
*   **Be direct and concise.**
*   **Avoid filler words and speculative language.**
*   **Focus on evidence-based analysis.** Base every conclusion directly on the data provided in the JSON.
*   Use bullet points for clarity.

**Evaluation Criteria:**
Synthesize information from these key areas to inform the overall score. **All scores must be interpreted relative to the performance of the entire candidate pool.** Do not rely solely on interview scores; anchor your judgment in concrete CV evidence (projects, internships, skills) and triangulate with interview notes and English proficiency.

1.  **Candidate Background (CV Information):** Analyze the candidate's profile as you would a CV. Pay close attention to \`workExperience\`, \`coursesTaken\`, \`technicalSkills\`, \`gpa\`, \`fieldOfStudy\`, \`statement_of_purpose\`, and \`github\` link (if present). When available, prefer concrete CV signals (sustained projects, internships, contributions, tools used) over subjective interview impressions.

2.  **Interview Performance Context (Calibrated for interviewer bias):**
    *   **Technical Interview (Max Raw Score: 50):**
        *   First, normalize the candidate's average raw score to a percentage: \`(average_raw_score / 50) * 100\`.
        *   Then, use the distribution chart to assess this percentage. Most candidates score between 20-50%.
        *   **Excellent:** 60%+
        *   **Strong:** 40% - 59%
        *   **Average / Developing:** 20% - 39%
        *   **Weak:** 0% - 19%
    *   **HR Interview (Max Raw Score: 26):**
        *   First, normalize the candidate's average raw score to a percentage: \`(average_raw_score / 26) * 100\`.
        *   Then, use the distribution chart to assess this percentage. Note that the vast majority of candidates score high (80%+), so a high score is the expectation.
        *   **Excellent:** 90%+ (Exceeds expectations)
        *   **Expected:** 70% - 89% (Meets program expectations)
        *   **Concerning:** 50% - 69% (Below average, a potential red flag)
        *   **Weak:** 0% - 49% (Significant concern)

    Calibration rules (apply to both Technical and HR):
    *   If multiple interviewers scored the candidate, use the median of interviewer totals as the primary signal. Identify and downweight outliers (>20 percentage points from the median) to 50% impact.
    *   If only one interviewer scored the candidate, treat interview confidence as medium and cap the interview's contribution when computing the overall score (see Scoring Approach).
    *   When interview scores conflict with strong CV evidence (e.g., sustained relevant projects/internships, strong GitHub), favor CV evidence and explicitly note the discrepancy.

3.  **Program-wide Interviewer Baselines and Bias Calibration:**
    You are provided with average normalized scoring tendencies for interviewers (0 to 1 scale). Use these baselines to re-center interviewer scores onto a common scale before using them in the evaluation. The baselines may also be provided in the candidate JSON under \`interviewer_bias\`.

    Known baselines (approximate, normalized 0–1):
    {
      "raouf": 0.79,
      "anas": 0.78,
      "Yousuf Aldharrat": 0.77,
      "Mohammed alrafadi": 0.73,
      "Ahmed Elomami": 0.72,
      "Mohanned Najam": 0.71,
      "Nouran Elarabi": 0.67,
      "Ahmed B.": 0.65,
      "Ehab Alraid": 0.63,
      "Hanan Mohammed": 0.55,
      "Aml": 0.49,
      "Istabrak": 0.53,
      "Amine": 0.40,
      "Hana": 0.36,
      "Salma": 0.32,
      "Mohammed A": 0.15
    }
    Global average across interviewers: 0.61 (approx.).

    Bias-adjustment algorithm (no external tools needed):
    *   For each interviewer i with baseline \(\mu_i\) and the global average \(\mu_{all}=0.61\), convert the candidate's normalized score s (in [0,1]) to an adjusted score:
        \( s' = \operatorname{clip}_{[0,1]}( s + \lambda (\mu_{all} - \mu_i) ) \)
        where \n
        - \(\lambda\) depends on how much evidence you have:
          - 0.7 if there is only a single interviewer,
          - 0.5 if there are two interviewers,
          - 0.3 if there are three or more interviewers.
        - Cap the absolute adjustment at 0.10 (±10 percentage points).
    *   If multiple interviewers scored the candidate, compute \(s'\) for each, then use the weighted median where weights are \(w_i = 1 - \min(0.4, |\mu_i - \mu_{all}|)\). This downweights very lenient/harsh interviewers.
    *   If a baseline for an interviewer is not provided, assume \(\mu_i = \mu_{all}\) (no adjustment).

4.  **Test Scores Context:**
    *   **IQ Score (Custom Test, 0-60 (the IQ score is not important and must not affect the overall score or selection eligibility. Report it only as a data point)):**
        *   **Top Tier:** 30+
        *   **Above Average:** 24-29
        *   **Average:** 12-23
        *   **Below Average:** 0-11
    *   **English Score (Placement Test Levels):**
        *   **Advanced (Adv-A, B, C):** Top tier; a significant strength.
        *   **High Proficiency (Upper-A, B):** Above average.
        *   **Average (Pre-A, Inter-A, B):** The common range.
        *   **Basic (Elem-A, B, C, Pre-B, C):** Below average; an area for development.

5.  **Scoring Approach (flexible, bias-aware):**
    Compute the overall score using a balanced blend of signals with these defaults (adjust by ±10 total points if justified by evidence and calibration):
    *   CV Evidence: 40%–60% (default 50%)
    *   Technical Interview (after calibration): 20%–35% (default 30%)
    *   HR Interview (after calibration): 5%–15% (default 10%)
    *   English Proficiency: 5%–15% (default 10%)
    Notes:
    *   If only one technical interviewer exists, cap Technical Interview contribution at 20% and shift the difference to CV.
    *   Do not use IQ to increase or decrease the overall score; mention it only in Key Data Points.

**Output Format:**
You must provide your evaluation in the following strict, concise format:

**Candidate Evaluation: [Candidate's Name]**

**Overall Score:** [Score out of 100]

**Justification:**
A brief, 1-2 sentence summary explaining the core reason for your score, synthesizing the candidate's profile and performance.

**Evidence Summary:**

**Strengths:**
*   [Bulleted list of 2-4 key strengths. Each point must be a direct observation. Example: "Strong Technical Interview performance (25/50 | 50%), placing in the 'Strong' tier."]
*   [Example: "Notable CV projects/internship using React + Node, aligned with program focus."]
*   [Example: "English score of Adv-B, indicating Advanced proficiency."]

**Weaknesses:**
*   [Bulleted list of 2-4 key weaknesses. Each point must be a direct observation. Example: "Concerning HR Interview performance (15/26 | 58%), which is below the expected range for candidates."]
*   [Example: "Weak Technical Interview performance (8/50 | 16%)."]
*   [Example: "Limited relevant project experience on CV."]


**Key Data Points:**
*   **Technical Interview:** [Avg Raw Score]/50 | [Normalized %] ([Performance Tier])
*   **HR Interview:** [Avg Raw Score]/26 | [Normalized %] ([Performance Tier])
*   **IQ Score:** [Score] ([Performance Tier])
*   **English Score:** [Score] ([Proficiency Tier])

**CV Usage Requirement:** If CV text is provided between the markers [CV_TEXT_START] and [CV_TEXT_END], you MUST incorporate it in your analysis and include at least one bullet (preferably 2+) in Strengths/Weaknesses derived from the CV (e.g., projects, tools, internships). If the CV could not be accessed, explicitly add a final bullet under Key Data Points: CV: not accessible. Even if CV text is unavailable, treat \`workExperience\`, \`coursesTaken\`, \`technicalSkills\`, \`fieldOfStudy\`, and any \`github\` link as CV evidence and reflect them in Strengths/Weaknesses.

if you read the cv from the link provided with the data add a short section named **CV Insights** (1–3 bullets) only if the CV text is provided and yields useful, concrete signals.`;

      // Build a compact candidate JSON from our current page state
      const interviewerBaselines = {
        raouf: 0.79,
        anas: 0.78,
        "Yousuf Aldharrat": 0.77,
        "Mohammed alrafadi": 0.73,
        "Ahmed Elomami": 0.72,
        "Mohanned Najam": 0.71,
        "Nouran Elarabi": 0.67,
        "Ahmed B.": 0.65,
        "Ehab Alraid": 0.63,
        "Hanan Mohammed": 0.55,
        Aml: 0.49,
        Istabrak: 0.53,
        Amine: 0.40,
        Hana: 0.36,
        Salma: 0.32,
        "Mohammed A": 0.15,
      } as const;

      const candidatePayload = {
        id: user.id,
        name: user.fullName,
        birthdate: user.birthdate ?? null,
        qualification: user.qualification ?? null,
        fieldOfStudy: user.fieldOfStudy ?? null,
        gpa: user.gpa ?? null,
        technicalSkills: user.technicalSkills ?? [],
        coursesTaken: user.coursesTaken ?? [],
        workExperience: user.workExperience ?? [],
        fieldsChosen: user.fieldsChosen ?? [],
        iq_exam_score: user.iqExamScore ?? null,
        english_exam_score: user.englishExamScore ?? null,
        forms_entries: user.formsEntries ?? [],
        // Provide small helpful aggregates already computed on the page
        aggregates: {
          average_hr_final_score: Number(averageScores(hrForm?.entries).toFixed(2)),
          average_technical_final_score: Number(
            averageScores(techForm?.entries).toFixed(2)
          ),
        },
        interviewer_bias: {
          baselines: interviewerBaselines,
          global_average: 0.61,
        },
      };

      // Optionally extract resume text via URL Context in a first pass
      const userPrompt = `Candidate JSON (strict JSON):\n${JSON.stringify(
        candidatePayload,
        null,
        2
      )}`;

      const text = await generateWithGemini({
        user: userPrompt,
        system: instruction,
        urls: user.resumeUrl ? [user.resumeUrl] : undefined,
      });
      setGeminiResponse(text || "No response");

      // Save to backend (non-blocking toast on failure)
      try {
        await patchUserAiAnalysis(user.id, text || "");
        setStoredAnalysis(text || "");
      } catch (saveErr: any) {
        console.warn("Failed to save AI analysis:", saveErr);
        toast.error("Failed to save AI analysis");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Gemini request failed");
    } finally {
      setIsGeminiLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        // Load user
        const userResp = await getUserDetailById(id);
        if (isCancelled) return;
        const transformedUser = transformBackendUserDetail(userResp);
        setUser(transformedUser);

        // Load existing AI analysis for this user
        try {
          const ai = await getUserAiAnalysis(String(userResp.id));
          if (ai?.ai_analysis) {
            setStoredAnalysis(ai.ai_analysis);
            // Immediately populate the banner on load
            setGeminiResponse((prev) => prev ?? (ai.ai_analysis || null));
          }
        } catch (_) {
          // ignore if not found
        }

        // Add candidate to context if not already present
        const candidateExists = candidates.find((c) => c.id === id);
        if (!candidateExists) {
          const newCandidate: Candidate = {
            id: transformedUser.id,
            fullName: transformedUser.fullName,
            fullNameArabic: transformedUser.fullNameArabic,
            email: transformedUser.email,
            status: transformedUser.interviewedByMe
              ? "interviewed"
              : "not_interviewed",
            appliedDate: new Date().toISOString().split("T")[0],
            fieldsChosen: transformedUser.fieldsChosen,
            points: 0,
          };
          setCandidates([...candidates, newCandidate]);
        }

        // Load forms list; selection happens when user clicks a card
        const formsList = await getForms();
        if (isCancelled) return;
        setAvailableForms(formsList.results ?? []);
        setSelectedFormId(null);
        setForm(null);
      } catch (err) {
        console.error("Failed to load user or interview form", err);
        toast.error("Failed to load user or interview form");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, [id, candidates, setCandidates]);

  async function handleSelectForm(formMeta: { id: number; title: string }) {
    setSelectedFormId(formMeta.id);
    // Reset answers/validation when switching forms
    setAnswers({});
    setInvalidFields(new Set());
    if (formsCache[formMeta.id]) {
      setForm(formsCache[formMeta.id]);
      return;
    }
    try {
      setIsFormLoading(true);
      const fields = await getFormById(formMeta.id);
      const transformed = transformBackendForm(fields, formMeta.id, formMeta.title);
      setFormsCache((prev) => ({ ...prev, [formMeta.id]: transformed }));
      setForm(transformed);
    } catch (e) {
      console.error("Failed to load selected form", e);
      toast.error("Failed to load selected form");
    } finally {
      setIsFormLoading(false);
    }
  }

  // Auto-display stored AI analysis when available
  useEffect(() => {
    const text = (storedAnalysis || "").trim();
    if (text && !geminiResponse) {
      setGeminiResponse(text);
    }
  }, [storedAnalysis]);

  const handleAnswerChange = (fieldId: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    // Clear invalid marker on change
    setInvalidFields((prev) => {
      if (!prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  // No blocking logic; all questions remain interactive
  const handleSubmitInterview = async () => {
    if (!form || !user) return;
    // Prevent submission only if this specific form was already submitted by me
    const alreadySubmittedThisFormByMe = (user.forms ?? []).some(
      (uf) => uf.id === form.id && uf.forms_by_me
    );
    if (alreadySubmittedThisFormByMe) {
      toast.error("You have already submitted this form for this candidate.");
      return;
    }

    // Prepare final answers; if Presentation timer is running, auto-finish and include value
    const isPresentationFormSelected = (form.title || "").toLowerCase().includes("present");
    let finalAnswers: Record<number, string | number> = { ...answers };
    if (isPresentationFormSelected && presentationTimeFieldId != null) {
      // If running, compute wall-clock based time; otherwise use accumulated
      const now = Date.now();
      const runningMs = isPresentationTimerRunning && presentationLastStartMs != null ? now - presentationLastStartMs : 0;
      const totalMs = presentationAccumulatedMs + runningMs;
      const totalSeconds = Math.floor(totalMs / 1000);
      const value = formatTimer(totalSeconds);
      finalAnswers[presentationTimeFieldId] = value;
      if (isPresentationTimerRunning) {
        setIsPresentationTimerRunning(false);
        setIsPresentationFinished(true);
        setPresentationLastStartMs(null);
        setPresentationAccumulatedMs(totalMs);
        setPresentationTimerSeconds(totalSeconds);
      }
    }
    // Validate required fields
    const missing = new Set<number>();
    for (const field of form.fields) {
      if (!field.required) continue;
      const v = finalAnswers[field.id];
      if (field.type === "question") {
        if (v === undefined || v === null || v === "") missing.add(field.id);
      } else if (field.type === "text" || field.type === "email") {
        const text = (v ?? "").toString().trim();
        if (!text) missing.add(field.id);
      }
    }

    if (missing.size > 0) {
      setInvalidFields(missing);
      setShowSubmitDialog(false);
      toast.error("Please complete the required fields.");
      return;
    }

    const payload: SubmitFormPayload = {
      form_id: form.id,
      targeted_user_id: Number(user.id),
      form_fields: form.fields.map((f) => {
        const value = finalAnswers[f.id];
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
          text_field_entry: (
            value !== undefined && value !== null ? value : ""
          ).toString(),
        };
      }),
    };

    try {
      setIsSubmitting(true);
      await submitForm(payload);
      setShowSubmitDialog(false);

      // Show success feedback and redirect
      toast.success(
        "Interview submitted successfully! Redirecting to candidates...",
        {
          duration: 2000,
        }
      );

      // Redirect after a short delay to let user see the success message
      setTimeout(() => {
        navigate("/candidates");
      }, 2000);
    } catch (err) {
      console.error("Failed to submit interview form", err);
      toast.error("Failed to submit interview form");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center text-muted-foreground">User not found</div>
      </div>
    );
  }

  // Filter out empty work experience entries (no project, company, or duration)
  const experienceRows = (user.workExperience ?? []).filter((exp) =>
    [exp.project, exp.company, exp.duration].some((v) =>
      typeof v === "string" ? v.trim().length > 0 : Boolean(v)
    )
  );

  // Dummy data for Breakdown tab (top summary and HR breakdown)
  // Build breakdown data dynamically from user details (with robust fallbacks)
  const iqScore = (user.iqExamScore && !isNaN(Number(user.iqExamScore)))
    ? Number(user.iqExamScore)
    : undefined;
  const english_exam_score = user.englishExamScore || "Not tested";

  // formsEntries may contain HR and Technical interview entries
  const hrForm = user.formsEntries?.find((f) =>
    (f.form.title || "").toLowerCase().includes("hr")
  );
  const techForm = user.formsEntries?.find((f) =>
    (f.form.title || "").toLowerCase().includes("technical")
  );

  const averageScores = (entries?: { final_score?: number | null }[]) => {
    const numbers = (entries ?? [])
      .map((e) => Number(e.final_score))
      .filter((n) => !isNaN(n));
    if (numbers.length === 0) return 0;
    const total = numbers.reduce((s, n) => s + n, 0);
    return total / numbers.length;
  };

  const breakdownSummary = {
    iq: { scored: iqScore ?? 0, total: 60 },
    english_exam_score: english_exam_score,
    hr: { scored: Number(averageScores(hrForm?.entries).toFixed(2)), total: 26 },
    technical: { scored: Number(averageScores(techForm?.entries).toFixed(2)), total: 50 },
  } as const;

  // Group HR breakdown by field label and show interviewer scores
  type Rating = { interviewer: string; score: number; option?: string | null; isBoolean?: boolean };
  type Section = { name: string; ratings: Rating[]; isBoolean?: boolean };

  function buildHrSections(): Section[] {
    if (!hrForm?.entries?.length) return [];
    // Collect map: label -> list of {interviewer, score}
    const map = new Map<string, Rating[]>();
    for (const entry of hrForm.entries) {
      const interviewer = entry.submitted_by?.name || "Unknown";
      for (const f of entry.fields as any[]) {
        if (typeof f?.score !== "number") continue;
        const fullLabel = String(f.label || "");
        const label = fullLabel.replace(/\s*\/.*/, "").trim();
        const isAvailability = fullLabel.toLowerCase().includes("availability objective");
        const list = map.get(label) ?? [];
        list.push({ interviewer, score: Number(f.score), option: (f as any).option ?? null, isBoolean: isAvailability });
        map.set(label, list);
      }
    }
    // Turn into ordered sections
    return Array.from(map.entries()).map(([name, ratings]) => ({ name, ratings, isBoolean: ratings.some(r => r.isBoolean) }));
  }

  const hrBreakdown = {
    title: hrForm?.form.title || "HR Interview",
    total: 26,
    sections: buildHrSections(),
  } as const;

  const hrInterviewerTotals = (hrForm?.entries ?? []).map((e) => {
    const noteField = (e.fields as any[]).find(
      (f: any) => typeof f?.label === "string" && f.label.toLowerCase().includes("notes")
    );
    const note = typeof (noteField as any)?.text === "string" ? (noteField as any).text.trim() : "";
    return {
      interviewer: e.submitted_by?.name || "Unknown",
      score: Number(e.final_score) || 0,
      note,
    } as { interviewer: string; score: number; note?: string };
  });

  // Technical breakdown (similar to HR)
  function buildTechSections(): Section[] {
    if (!techForm?.entries?.length) return [];
    const map = new Map<string, Rating[]>();
    for (const entry of techForm.entries) {
      const interviewer = entry.submitted_by?.name || "Unknown";
      for (const f of entry.fields as any[]) {
        if (typeof f?.score !== "number") continue; // skip text notes
        const label = String(f.label || "").trim();
        const list = map.get(label) ?? [];
        list.push({ interviewer, score: Number(f.score) });
        map.set(label, list);
      }
    }
    return Array.from(map.entries()).map(([name, ratings]) => ({ name, ratings }));
  }

  const techBreakdown = {
    title: techForm?.form.title || "Technical Interview",
    total: 50,
    sections: buildTechSections(),
  } as const;

  const techInterviewerTotals = (techForm?.entries ?? []).map((e) => {
    const noteField = (e.fields as any[]).find(
      (f: any) => typeof f?.label === "string" && f.label.toLowerCase().includes("notes")
    );
    const note = typeof (noteField as any)?.text === "string" ? (noteField as any).text.trim() : "";
    return {
      interviewer: e.submitted_by?.name || "Unknown",
      score: Number(e.final_score) || 0,
      note,
    } as { interviewer: string; score: number; note?: string };
  });

  // Generic builder for any other form (e.g., Presentation)
  function buildGenericSections(entries?: { submitted_by?: { name?: string }; fields: any[] }[]): Section[] {
    if (!entries || entries.length === 0) return [];
    const map = new Map<string, Rating[]>();
    for (const entry of entries) {
      const interviewer = entry.submitted_by?.name || "Unknown";
      for (const f of (entry.fields as any[]) || []) {
        if (typeof f?.score !== "number") continue;
        const label = String(f.label || "").trim();
        const list = map.get(label) ?? [];
        list.push({ interviewer, score: Number(f.score) });
        map.set(label, list);
      }
    }
    return Array.from(map.entries()).map(([name, ratings]) => ({ name, ratings }));
  }

  const otherForms = (user.formsEntries ?? []).filter((f) => {
    const t = (f.form.title || "").toLowerCase();
    return !(t.includes("hr") || t.includes("technical"));
  });

  return (
    <div className="container mx-auto px-6 py-2 space-y-6">
      {/* Presentation Timer Floating Bar */}
      {form && (form.title || "").toLowerCase().includes("present") && presentationTimeFieldId != null && (isPresentationTimerRunning || presentationTimerSeconds > 0) && (
        <div
          className="fixed top-2 left-1/2 z-50"
          style={{ transform: "translateX(-50%) scale(1.3)", transformOrigin: "top center" }}
        >
          <div className="rounded-full border bg-background/95 backdrop-blur px-3 py-1.5 shadow-md flex items-center gap-2">
            <span
              className={`inline-block size-2.5 rounded-full ${isPresentationFinished
                  ? "bg-emerald-500"
                  : isPresentationTimerRunning
                    ? "bg-red-500 animate-pulse"
                    : "bg-amber-400"
                }`}
              aria-label={
                isPresentationFinished ? "Finished" : isPresentationTimerRunning ? "Live" : "Paused"
              }
              title={
                isPresentationFinished ? "Finished" : isPresentationTimerRunning ? "Live" : "Paused"
              }
            />
            <IconClock className="size-4 text-muted-foreground" />
            <span className="font-mono text-sm tabular-nums">
              {formatTimer(presentationTimerSeconds)}
            </span>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              size="sm"
              variant={isPresentationTimerRunning ? "secondary" : "default"}
              onClick={isPresentationTimerRunning ? handlePresentationPause : handlePresentationStart}
              className="h-7 px-2 py-0 text-xs"
            >
              {isPresentationTimerRunning ? (
                <>
                  <IconPlayerPause className="size-3.5 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <IconPlayerPlay className="size-3.5 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePresentationReset}
              className="h-7 px-2 py-0 text-xs"
            >
              <IconRefresh className="size-3.5 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePresentationFinish}
              className="h-7 px-2 py-0 text-xs"
            >
              <IconFlagCheck className="size-3.5 mr-1" />
              Finish
            </Button>
          </div>
        </div>
      )}
      {/* AI Analysis Banner (global across tabs) */}
      <AIAnalysisBanner
        onAnalyze={handleAnalyzeClick}
        analyzeText="Analyze"
        isLoading={isGeminiLoading}
        response={geminiResponse}
        defaultCollapsed={true}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="information" className="w-full gap-4">
        <TabsList className="grid w-full grid-cols-3 mb-2">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-6">
          {/* Header Section - Reverted layout */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <ConsistentAvatar
                  user={{
                    name: user.fullName,
                    email: user.email,
                  }}
                  className="size-24 text-2xl"
                />
                <div className="flex-1 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between flex-wrap">
                        <h1 className="text-3xl font-bold text-foreground">
                          {user.fullName}
                        </h1>
                        {user.fullNameArabic && (
                          <h2 className="text-2xl font-semibold text-muted-foreground" dir="rtl">
                            {user.fullNameArabic}
                          </h2>
                        )}
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground">
                      {user.qualification || ""}
                      {user.fieldOfStudy ? ` in ${user.fieldOfStudy}` : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <IconMail className="size-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconPhone className="size-4 text-muted-foreground" />
                      <span>{user.phoneNo || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.resumeUrl ? (
                        <Button
                          onClick={() => window.open(user.resumeUrl!, "_blank")}
                          size="sm"
                          className="h-auto py-1 px-2 bg-[#1EDE9E] text-white hover:bg-[#19c98c]"
                        >
                          <IconExternalLink className="size-4" />
                          Open Resume
                        </Button>
                      ) : (
                        <Button size="sm" className="h-auto py-1 px-2" disabled>
                          No Resume
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4 text-muted-foreground" />
                      <span>
                        {user.birthdate
                          ? new Date(user.birthdate).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconMapPin className="size-4 text-muted-foreground" />
                      <span>{user.city || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {user.socials.github && (
                        <a
                          href={user.socials.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                          title="GitHub"
                        >
                          <FaGithub className="size-4" />
                          <span className="text-sm">GitHub</span>
                        </a>
                      )}
                      {user.socials.linkedin && (
                        <a
                          href={user.socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                          title="LinkedIn"
                        >
                          <FaLinkedin className="size-4" />
                          <span className="text-sm">LinkedIn</span>
                        </a>
                      )}
                      {/* {!user.socials.github && !user.socials.linkedin && (
                        <span className="text-muted-foreground">-</span>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* We add 'items-stretch' to the grid to make all cards in a row the same height */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Card 1: Academic Performance (GPA) */}
            {/* IMPROVED: Added flex layout to the card for better vertical alignment and spacing. */}
            <Card className="flex flex-col gap-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <IconSchool className="size-5" />
                  <span>Academic Performance</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex items-center ">
                {/* GPA metric vertically centered within card */}
                <div className="flex items-baseline gap-1.5">
                  <div className="text-5xl font-bold tracking-tighter">
                    {user.gpa && !isNaN(parseFloat(user.gpa))
                      ? parseFloat(user.gpa).toFixed(2)
                      : "—"}
                  </div>
                  <div className="text-lg font-medium text-muted-foreground">
                    {user.gpa && !isNaN(parseFloat(user.gpa))
                      ? parseFloat(user.gpa) > 5
                        ? "/100"
                        : "/4.0"
                      : ""}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Graduation date
                    </div>
                    <Badge
                      variant={
                        getGraduationInfo(user.graduationYear).isFuture
                          ? "default"
                          : "secondary"
                      }
                    >
                      <IconCalendar className="mr-1.5 size-3.5" />
                      {getGraduationInfo(user.graduationYear).text}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      University
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <FaUniversity className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {user.institutionName || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Card 2: Test Scores */}
            <Card className="gap-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IconTarget className="size-5" />
                  <span>Test Scores</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-col divide-y divide-border">
                  {/* IQ Score Section */}
                  <div className="flex flex-col gap-2 pb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>IQ Score</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <div className="text-5xl font-bold tracking-tighter">
                        {user.iqExamScore &&
                          !isNaN(parseInt(user.iqExamScore, 10))
                          ? parseInt(user.iqExamScore, 10)
                          : "—"}
                      </div>
                      <div className="text-lg font-medium text-muted-foreground">
                        {user.iqExamScore &&
                          !isNaN(parseInt(user.iqExamScore, 10))
                          ? "/60"
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* English Proficiency Section */}
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>English Proficiency</span>
                    </div>
                    <div>
                      <Badge
                        variant={
                          user.englishExamScore === "Adv-B" ||
                            user.englishExamScore === "Adv-C" ||
                            user.englishExamScore === "Adv-A"
                            ? "default"
                            : user.englishExamScore === "Upper-A" ||
                              user.englishExamScore === "Upper-B" ||
                              user.englishExamScore === "Upper-C"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-md font-medium"
                      >
                        {user.englishExamScore || "Not tested"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Selected Fields */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconTags className="size-5" />
                  <span>Selected Fields</span>
                </CardTitle>
                <CardDescription>
                  Areas of interest for opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow pt-0">
                {user.fieldsChosen.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.fieldsChosen.map((field, index) => (
                      <Badge key={index} variant="default">
                        {field}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No fields selected.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills, Experience, and Courses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBriefcase className="size-5" />
                Professional Background
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="skills" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="skills">Technical Skills</TabsTrigger>
                  <TabsTrigger value="experience">Work Experience</TabsTrigger>
                  <TabsTrigger value="courses">Courses Taken</TabsTrigger>
                </TabsList>

                <TabsContent value="skills" className="mt-4">
                  {user.technicalSkills && user.technicalSkills.length > 0 ? (
                    <div className="flex justify-center">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill</TableHead>
                            <TableHead>Proficiency</TableHead>
                            <TableHead>Medium/Tools</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.technicalSkills.map((skill, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {skill.skill}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    skill.proficiency === "Expert"
                                      ? "default"
                                      : skill.proficiency === "Advanced"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {skill.proficiency}
                                </Badge>
                              </TableCell>
                              <TableCell>{skill.medium}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No technical skills to display
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="experience" className="mt-4">
                  {experienceRows.length > 0 ? (
                    <div className="flex justify-center">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {experienceRows.map((exp, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {exp.project}
                              </TableCell>
                              <TableCell>{exp.company}</TableCell>
                              <TableCell>{exp.duration}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No work experience to display
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="courses" className="mt-4">
                  {user.coursesTaken && user.coursesTaken.length > 0 ? (
                    <div className="flex justify-center">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Date Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.coursesTaken.map((course, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {course.name}
                              </TableCell>
                              <TableCell>{course.entity}</TableCell>
                              <TableCell>
                                {course.date
                                  ? new Date(course.date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No courses to display
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <IconFileUpload className="size-5" />
                <span>Uploaded Files</span>
              </CardTitle>
              <CardDescription>
                Documents provided by the candidate.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {user.otherFiles && user.otherFiles.length > 0 ? (
                <div className="space-y-2">
                  {user.otherFiles.map((url, idx) => {
                    const FileIcon = getFileIconComponent(url);
                    const name = decodeURIComponent(
                      url.split("/").pop() || url
                    );
                    return (
                      <div
                        key={`${url}-${idx}`}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon className="size-5 text-muted-foreground" />
                          <span className="truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5"
                            >
                              <IconExternalLink className="size-4" /> Open
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  No uploaded files to display
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interview Tab */}
        <TabsContent
          value="interview"
          className={`space-y-8 relative`}
        >
          {/* Removed global overlay; we will disable per-form instead */}

          {/* Interview Header - Professional Candidate Banner */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ConsistentAvatar
                    user={{
                      name: user.fullName,
                      email: user.email,
                    }}
                    className="size-20 text-xl"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
                    <IconClipboardList className="size-4" />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap">
                        <h1 className="text-3xl font-bold text-foreground">
                          {user.fullName}
                        </h1>
                        {user.fullNameArabic && (
                          <h2 className="text-xl font-semibold text-muted-foreground" dir="rtl">
                            {user.fullNameArabic}
                          </h2>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      Interview in Progress
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <IconSchool className="size-4" />
                      <span>
                        {user.qualification || ""}
                        {user.fieldOfStudy ? ` in ${user.fieldOfStudy}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconMail className="size-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.presentationTopic && (
                      <div className="flex items-center gap-2">
                        <IconPresentation className="size-4" />
                        <span className="truncate max-w-[32rem]" title={user.presentationTopic}>
                          {user.presentationTopic}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Fields of Interest:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {user.fieldsChosen.slice(0, 2).map((field, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {field}
                        </Badge>
                      ))}
                      {user.fieldsChosen.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.fieldsChosen.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Total Points
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {form?.totalPoints ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Forms chooser */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Choose a form</CardTitle>
              <CardDescription>Select a form to start the interview</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {availableForms.length === 0 ? (
                <div className="text-sm text-muted-foreground">No forms available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableForms.map((f) => {
                    const alreadyByMe = (user.forms ?? []).some((uf) => uf.id === f.id && uf.forms_by_me);
                    const isSelected = selectedFormId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => !alreadyByMe && handleSelectForm({ id: f.id, title: f.title })}
                        disabled={alreadyByMe}
                        className={`text-left rounded-md border p-4 transition-colors ${alreadyByMe
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-muted"
                          } ${isSelected ? "border-primary" : "border-border"}`}
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
                          {alreadyByMe ? (
                            <Badge variant="secondary" className="text-xs">Submitted</Badge>
                          ) : isSelected ? (
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

          {/* Presentation Timer - Top placement */}
          {form && (form.title || "").toLowerCase().includes("present") && presentationTimeFieldId != null && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <IconClock className="size-5 text-muted-foreground" />
                    <span className="text-3xl font-mono tabular-nums">
                      {formatTimer(presentationTimerSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isPresentationTimerRunning ? "secondary" : "default"}
                      onClick={isPresentationTimerRunning ? handlePresentationPause : handlePresentationStart}
                      className="h-9"
                    >
                      {isPresentationTimerRunning ? (
                        <>
                          <IconPlayerPause className="size-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <IconPlayerPlay className="size-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePresentationReset}
                      className="h-9"
                    >
                      <IconRefresh className="size-4 mr-1" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePresentationFinish}
                      className="h-9"
                    >
                      <IconFlagCheck className="size-4 mr-1" />
                      Finish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Question Cards */}
          {!form && !isFormLoading && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Select a form to begin the interview
              </CardContent>
            </Card>
          )}

          {isFormLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader />
            </div>
          )}

          {form &&
            form.fields.map((field) => {
              const isPresentationForm = (form?.title || "").toLowerCase().includes("present");
              const isPresentationTimeField =
                isPresentationForm && (field.label || "").trim().toLowerCase() === "time" && field.type !== "question";
              if (isPresentationTimeField) {
                // Skip rendering the original Time field; handled by the top timer card
                return null;
              }
              return (
                <Card
                  key={field.id}
                  className={`${invalidFields.has(field.id)
                    ? "border-1 border-destructive"
                    : ""
                    }`}
                >
                  <CardContent className="pt-0 space-y-10">
                    {/* Question Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 text-lg">*</span>
                          )}
                        </h3>
                        {field.suggested_questions && (
                          <div className="mt-3">
                            {/* <p className="text-sm text-muted-foreground font-medium mb-2">
                            Suggested Questions:
                          </p> */}
                            <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-1 last:mb-0">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul
                                      className="list-disc space-y-1 mb-2"
                                      style={{
                                        listStylePosition: "inside",
                                        direction: "rtl",
                                      }}
                                    >
                                      {children}
                                    </ul>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-lg font-semibold mb-2 text-left">
                                      {children}
                                    </h2>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-sm text-right">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic">{children}</em>
                                  ),
                                }}
                              >
                                {field.suggested_questions}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-4 text-sm">
                        {field.type === "question" && field.options?.length
                          ? `${Math.max(...field.options.map((o) => o.score)) *
                          (field.weight || 1)
                          } points`
                          : "Optional"}
                      </Badge>
                    </div>

                    {/* Likert/Boolean question */}
                    {field.type === "question" && field.options && (
                      <RadioGroup
                        value={String(answers[field.id] ?? "")}
                        onValueChange={(value) =>
                          handleAnswerChange(field.id, value)
                        }
                        className={`flex flex-wrap gap-6 w-full justify-around`}
                      >
                        {field.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-3 min-w-[48px]"
                          >
                            <RadioGroupItem
                              value={String(option.id)}
                              id={`f${field.id}-o${option.id}`}
                            />
                            <Label
                              htmlFor={`f${field.id}-o${option.id}`}
                              className="text-base font-normal cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {/* Text/email (hidden for Presentation Time field) */}
                    {field.type !== "question" && (
                      <div className="space-y-2 pt-2">
                        {field.type === "text" ? (
                          <Textarea
                            id={`field-${field.id}`}
                            placeholder="Type here..."
                            value={String(answers[field.id] ?? "")}
                            onChange={(e) =>
                              handleAnswerChange(field.id, e.target.value)
                            }
                            className={`min-h-[100px]`}
                          />
                        ) : (
                          <input
                            id={`field-${field.id}`}
                            type="email"
                            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`}
                            value={String(answers[field.id] ?? "")}
                            onChange={(e) =>
                              handleAnswerChange(field.id, e.target.value)
                            }
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {/* Submit Button */}
          {form && (
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => setShowSubmitDialog(true)}
                size="sm"
                className="h-11 text-lg bg-[#1EDE9E] text-white hover:bg-[#19c98c] disabled:opacity-50"
                disabled={
                  isSubmitting ||
                  (user.forms ?? []).some((uf) => uf.id === (form?.id ?? 0) && uf.forms_by_me) ||
                  // If availability is blocking and the first question hasn't been answered,
                  // or answered No without any other required input needed.
                  false
                }
              >
                {isSubmitting ? "Submitting..." : "Submit Interview"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          {/* Top summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* IQ Score */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IconTarget className="size-5" />
                  <span>IQ Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {breakdownSummary.iq.scored}
                  </div>
                  <div className="text-muted-foreground">/{breakdownSummary.iq.total}</div>
                </div>
              </CardContent>
            </Card>

            {/* English Level */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IconFileText className="size-5" />
                  <span>English Level</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-base">
                  {breakdownSummary.english_exam_score}
                </Badge>
              </CardContent>
            </Card>

            {/* HR Average */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IconClipboardList className="size-5" />
                  <span>Average HR Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {breakdownSummary.hr.scored}
                  </div>
                  <div className="text-muted-foreground">/{breakdownSummary.hr.total}</div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Average */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IconFileCode className="size-5" />
                  <span>Average Technical Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {breakdownSummary.technical.scored}
                  </div>
                  <div className="text-muted-foreground">/{breakdownSummary.technical.total}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed HR Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-xl">
                <span>Score Breakdown - {hrBreakdown.title}</span>
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline text-muted-foreground"
                    onClick={() => setHrDetailsOpen((v) => !v)}
                  >
                    <span>{hrDetailsOpen ? "Hide details" : "Show details"}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={`size-4 transition-transform ${hrDetailsOpen ? "rotate-180" : "rotate-0"}`}
                    >
                      <path fillRule="evenodd" d="M12 15.5a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 12.086l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 15.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </CardTitle>
              <CardDescription>Per-interviewer ratings for key criteria</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {/* Totals per interviewer */}
              {hrInterviewerTotals.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hrInterviewerTotals.map((it, idx) => (
                    <div key={idx} className="relative rounded border p-4 overflow-hidden">
                      <div className="pointer-events-none absolute -inset-24 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_45%)] blur-2xl" />
                      <div className="flex items-center gap-3">
                        <ConsistentAvatar
                          user={{ name: it.interviewer, email: it.interviewer }}
                          className="size-10"
                        />
                        <div className="text-base font-medium text-foreground">{it.interviewer}</div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <div className="text-3xl font-bold tracking-tight">{it.score}</div>
                        <div className="text-muted-foreground">/{hrBreakdown.total}</div>
                      </div>
                      {it.note && (
                        <div className="mt-3 text-sm">
                          <div className="rounded-2xl border bg-muted/70 px-3 py-2 text-foreground">
                            {it.note}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hrDetailsOpen && hrBreakdown.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-foreground/70" />
                    <div className="font-medium">{section.name}</div>
                  </div>
                  <div className="space-y-3">
                    {section.ratings.map((r, rIndex) => {
                      const pct = Math.max(0, Math.min(100, (r.score / 5) * 100));
                      const isBoolean = Boolean(section.isBoolean);
                      const isYes = isBoolean && ((r.option ?? "").toString().toLowerCase() === "yes" || Number(r.score) >= 1);
                      return (
                        <div key={rIndex} className="grid grid-cols-12 items-center gap-3">
                          <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">
                            {r.interviewer}
                          </div>
                          {!isBoolean && (
                            <div className="col-span-7 sm:col-span-8">
                              <div className="h-2 w-full rounded bg-muted">
                                <div
                                  className="h-2 rounded bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className={`${isBoolean ? "col-span-9 sm:col-span-10" : "col-span-2 sm:col-span-2"} text-right font-medium`}>
                            {isBoolean ? (
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${isYes ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                                {isYes ? "Yes" : "No"}
                              </span>
                            ) : (
                              r.score
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sectionIndex < hrBreakdown.sections.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Technical Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-xl">
                <span>Score Breakdown - {techBreakdown.title}</span>
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline text-muted-foreground"
                    onClick={() => setTechDetailsOpen((v) => !v)}
                  >
                    <span>{techDetailsOpen ? "Hide details" : "Show details"}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={`size-4 transition-transform ${techDetailsOpen ? "rotate-180" : "rotate-0"}`}
                    >
                      <path fillRule="evenodd" d="M12 15.5a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 12.086l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 15.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </CardTitle>
              <CardDescription>Per-interviewer ratings for key criteria</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {/* Totals per interviewer */}
              {techInterviewerTotals.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {techInterviewerTotals.map((it, idx) => (
                    <div key={idx} className="relative rounded border p-4 overflow-hidden">
                      <div className="pointer-events-none absolute -inset-24 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_45%)] blur-2xl" />
                      <div className="flex items-center gap-3">
                        <ConsistentAvatar
                          user={{ name: it.interviewer, email: it.interviewer }}
                          className="size-10"
                        />
                        <div className="text-base font-medium text-foreground">{it.interviewer}</div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <div className="text-3xl font-bold tracking-tight">{it.score}</div>
                        <div className="text-muted-foreground">/{techBreakdown.total}</div>
                      </div>
                      {it.note && (
                        <div className="mt-3 text-sm">
                          <div className="rounded-2xl border bg-muted/70 px-3 py-2 text-foreground">
                            {it.note}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {techDetailsOpen && techBreakdown.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-foreground/70" />
                    <div className="font-medium">{section.name}</div>
                  </div>
                  <div className="space-y-3">
                    {section.ratings.map((r, rIndex) => {
                      const pct = Math.max(0, Math.min(100, (r.score / 5) * 100));
                      return (
                        <div key={rIndex} className="grid grid-cols-12 items-center gap-3">
                          <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">
                            {r.interviewer}
                          </div>
                          <div className="col-span-7 sm:col-span-8">
                            <div className="h-2 w-full rounded bg-muted">
                              <div
                                className="h-2 rounded bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="col-span-2 sm:col-span-2 text-right font-medium">
                            {r.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sectionIndex < techBreakdown.sections.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dynamic breakdown for other forms (e.g., Presentation) */}
          {otherForms.map((formEntry, idx) => {
            const formId = formEntry.form.id;
            const title = formEntry.form.title || `Form ${formId}`;
            const sections = buildGenericSections(formEntry.entries as any);
            const totals = (formEntry.entries ?? []).map((e: any) => {
              const fieldsArr = (e.fields as any[]) || [];
              const findByLabel = (substr: string) =>
                fieldsArr.find(
                  (f: any) => typeof f?.label === "string" && f.label.toLowerCase().includes(substr)
                );
              const noteField = findByLabel("notes") || findByLabel("note");
              const timeField = findByLabel("time");
              const note = typeof (noteField as any)?.text === "string" ? (noteField as any).text.trim() : "";
              const time = typeof (timeField as any)?.text === "string" ? (timeField as any).text.trim() : "";
              return {
                interviewer: e.submitted_by?.name || "Unknown",
                score: Number(e.final_score) || 0,
                note,
                time,
              } as { interviewer: string; score: number; note?: string; time?: string };
            });
            const isOpen = detailsOpenByFormId[formId] ?? false;
            return (
              <Card key={`${formId}-${idx}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <span>Score Breakdown - {title}</span>
                    <div className="flex items-center gap-3">
                      <button
                        className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline text-muted-foreground"
                        onClick={() => setDetailsOpenByFormId((prev) => ({ ...prev, [formId]: !isOpen }))}
                      >
                        <span>{isOpen ? "Hide details" : "Show details"}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className={`size-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
                        >
                          <path fillRule="evenodd" d="M12 15.5a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 12.086l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 15.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </CardTitle>
                  <CardDescription>Per-interviewer ratings for key criteria</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-6">
                  {/* Totals per interviewer */}
                  {totals.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {totals.map((it, i) => (
                        <div key={i} className="relative rounded border p-4 overflow-hidden">
                          <div className="pointer-events-none absolute -inset-24 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_45%)] blur-2xl" />
                          <div className="flex items-center gap-3">
                            <ConsistentAvatar
                              user={{ name: it.interviewer, email: it.interviewer }}
                              className="size-10"
                            />
                            <div className="text-base font-medium text-foreground">{it.interviewer}</div>
                          </div>
                          <div className="mt-3 flex items-baseline gap-2">
                            <div className="text-3xl font-bold tracking-tight">{it.score}</div>
                            {/* Unknown totals for generic forms, so no denominator */}
                          </div>
                          {it.note && (
                            <div className="mt-3 text-sm">
                              <div className="rounded-2xl border bg-muted/70 px-3 py-2 text-foreground">
                                {it.note}
                              </div>
                            </div>
                          )}
                          {it.time && (
                            <div className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <IconClock className="size-4" />
                              <span className="font-mono tabular-nums">{it.time}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isOpen && sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-foreground/70" />
                        <div className="font-medium">{section.name}</div>
                      </div>
                      <div className="space-y-3">
                        {section.ratings.map((r, rIndex) => {
                          const pct = Math.max(0, Math.min(100, (r.score / 5) * 100));
                          return (
                            <div key={rIndex} className="grid grid-cols-12 items-center gap-3">
                              <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">
                                {r.interviewer}
                              </div>
                              <div className="col-span-7 sm:col-span-8">
                                <div className="h-2 w-full rounded bg-muted">
                                  <div
                                    className="h-2 rounded bg-primary"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 sm:col-span-2 text-right font-medium">
                                {r.score}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {sectionIndex < sections.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Interview Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this interview? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitInterview}>Submit Interview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
