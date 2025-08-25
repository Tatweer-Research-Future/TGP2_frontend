import { createContext, useContext, useState, ReactNode } from "react";
import { type Candidate } from "@/lib/candidates";

type CandidatesContextType = {
  candidates: Candidate[];
  setCandidates: (candidates: Candidate[]) => void;
  getCandidateById: (id: string) => Candidate | undefined;
};

const CandidatesContext = createContext<CandidatesContextType | undefined>(
  undefined
);

export function CandidatesProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const getCandidateById = (id: string) => {
    return candidates.find((candidate) => candidate.id === id);
  };

  return (
    <CandidatesContext.Provider
      value={{ candidates, setCandidates, getCandidateById }}
    >
      {children}
    </CandidatesContext.Provider>
  );
}

export function useCandidates() {
  const context = useContext(CandidatesContext);
  if (context === undefined) {
    throw new Error("useCandidates must be used within a CandidatesProvider");
  }
  return context;
}

