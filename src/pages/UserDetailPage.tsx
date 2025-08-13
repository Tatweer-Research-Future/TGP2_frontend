import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
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
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconGenderMale,
  IconSchool,
  IconBriefcase,
  IconDownload,
  IconUser,
  IconClipboardList,
} from "@tabler/icons-react";
import { useEffect } from "react";
import {
  getUserDetailById,
  type BackendUserDetail,
  getForms,
  getFormById,
  type BackendFormField,
  submitForm,
  type SubmitFormPayload,
} from "@/lib/api";
import { toast } from "sonner";

type UserDetail = {
  id: string;
  fullName: string;
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
};

function transformBackendUserDetail(data: BackendUserDetail): UserDetail {
  const add = data.additional_fields ?? {};
  const info = add.additional_information ?? {};

  const fullName = add.full_name_en || add.full_name || data.name || "";

  return {
    id: String(data.id),
    fullName,
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
    technicalSkills: [],
    workExperience: (info.workExperience ?? []) as UserDetail["workExperience"],
    coursesTaken: (info.coursesTaken ?? []) as UserDetail["coursesTaken"],
    fieldsChosen: (info.fieldsChosen ?? []) as string[],
    resumeUrl: info.resumeUrl ?? undefined,
    socials: {
      github: add.github ?? null,
      linkedin: add.linkedin ?? null,
    },
  };
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);

  // Interview form state
  const [form, setForm] = useState<InterviewForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        // Load user
        const userResp = await getUserDetailById(id);
        if (isCancelled) return;
        setUser(transformBackendUserDetail(userResp));

        // Load forms list and pick first/only interview
        const formsList = await getForms();
        if (isCancelled) return;
        const first = formsList.results?.[0];
        if (first) {
          const fields = await getFormById(first.id);
          if (isCancelled) return;
          const transformedForm = transformBackendForm(
            fields,
            first.id,
            first.title
          );
          setForm(transformedForm);
        } else {
          setForm(null);
        }
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
  }, [id]);

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

  const handleSubmitInterview = async () => {
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
      setShowSubmitDialog(false);
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
            selected_option_id: value ? Number(value) : null,
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
      setShowSubmitDialog(false);
      toast.success("Interview submitted successfully");
    } catch (err) {
      console.error("Failed to submit interview form", err);
      toast.error("Failed to submit interview form");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center text-muted-foreground">Loading user...</div>
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

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Main Tabs */}
      <Tabs defaultValue="information" className="w-full gap-4">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
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
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {user.fullName}
                    </h1>
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
                      <IconMapPin className="size-4 text-muted-foreground" />
                      <span>{user.city || "-"}</span>
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
                      <IconGenderMale className="size-4 text-muted-foreground" />
                      <span>{user.gender || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.resumeUrl ? (
                        <Button
                          onClick={() => window.open(user.resumeUrl!, "_blank")}
                          size="sm"
                          className="h-auto py-1 px-2 bg-[#1EDE9E] text-white hover:bg-[#19c98c]"
                        >
                          <IconDownload className="size-4" />
                          Download Resume
                        </Button>
                      ) : (
                        <Button size="sm" className="h-auto py-1 px-2" disabled>
                          No Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconUser className="size-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Date of Birth:
                    </span>
                    <p>
                      {user.birthdate
                        ? new Date(user.birthdate).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Gender:
                    </span>
                    <p>{user.gender || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      City:
                    </span>
                    <p>{user.city || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Qualification:
                    </span>
                    <p>{user.qualification || "-"}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <span className="font-medium text-muted-foreground">
                    Language Proficiency:
                  </span>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">
                      English: {user.englishProficiency || "-"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Educational Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconSchool className="size-5" />
                  Educational Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Field of Study:
                    </span>
                    <p>{user.fieldOfStudy || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Institution:
                    </span>
                    <p>{user.institutionName || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      GPA:
                    </span>
                    <p>{user.gpa || "-"}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <span className="font-medium text-muted-foreground">
                    Selected Fields:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.fieldsChosen.map((field, index) => (
                      <Badge key={index} variant="default">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
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
                </TabsContent>

                <TabsContent value="experience" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.workExperience.map((exp, index) => (
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
                </TabsContent>

                <TabsContent value="courses" className="mt-4">
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interview Tab */}
        <TabsContent value="interview" className="space-y-8">
          {/* Interview Header - Professional Candidate Banner */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
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
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground">
                      {user.fullName}
                    </h1>
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

          {/* Dynamic Question Cards */}
          {!form && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No interview form available
              </CardContent>
            </Card>
          )}

          {form &&
            form.fields.map((field) => (
              <Card key={field.id}>
                <CardContent className="pt-6 space-y-6">
                  {/* Question Header */}
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
                        ? `${
                            Math.max(...field.options.map((o) => o.score)) *
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
                      className={`space-y-3 ${
                        invalidFields.has(field.id)
                          ? "border border-destructive rounded-md p-3"
                          : ""
                      }`}
                    >
                      {field.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-3"
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

                  {/* Text/email */}
                  {field.type !== "question" && (
                    <div className="space-y-4 pt-2">
                      <Label
                        htmlFor={`field-${field.id}`}
                        className="text-base font-medium"
                      >
                        {field.type === "email" ? "Email" : field.label}
                      </Label>
                      {field.type === "text" ? (
                        <Textarea
                          id={`field-${field.id}`}
                          placeholder="Type here..."
                          value={String(answers[field.id] ?? "")}
                          onChange={(e) =>
                            handleAnswerChange(field.id, e.target.value)
                          }
                          className={`min-h-[100px] ${
                            invalidFields.has(field.id)
                              ? "border-destructive"
                              : ""
                          }`}
                        />
                      ) : (
                        <input
                          id={`field-${field.id}`}
                          type="email"
                          className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                            invalidFields.has(field.id)
                              ? "border-destructive"
                              : ""
                          }`}
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
            ))}

          {/* Submit Button */}
          {form && (
            <div className="flex justify-center pt-8">
              <Button
                onClick={() => setShowSubmitDialog(true)}
                size="lg"
                className="min-w-[200px] h-12 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Interview"}
              </Button>
            </div>
          )}
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
