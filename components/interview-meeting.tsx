"use client";

import { useState } from "react";
import { useInterview } from "@/context/InterviewContext";
import { useJobDescription } from "@/context/JobDescriptionContext";
import { useResume } from "@/context/ResumeContext";
import MicRecorder from "@/components/mic-recorder";
import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { Button } from "@/components/ui/button";

export function InterviewMeeting() {
  const { exitInterview, hasIntroductionPlayed, hasConfirmed, confirmReady } = useInterview();
  const { jobDescription } = useJobDescription();
  const { resumeFile } = useResume();
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  async function handleConfirmReady() {
    setLoadingQuestion(true);
    confirmReady();

    try {
      // Generate first question
      let prompt = `You are conducting a job interview. The candidate has confirmed they are ready. Ask them the first interview question. Make it relevant to the job description and their resume if available. Keep it concise and professional.\n\nHere is the job description:\n${
        (jobDescription ?? "").trim() || "(none)"
      }`;

      if (resumeFile) {
        prompt += `\n\nA resume PDF has been provided. Please use it to ask a relevant first question.`;
      }

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
        alert(data?.error ?? "Failed to generate question");
        setLoadingQuestion(false);
        return;
      }

      const data = await res.json();
      const questionText = data?.text ?? "";

      // Use TTS to speak the question
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: questionText }),
      });

      if (ttsRes.ok) {
        const buffer = await ttsRes.arrayBuffer();
        const blob = new Blob([buffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        await audio.play();
      }
    } catch (error) {
      console.error("Error generating question:", error);
      alert("Failed to generate question");
    } finally {
      setLoadingQuestion(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          {!hasIntroductionPlayed ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <h2 className="text-3xl font-semibold">Welcome to the Interview</h2>
              <p className="text-muted-foreground text-lg">
                Please listen to the introduction...
              </p>
            </>
          ) : !hasConfirmed ? (
            <>
              <h2 className="text-3xl font-semibold">Ready to Begin?</h2>
              <p className="text-muted-foreground text-lg mb-6">
                Click "Yes" when you're ready for the first question
              </p>
              <Button
                onClick={handleConfirmReady}
                disabled={loadingQuestion}
                size="lg"
                className="text-lg px-8 py-6"
              >
                {loadingQuestion ? "Preparing question..." : "Yes"}
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <h2 className="text-3xl font-semibold">Interview in Progress</h2>
              <p className="text-muted-foreground text-lg">
                Listen carefully and respond when asked
              </p>
            </>
          )}
        </div>
      </div>

      {/* Controls at the bottom */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {hasConfirmed && (
            <>
              <div className="flex items-center justify-center">
                <MicRecorder />
              </div>
              
              <div className="flex items-center justify-center min-h-[60px]">
                <AutoAudioToGemini />
              </div>
            </>
          )}

          <div className="flex items-center justify-center pt-4 border-t">
            <Button onClick={exitInterview} variant="destructive" size="lg">
              Exit Interview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
