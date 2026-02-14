"use client";

import { createContext, useContext, useState } from "react";

type ResumeContextType = {
  resumeFile: File | null;
  setResumeFile: (value: File | null) => void;
};

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  return (
    <ResumeContext.Provider value={{ resumeFile, setResumeFile }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error("useResume must be used within ResumeProvider");
  }
  return context;
}
