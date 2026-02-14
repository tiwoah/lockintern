import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { JobDescriptionInput } from "@/components/job-description-input";
import { ResumeInput } from "@/components/resume-input";
import { InterviewControls } from "@/components/interview-controls";
import MicRecorder from "@/components/mic-recorder";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <JobDescriptionInput />
      <ResumeInput />
      <InterviewControls />
      <MicRecorder />
      <AutoAudioToGemini />
    </div>
  );
}
