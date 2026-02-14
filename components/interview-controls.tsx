"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInterview } from "@/context/InterviewContext";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";
import { generateIntroductionText, speakText } from "@/utils/interviewUtils";

export function InterviewControls() {
  const { isInterviewActive, startInterview, exitInterview } = useInterview();
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const [loading, setLoading] = useState(false);

  async function handleStartInterview() {
    setLoading(true);

    try {
      // Generate introduction text
      const introductionText = await generateIntroductionText(
        jobDescription,
        resumeFile ?? null
      );

      // Speak the introduction
      try {
        await speakText(introductionText);
      } catch (error) {
        console.error("TTS error:", error);
        // Continue even if TTS fails
      }

      // Start interview after introduction
      startInterview();
    } catch (error) {
      console.error("Error starting interview:", error);
      alert(error instanceof Error ? error.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
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
      <Button onClick={handleStartInterview} disabled={loading}>
        {loading ? "Starting..." : "Start Interview"}
      </Button>
      <div className="text-sm text-muted-foreground">
        Start the interview to begin recording and responding.
      </div>
    </div>
  );
}
