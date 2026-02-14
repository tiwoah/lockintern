"use client";

import { createContext, useContext, useState } from "react";

type InterviewContextType = {
  isInterviewActive: boolean;
  startInterview: () => void;
  exitInterview: () => void;
};

const InterviewContext = createContext<InterviewContextType | null>(null);

export function InterviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInterviewActive, setIsInterviewActive] = useState(false);

  const startInterview = () => {
    setIsInterviewActive(true);
  };

  const exitInterview = () => {
    setIsInterviewActive(false);
  };

  return (
    <InterviewContext.Provider
      value={{ isInterviewActive, startInterview, exitInterview }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterview must be used within InterviewProvider");
  }
  return context;
}
