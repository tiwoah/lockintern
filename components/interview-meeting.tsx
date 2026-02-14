"use client";

import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { InterviewToolbar } from "@/components/interview-toolbar";
import { useInterview } from "@/context/InterviewContext";

export function InterviewMeeting() {
  const { questions, currentQuestionIndex } = useInterview();

  return (
    <div className="min-h-screen pb-24">
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-6">Interview in Progress</h2>
        
        {/* Questions List */}
        {questions.length > 0 && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="text-lg font-medium mb-3">Interview Questions</h3>
            <ol className="list-decimal list-inside space-y-2">
              {questions.map((question, index) => (
                <li
                  key={index}
                  className={`${
                    index === currentQuestionIndex
                      ? "font-semibold text-primary"
                      : index < currentQuestionIndex
                      ? "text-muted-foreground line-through"
                      : ""
                  }`}
                >
                  {question}
                </li>
              ))}
            </ol>
          </div>
        )}

        <AutoAudioToGemini />
      </div>
      <InterviewToolbar />
    </div>
  );
}
