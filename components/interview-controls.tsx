"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useInterview } from "@/context/InterviewContext";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";
import {
  generateIntroductionText,
  generateInterviewQuestions,
  speakText,
} from "@/utils/interviewUtils";
import { InterviewLoading } from "@/components/interview-loading";

export function InterviewControls() {
  const { isInterviewActive, startInterview, exitInterview } = useInterview();
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const [loading, setLoading] = useState(false);

  async function handleStartInterview() {
    setLoading(true);
    const startTime = Date.now();
    const minimumLoadingTime = 3000; // Minimum 3 seconds to show messages

    try {
      // Generate introduction text and questions in parallel
      const [introductionText, questions] = await Promise.all([
        generateIntroductionText(jobDescription, resumeFile ?? null),
        generateInterviewQuestions(jobDescription, resumeFile ?? null, 5),
      ]);

      // Ensure minimum loading time
      const elapsed = Date.now() - startTime;
      if (elapsed < minimumLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumLoadingTime - elapsed)
        );
      }

      // Start interview with questions
      startInterview(questions);

      // Speak the introduction after starting the interview
      try {
        await speakText(introductionText);
      } catch (error) {
        console.error("TTS error:", error);
        // Continue even if TTS fails
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert(error instanceof Error ? error.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <InterviewLoading />;
  }

  if (isInterviewActive) {
    return (
      <div className="space-y-2">
        <Button onClick={exitInterview} variant="destructive">
          Exit Interview
        </Button>
        <div className="text-sm text-muted-foreground">
          Interview is active. Record your responses.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleStartInterview}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white gap-2"
      >
        <Play className="h-4 w-4" />
        {loading ? "Starting..." : "Start Interview"}
      </Button>
      <div className="text-sm text-muted-foreground">
        Start the interview to begin recording and responding.
      </div>
    </div>
  );
}
