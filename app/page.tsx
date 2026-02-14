"use client";

import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { JobDescriptionInput } from "@/components/job-description-input";
import { ResumeInput } from "@/components/resume-input";
import { InterviewControls } from "@/components/interview-controls";
import { InterviewMeeting } from "@/components/interview-meeting";
import MicRecorder from "@/components/mic-recorder";
import { useInterview } from "@/context/InterviewContext";

export default function Home() {
  const { isInterviewActive } = useInterview();

  // Show fullscreen meeting when interview is active
  if (isInterviewActive) {
    return <InterviewMeeting />;
  }

  // Show regular setup page when interview is not active
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">LockIntern</h1>
      <JobDescriptionInput />
      <ResumeInput />
      <InterviewControls />
    </div>
  );
}
