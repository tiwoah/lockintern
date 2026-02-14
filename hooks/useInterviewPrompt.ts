import { useMemo } from "react";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";
import { useInterview } from "@/context/InterviewContext";

export function useInterviewPrompt(instruction?: string) {
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const { isInterviewActive } = useInterview();

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
    
    return promptText;
  }, [defaultInstruction, jobDescription, resumeFile, isInterviewActive]);

  return prompt;
}
