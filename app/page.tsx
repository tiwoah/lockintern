"use client";

import { JobDescriptionInput } from "@/components/job-description-input";
import { ResumeInput } from "@/components/resume-input";
import { InterviewControls } from "@/components/interview-controls";
import { InterviewMeeting } from "@/components/interview-meeting";
import { useInterview } from "@/context/InterviewContext";

export default function Home() {
  const { isInterviewActive } = useInterview();

  return (
    <div>
      <h1>LockIntern</h1>
      {isInterviewActive ? (
        <InterviewMeeting />
      ) : (
        <>
          <JobDescriptionInput />
          <ResumeInput />
          <InterviewControls />
        </>
      )}
    </div>
  );
}
