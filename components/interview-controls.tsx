"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInterview } from "@/context/InterviewContext";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";

export function InterviewControls() {
  const { isInterviewActive, startInterview, exitInterview } = useInterview();
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const [loading, setLoading] = useState(false);

  async function handleStartInterview() {
    setLoading(true);

    try {
      // Create prompt for introduction
      let prompt = `You are conducting a job interview. Please introduce yourself to the candidate and welcome them to the interview. Be friendly and professional. Briefly mention that you'll be asking questions about their background and experience.\n\nHere is the job description:\n${
        (jobDescription ?? "").trim() || "(none)"
      }`;

      if (resumeFile) {
        prompt += `\n\nA resume PDF has been provided. Please use it to personalize your introduction and mention something specific from their background.`;
      }

      // Send request with job description and resume (no audio)
      const form = new FormData();
      form.append("prompt", prompt);
      if (resumeFile) {
        form.append("resume", resumeFile);
      }

      const res = await fetch("/api/generate-text", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error ?? "Failed to start interview");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const introductionText = data?.text ?? "";

      // Use TTS to speak the introduction
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: introductionText }),
      });

      if (ttsRes.ok) {
        const buffer = await ttsRes.arrayBuffer();
        const blob = new Blob([buffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        await audio.play();

        // Start interview after audio starts playing
        startInterview();
      } else {
        // Start interview even if TTS fails
        startInterview();
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start interview");
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
