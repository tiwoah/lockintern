"use client";

import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { InterviewToolbar } from "@/components/interview-toolbar";

export function InterviewMeeting() {
  return (
    <div className="min-h-screen pb-24">
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-6">Interview in Progress</h2>
        <AutoAudioToGemini />
      </div>
      <InterviewToolbar />
    </div>
  );
}
