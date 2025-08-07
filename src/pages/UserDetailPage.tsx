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
  IconCertificate,
  IconDownload,
  IconUser,
  IconClipboardList,
} from "@tabler/icons-react";

// Dummy user data
const dummyUser = {
  id: "1",
  fullName: "Ahmed Hassan Mohammed",
  gender: "Male",
  birthdate: "1995-03-15",
  city: "Cairo",
  phoneNo: "+20 123 456 7890",
  email: "ahmed.hassan@example.com",
  qualification: "Bachelor",
  fieldOfStudy: "Computer Science",
  institutionName: "Cairo University",
  gpa: "3.7/4.0",
  arabicProficiency: "Fluent",
  englishProficiency: "Advanced",
  technicalSkills: [
    { skill: "JavaScript", proficiency: "Expert", medium: "React, Node.js" },
    { skill: "Python", proficiency: "Advanced", medium: "Django, FastAPI" },
    { skill: "SQL", proficiency: "Intermediate", medium: "MySQL, PostgreSQL" },
    {
      skill: "Cloud Computing",
      proficiency: "Intermediate",
      medium: "AWS, Docker",
    },
  ],
  workExperience: [
    {
      project: "E-commerce Platform",
      company: "TechCorp Ltd",
      duration: "6 months",
    },
    {
      project: "Mobile Banking App",
      company: "FinTech Solutions",
      duration: "4 months",
    },
    {
      project: "Healthcare Management System",
      company: "MediTech",
      duration: "3 months",
    },
  ],
  coursesTaken: [
    {
      name: "Advanced React Development",
      entity: "Coursera",
      date: "2024-01-15",
    },
    {
      name: "Machine Learning Fundamentals",
      entity: "edX",
      date: "2023-11-20",
    },
    { name: "Cloud Architecture", entity: "Udemy", date: "2023-09-10" },
    {
      name: "Database Design",
      entity: "LinkedIn Learning",
      date: "2023-07-05",
    },
  ],
  fieldsChosen: [
    "Software Development",
    "Data & Analytics",
    "Machine Learning & AI",
  ],
  resumeUrl: "/resume/ahmed-hassan-cv.pdf",
};

