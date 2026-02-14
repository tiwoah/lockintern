import AudioToGemini from "@/components/AudioToGemini";
import MicRecorder from "@/components/mic-recorder";
import TextToSpeech from "@/components/TextToSpeech";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <TextToSpeech />
      <MicRecorder />
      <AudioToGemini />
    </div>
  );
}
