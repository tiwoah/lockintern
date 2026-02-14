"use client";

import { createContext, useContext, useState } from "react";

type InterviewContextType = {
  isInterviewActive: boolean;
  questions: string[];
  currentQuestionIndex: number;
  startInterview: (questions: string[]) => void;
  exitInterview: () => void;
  nextQuestion: () => void;
};

const InterviewContext = createContext<InterviewContextType | null>(null);

export function InterviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const startInterview = (interviewQuestions: string[]) => {
    setQuestions(interviewQuestions);
    setCurrentQuestionIndex(0);
    setIsInterviewActive(true);
  };

  const exitInterview = () => {
    setIsInterviewActive(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
  };

  const nextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
  };

  return (
    <InterviewContext.Provider
      value={{
        isInterviewActive,
        questions,
        currentQuestionIndex,
        startInterview,
        exitInterview,
        nextQuestion,
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
