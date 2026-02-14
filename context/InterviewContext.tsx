"use client";

import { createContext, useContext, useState } from "react";

type InterviewContextType = {
  isInterviewActive: boolean;
  hasIntroductionPlayed: boolean;
  hasConfirmed: boolean;
  startInterview: () => void;
  setIntroductionPlayed: () => void;
  confirmReady: () => void;
  exitInterview: () => void;
};

const InterviewContext = createContext<InterviewContextType | null>(null);

export function InterviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [hasIntroductionPlayed, setHasIntroductionPlayed] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const startInterview = () => {
    setIsInterviewActive(true);
    setHasIntroductionPlayed(false);
    setHasConfirmed(false);
  };

  const setIntroductionPlayed = () => {
    setHasIntroductionPlayed(true);
  };

  const confirmReady = () => {
    setHasConfirmed(true);
  };

  const exitInterview = () => {
    setIsInterviewActive(false);
    setHasIntroductionPlayed(false);
    setHasConfirmed(false);
  };

  return (
    <InterviewContext.Provider
      value={{
        isInterviewActive,
        hasIntroductionPlayed,
        hasConfirmed,
        startInterview,
        setIntroductionPlayed,
        confirmReady,
        exitInterview,
      }}
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
