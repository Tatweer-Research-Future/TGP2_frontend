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
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
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

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
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
                <span className="font-medium text-muted-foreground">City:</span>
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
                <span className="font-medium text-muted-foreground">GPA:</span>
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
    </div>
  );
}