// Interview questions data
const interviewQuestions = [
  {
    id: 1,
    question: "Technical Knowledge & Problem Solving",
    points: 15,
    required: true,
    hasComment: true,
    options: [
      { value: "excellent", label: "Excellent (A)" },
      { value: "good", label: "Good (B)" },
      { value: "average", label: "Average (C)" },
      { value: "poor", label: "Poor (D)" },
    ],
  },
  {
    id: 2,
    question: "Communication Skills",
    points: 10,
    required: true,
    hasComment: false,
    options: [
      { value: "very_good", label: "Very Good" },
      { value: "good", label: "Good" },
      { value: "needs_improvement", label: "Needs Improvement" },
      { value: "poor", label: "Poor" },
    ],
  },
  {
    id: 3,
    question: "Team Collaboration & Cultural Fit",
    points: 8,
    required: false,
    hasComment: true,
    options: [
      { value: "excellent", label: "Excellent" },
      { value: "good", label: "Good" },
      { value: "average", label: "Average" },
      { value: "below_average", label: "Below Average" },
    ],
  },
  {
    id: 4,
    question: "Leadership Potential",
    points: 5,
    required: false,
    hasComment: true,
    options: [
      { value: "high", label: "High Potential" },
      { value: "medium", label: "Medium Potential" },
      { value: "low", label: "Low Potential" },
      { value: "none", label: "No Leadership Qualities" },
    ],
  },
  {
    id: 5,
    question: "Overall Recommendation",
    points: 12,
    required: true,
    hasComment: true,
    options: [
      { value: "strongly_recommend", label: "Strongly Recommend" },
      { value: "recommend", label: "Recommend" },
      { value: "consider", label: "Consider with Reservations" },
      { value: "not_recommend", label: "Do Not Recommend" },
    ],
  },
];

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [interviewAnswers, setInterviewAnswers] = useState<
    Record<number, string>
  >({});
  const [interviewComments, setInterviewComments] = useState<
    Record<number, string>
  >({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const handleAnswerChange = (questionId: number, value: string) => {
    setInterviewAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCommentChange = (questionId: number, value: string) => {
    setInterviewComments((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitInterview = () => {
    // TODO: Handle interview submission
    console.log("Interview submitted:", {
      interviewAnswers,
      interviewComments,
    });
    setShowSubmitDialog(false);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Main Tabs */}
      <Tabs defaultValue="information" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <ConsistentAvatar
                  user={{
                    name: dummyUser.fullName,
                    email: dummyUser.email,
                  }}
                  className="size-24 text-2xl"
                />
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {dummyUser.fullName}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      {dummyUser.qualification} in {dummyUser.fieldOfStudy}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <IconMail className="size-4 text-muted-foreground" />
                      <span>{dummyUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconPhone className="size-4 text-muted-foreground" />
                      <span>{dummyUser.phoneNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconMapPin className="size-4 text-muted-foreground" />
                      <span>{dummyUser.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4 text-muted-foreground" />
                      <span>
                        {new Date(dummyUser.birthdate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconGenderMale className="size-4 text-muted-foreground" />
                      <span>{dummyUser.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconDownload className="size-4 text-muted-foreground" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-1 px-2"
                      >
                        Download Resume
                      </Button>
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
                    <p>{new Date(dummyUser.birthdate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Gender:
                    </span>
                    <p>{dummyUser.gender}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      City:
                    </span>
                    <p>{dummyUser.city}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Qualification:
                    </span>
                    <p>{dummyUser.qualification}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <span className="font-medium text-muted-foreground">
                    Language Proficiency:
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      Arabic: {dummyUser.arabicProficiency}
                    </Badge>
                    <Badge variant="secondary">
                      English: {dummyUser.englishProficiency}
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
                    <p>{dummyUser.fieldOfStudy}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Institution:
                    </span>
                    <p>{dummyUser.institutionName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">
                      GPA:
                    </span>
                    <p>{dummyUser.gpa}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <span className="font-medium text-muted-foreground">
                    Selected Fields:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {dummyUser.fieldsChosen.map((field, index) => (
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
                      {dummyUser.technicalSkills.map((skill, index) => (
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
                      {dummyUser.workExperience.map((exp, index) => (
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
                      {dummyUser.coursesTaken.map((course, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {course.name}
                          </TableCell>
                          <TableCell>{course.entity}</TableCell>
                          <TableCell>
                            {new Date(course.date).toLocaleDateString()}
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
                      name: dummyUser.fullName,
                      email: dummyUser.email,
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
                      {dummyUser.fullName}
                    </h1>
                    <Badge variant="secondary" className="text-sm">
                      Interview in Progress
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <IconSchool className="size-4" />
                      <span>
                        {dummyUser.qualification} in {dummyUser.fieldOfStudy}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconMail className="size-4" />
                      <span>{dummyUser.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Fields of Interest:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {dummyUser.fieldsChosen
                        .slice(0, 2)
                        .map((field, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {field}
                          </Badge>
                        ))}
                      {dummyUser.fieldsChosen.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{dummyUser.fieldsChosen.length - 2} more
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
                    {interviewQuestions.reduce((sum, q) => sum + q.points, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Question Cards */}
          {interviewQuestions.map((question) => (
            <Card key={question.id}>
              <CardContent className="pt-6 space-y-6">
                {/* Question Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {question.question}
                      {question.required && (
                        <span className="text-red-500 text-lg">*</span>
                      )}
                    </h3>
                  </div>
                  <Badge variant="outline" className="ml-4 text-sm">
                    {question.points}{" "}
                    {question.points === 1 ? "point" : "points"}
                  </Badge>
                </div>

                {/* Radio Options - Single Column */}
                <RadioGroup
                  value={interviewAnswers[question.id] || ""}
                  onValueChange={(value) =>
                    handleAnswerChange(question.id, value)
                  }
                  className="space-y-3"
                >
                  {question.options.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`q${question.id}-${option.value}`}
                      />
                      <Label
                        htmlFor={`q${question.id}-${option.value}`}
                        className="text-base font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Optional Comment - Improved Spacing */}
                {question.hasComment && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <Label
                      htmlFor={`comment-${question.id}`}
                      className="text-base font-medium"
                    >
                      Additional Comments (Optional)
                    </Label>
                    <Textarea
                      id={`comment-${question.id}`}
                      placeholder="Add any additional notes or observations..."
                      value={interviewComments[question.id] || ""}
                      onChange={(e) =>
                        handleCommentChange(question.id, e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Submit Button - Outside Card at Bottom */}
          <div className="flex justify-center pt-8">
            <Button
              onClick={() => setShowSubmitDialog(true)}
              size="lg"
              className="min-w-[200px] h-12 text-lg"
            >
              Submit Interview
            </Button>
          </div>
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
