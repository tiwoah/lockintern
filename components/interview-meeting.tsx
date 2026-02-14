"use client";

import { Button } from "@/components/ui/button";
import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import MicRecorder from "@/components/mic-recorder";
import { useInterview } from "@/context/InterviewContext";

export function InterviewMeeting() {
  const { exitInterview } = useInterview();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Interview in Progress</h2>
        <Button onClick={exitInterview} variant="destructive">
          Exit Interview
        </Button>
      </div>
      <MicRecorder />
      <AutoAudioToGemini />
    </div>
  );
}
