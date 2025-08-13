export type CandidateStatus = "not_interviewed" | "in_progress" | "interviewed";

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  status: CandidateStatus;
  appliedDate: string;
  fieldsChosen?: string[];
  points?: number;
};

// Transform backend candidate data to frontend format
export function transformBackendCandidate(backendCandidate: {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  interviewed_by_me: boolean;
}): Candidate {
  return {
    id: backendCandidate.id.toString(),
    fullName: backendCandidate.name,
    email: backendCandidate.email,
    status: backendCandidate.interviewed_by_me
      ? "interviewed"
      : "not_interviewed",
    appliedDate: new Date().toISOString().split("T")[0], // Use current date as fallback since backend doesn't provide this
    fieldsChosen: [], // Backend doesn't provide this data
    points: 0, // Backend doesn't provide this data
  };
}

export const candidates: Candidate[] = [
  {
    id: "1",
    fullName: "Ahmed Hassan Mohammed",
    email: "ahmed.hassan@example.com",
    status: "interviewed",
    appliedDate: "2024-01-15",
    fieldsChosen: ["Software Development", "Data & Analytics", "Cloud"],
    points: 82,
  },
  {
    id: "2",
    fullName: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    status: "in_progress",
    appliedDate: "2024-01-20",
    fieldsChosen: ["UX/UI", "Frontend"],
    points: 64,
  },
  {
    id: "3",
    fullName: "Omar Al-Rashid",
    email: "omar.rashid@example.com",
    status: "not_interviewed",
    appliedDate: "2024-01-22",
    fieldsChosen: ["Data Science"],
    points: 0,
  },
  {
    id: "4",
    fullName: "Maria Rodriguez",
    email: "maria.rodriguez@example.com",
    status: "interviewed",
    appliedDate: "2024-01-18",
    fieldsChosen: ["Backend", "APIs", "Security"],
    points: 75,
  },
  {
    id: "5",
    fullName: "Alex Chen",
    email: "alex.chen@example.com",
    status: "in_progress",
    appliedDate: "2024-01-25",
    fieldsChosen: ["DevOps", "Cloud"],
    points: 58,
  },
  {
    id: "6",
    fullName: "Fatima Al-Zahra",
    email: "fatima.zahra@example.com",
    status: "not_interviewed",
    appliedDate: "2024-01-28",
    fieldsChosen: ["QA", "Automation"],
    points: 0,
  },
  {
    id: "7",
    fullName: "David Wilson",
    email: "david.wilson@example.com",
    status: "interviewed",
    appliedDate: "2024-01-12",
    fieldsChosen: ["SRE", "Platform"],
    points: 88,
  },
  {
    id: "8",
    fullName: "Layla Mahmoud",
    email: "layla.mahmoud@example.com",
    status: "in_progress",
    appliedDate: "2024-01-30",
    fieldsChosen: ["Mobile", "Flutter"],
    points: 61,
  },
  {
    id: "9",
    fullName: "Robert Brown",
    email: "robert.brown@example.com",
    status: "not_interviewed",
    appliedDate: "2024-02-01",
    fieldsChosen: ["Support"],
    points: 0,
  },
  {
    id: "10",
    fullName: "Noor Ibrahim",
    email: "noor.ibrahim@example.com",
    status: "interviewed",
    appliedDate: "2024-01-08",
    fieldsChosen: ["AI/ML", "Data"],
    points: 91,
  },
  {
    id: "11",
    fullName: "Michael Davis",
    email: "michael.davis@example.com",
    status: "in_progress",
    appliedDate: "2024-02-03",
    fieldsChosen: ["Frontend", "Design Systems"],
    points: 55,
  },
  {
    id: "12",
    fullName: "Amina Youssef",
    email: "amina.youssef@example.com",
    status: "not_interviewed",
    appliedDate: "2024-02-05",
    fieldsChosen: ["Research"],
    points: 0,
  },
];
