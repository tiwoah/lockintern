import { useMemo } from "react";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";
import { useInterview } from "@/context/InterviewContext";

export function useInterviewPrompt(instruction?: string) {
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const { isInterviewActive, questions, currentQuestionIndex } = useInterview();

  const defaultInstruction = instruction ?? "Respond in a friendly but brief manner.";

  const prompt = useMemo(() => {
    let promptText = isInterviewActive
      ? `You are conducting a job interview. ${defaultInstruction}\n\nHere is the job description:\n${
          (jobDescription ?? "").trim() || "(none)"
        }`
      : `${defaultInstruction}\n\nHere is the job description:\n${
          (jobDescription ?? "").trim() || "(none)"
        }`;
    
    if (resumeFile) {
      promptText += `\n\nA resume PDF has been provided as additional context. Please use it to tailor your responses and ask relevant questions based on the candidate's background.`;
    }

    // Add current question if interview is active and we have questions
    if (isInterviewActive && questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      promptText += `\n\nIMPORTANT: You must now ask the candidate this specific question: "${currentQuestion}". After they respond, provide brief feedback or ask a follow-up, then move to the next question naturally.`;
    }
    
    return promptText;
  }, [defaultInstruction, jobDescription, resumeFile, isInterviewActive, questions, currentQuestionIndex]);

  return prompt;
}
