import AutoAudioToGemini from "@/components/AutoAudioToGemini";
import MicRecorder from "@/components/mic-recorder";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <MicRecorder />
      {/* <AudioToGemini /> */}
      <AutoAudioToGemini />
    </div>
  );
}
