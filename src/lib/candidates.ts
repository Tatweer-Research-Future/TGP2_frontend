export type CandidateStatus = "not_interviewed" | "in_progress" | "interviewed";

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  status: CandidateStatus;
  appliedDate: string;
};

export const candidates: Candidate[] = [
  {
    id: "1",
    fullName: "Ahmed Hassan Mohammed",
    email: "ahmed.hassan@example.com",
    status: "interviewed",
    appliedDate: "2024-01-15",
  },
  {
    id: "2",
    fullName: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    status: "in_progress",
    appliedDate: "2024-01-20",
  },
  {
    id: "3",
    fullName: "Omar Al-Rashid",
    email: "omar.rashid@example.com",
    status: "not_interviewed",
    appliedDate: "2024-01-22",
  },
  {
    id: "4",
    fullName: "Maria Rodriguez",
    email: "maria.rodriguez@example.com",
    status: "interviewed",
    appliedDate: "2024-01-18",
  },
  {
    id: "5",
    fullName: "Alex Chen",
    email: "alex.chen@example.com",
    status: "in_progress",
    appliedDate: "2024-01-25",
  },
  {
    id: "6",
    fullName: "Fatima Al-Zahra",
    email: "fatima.zahra@example.com",
    status: "not_interviewed",
    appliedDate: "2024-01-28",
  },
  {
    id: "7",
    fullName: "David Wilson",
    email: "david.wilson@example.com",
    status: "interviewed",
    appliedDate: "2024-01-12",
  },
  {
    id: "8",
    fullName: "Layla Mahmoud",
    email: "layla.mahmoud@example.com",
    status: "in_progress",
    appliedDate: "2024-01-30",
  },
  {
    id: "9",
    fullName: "Robert Brown",
    email: "robert.brown@example.com",
    status: "not_interviewed",
    appliedDate: "2024-02-01",
  },
  {
    id: "10",
    fullName: "Noor Ibrahim",
    email: "noor.ibrahim@example.com",
    status: "interviewed",
    appliedDate: "2024-01-08",
  },
  {
    id: "11",
    fullName: "Michael Davis",
    email: "michael.davis@example.com",
    status: "in_progress",
    appliedDate: "2024-02-03",
  },
  {
    id: "12",
    fullName: "Amina Youssef",
    email: "amina.youssef@example.com",
    status: "not_interviewed",
    appliedDate: "2024-02-05",
  },
];


