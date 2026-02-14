import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import { JobDescriptionInput } from "@/components/job-description-input";
import MicRecorder from "@/components/mic-recorder";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <JobDescriptionInput />
      <MicRecorder />
      <AutoAudioToGemini />
    </div>
  );
}
